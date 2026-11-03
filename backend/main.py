import os
import sys
from pathlib import Path

# Ensure project root is in sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Union, Any, Dict
import secrets

import jwt
from fastapi import FastAPI, Depends, HTTPException, Request, Response, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text, func, or_, desc, asc
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import engine, SessionLocal, Base, get_db
from backend.models import (
    User,
    Product,
    CartItem,
    WishlistItem,
    Order,
    OrderItem,
    OrderTrackingEvent,
    PasswordResetToken,
    TRACKING_TIMELINE,
)
from backend.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    generate_reset_token,
    hash_reset_token,
)
from backend.auth import get_current_user, get_token_from_request

SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


# --------------------------------------------------
# REQUEST SCHEMAS
# --------------------------------------------------

class RegisterRequest(BaseModel):
    name: Optional[str] = None
    full_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: Optional[str] = None
    terms_accepted: Optional[bool] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)
    remember_me: Optional[bool] = False


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=25)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: Optional[str] = None


class CartRequest(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)


class QuantityRequest(BaseModel):
    quantity: int = Field(ge=0)


class ShippingAddressModel(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None


class CheckoutRequest(BaseModel):
    shipping: Optional[Union[ShippingAddressModel, Dict[str, Any], str]] = None
    shipping_address: Optional[str] = None
    payment_method: str = Field(default="cod")
    idempotency_key: Optional[str] = None
    notes: Optional[str] = None


class OrderStatusRequest(BaseModel):
    status: Optional[str] = None
    order_status: Optional[str] = None
    payment_status: Optional[str] = None
    description: Optional[str] = Field(None, max_length=500)
    courier_name: Optional[str] = Field(None, max_length=100)
    tracking_number: Optional[str] = Field(None, max_length=100)
    estimated_delivery: Optional[str] = None  # ISO datetime string


class ProductCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    category: str = Field(..., min_length=2, max_length=100)
    price: float = Field(..., gt=0)
    original_price: Optional[float] = None
    discount_pct: Optional[int] = None
    stock: int = Field(default=50, ge=0)
    image_url: Optional[str] = None
    rating: Optional[str] = "4.5"
    reviews_count: Optional[str] = "10"
    is_active: bool = True


class ProductUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(None, min_length=2, max_length=100)
    price: Optional[float] = Field(None, gt=0)
    original_price: Optional[float] = None
    discount_pct: Optional[int] = None
    stock: Optional[int] = Field(None, ge=0)
    image_url: Optional[str] = None
    rating: Optional[str] = None
    reviews_count: Optional[str] = None
    is_active: Optional[bool] = None


class ProductStatusToggleRequest(BaseModel):
    is_active: bool


class ProductStockUpdateRequest(BaseModel):
    stock: int = Field(..., ge=0)


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def get_admin(current_user: User = Depends(get_current_user)):
    if not (current_user.role == "admin" or getattr(current_user, "is_admin", False)):
        raise HTTPException(status_code=403, detail="Administrator access required.")
    return current_user


def product_dict(product: Product):
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "price": float(product.price),
        "original_price": float(product.original_price) if product.original_price is not None else None,
        "discount_pct": product.discount_pct,
        "image_url": product.image_url,
        "category": product.category,
        "stock": product.stock,
        "rating": product.rating,
        "reviews_count": product.reviews_count,
        "is_active": product.is_active,
    }


def cart_dict(item: CartItem):
    return {
        "id": item.id,
        "product_id": item.product_id,
        "quantity": item.quantity,
        "product": product_dict(item.product),
        "subtotal": round(float(item.product.price) * item.quantity, 2),
    }


def get_user_cart_payload(user_id: int, db: Session):
    items = db.query(CartItem).filter(CartItem.user_id == user_id).all()
    item_dicts = [cart_dict(item) for item in items]
    total_items = sum(item.quantity for item in items)
    total_price = round(sum(float(item.product.price) * item.quantity for item in items), 2)
    return {
        "items": item_dicts,
        "total_items": total_items,
        "total": total_price,
        "total_price": total_price,
    }


def wishlist_dict(item: WishlistItem):
    return {
        "id": item.id,
        "product_id": item.product_id,
        "product": product_dict(item.product),
    }


def tracking_event_dict(event: OrderTrackingEvent):
    return {
        "id": event.id,
        "status": event.status,
        "description": event.description,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


def order_dict(order: Order, include_tracking: bool = False):
    result = {
        "id": order.id,
        "order_number": order.order_number,
        "total_amount": float(order.total_amount),
        "subtotal": float(getattr(order, "subtotal", order.total_amount)),
        "shipping_charge": float(getattr(order, "shipping_charge", 0)),
        "shipping_name": getattr(order, "shipping_name", ""),
        "shipping_phone": getattr(order, "shipping_phone", ""),
        "shipping_email": getattr(order, "shipping_email", ""),
        "shipping_address": getattr(order, "shipping_address", ""),
        "shipping_city": getattr(order, "shipping_city", ""),
        "shipping_state": getattr(order, "shipping_state", ""),
        "shipping_postal": getattr(order, "shipping_postal", ""),
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "status": order.order_status,
        "order_status": order.order_status,
        "notes": getattr(order, "notes", None),
        "estimated_delivery": order.estimated_delivery.isoformat() if getattr(order, "estimated_delivery", None) else None,
        "courier_name": getattr(order, "courier_name", None),
        "tracking_number": getattr(order, "tracking_number", None),
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product_name,
                "price": float(getattr(item, "unit_price", getattr(item, "price", 0))),
                "unit_price": float(getattr(item, "unit_price", getattr(item, "price", 0))),
                "quantity": item.quantity,
                "subtotal": float(getattr(item, "subtotal", 0)),
                # Include product image if the product still exists
                "image_url": item.product.image_url if item.product else None,
            }
            for item in order.items
        ],
    }
    if include_tracking:
        events = getattr(order, "tracking_events", None) or []
        result["tracking_events"] = [tracking_event_dict(e) for e in events]
    return result


# --------------------------------------------------
# APPLICATION LIFECYCLE & CORS
# --------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Ensure tracking columns exist on orders table
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery TIMESTAMP WITH TIME ZONE;"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);"))
    except Exception as e:
        print("[LIFESPAN] Migration check error:", e)

    # Check if database has products; if 0, seed safely
    db = SessionLocal()
    try:
        count = db.query(Product).count()
        if count == 0:
            from backend.seed_products import seed_database
            seed_database()
    except Exception as e:
        print("[LIFESPAN] Database seed check error:", e)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for the Glow & Glam online store",
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
    return {
        "status": "ok",
        "message": "Glow & Glam API is running",
        "database": db_status
    }


# --------------------------------------------------
# AUTHENTICATION ENDPOINTS
# --------------------------------------------------

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    full_name = (data.full_name or data.name or "").strip()
    if not full_name or len(full_name) < 2:
        raise HTTPException(status_code=422, detail="Full name must be at least 2 characters long.")

    if data.confirm_password and data.password != data.confirm_password:
        raise HTTPException(status_code=422, detail="Passwords do not match.")

    if data.terms_accepted is False:
        raise HTTPException(status_code=422, detail="You must accept the terms and conditions.")

    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    hashed = hash_password(data.password)
    user = User(
        full_name=full_name,
        email=email,
        phone=data.phone.strip() if data.phone else None,
        hashed_password=hashed,
        role="customer",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token({"sub": str(user.id), "email": user.email}, expires_delta=expires_delta)

    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=int(expires_delta.total_seconds()),
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "is_admin": user.role == "admin" or getattr(user, "is_admin", False),
            "is_active": user.is_active,
        },
        "message": "User registered successfully",
    }


@app.post("/api/auth/login")
def login(data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    expires_delta = (
        timedelta(days=settings.REMEMBER_ME_EXPIRE_DAYS)
        if data.remember_me
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    token = create_access_token({"sub": str(user.id), "email": user.email}, expires_delta=expires_delta)

    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=int(expires_delta.total_seconds()),
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "is_admin": user.role == "admin" or getattr(user, "is_admin", False),
            "is_active": user.is_active,
        },
        "message": "Login successful",
    }


@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        domain=settings.COOKIE_DOMAIN,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.COOKIE_SECURE,
    )
    return {"message": "Logged out successfully. Remove the access token from the frontend."}


@app.get("/api/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "is_admin": current_user.role == "admin" or getattr(current_user, "is_admin", False),
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }


@app.put("/api/auth/me")
def update_me(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_name = data.full_name or data.name
    if new_name is not None:
        current_user.full_name = new_name.strip()
    if data.phone is not None:
        current_user.phone = data.phone.strip() if data.phone else None
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "is_admin": current_user.role == "admin" or getattr(current_user, "is_admin", False),
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }


@app.post("/api/auth/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if user and user.is_active:
        raw_token = generate_reset_token()
        token_h = hash_reset_token(raw_token)
        expires = datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
        prt = PasswordResetToken(user_id=user.id, token_hash=token_h, expires_at=expires, used=False)
        db.add(prt)
        db.commit()
    return {"message": "If an account with that email address exists, a password reset link has been sent."}


@app.post("/api/auth/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    if data.confirm_password and data.new_password != data.confirm_password:
        raise HTTPException(status_code=422, detail="Passwords do not match.")

    token_h = hash_reset_token(data.token)
    prt = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_h).first()
    now = datetime.now(timezone.utc)
    if not prt or prt.used or (prt.expires_at and prt.expires_at < now):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    user = db.query(User).filter(User.id == prt.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found.")

    user.hashed_password = hash_password(data.new_password)
    prt.used = True
    db.commit()
    return {"message": "Password reset successfully. You can now log in with your new password."}


# --------------------------------------------------
# PRODUCTS (PUBLIC)
# --------------------------------------------------

@app.get("/api/products/featured")
def get_featured_products(limit: int = 8, db: Session = Depends(get_db)):
    """Return top featured products for homepage hero/trending highlights."""
    try:
        products = (
            db.query(Product)
            .filter(Product.is_active.is_(True))
            .order_by(desc(Product.rating), desc(Product.id))
            .limit(min(limit, 20))
            .all()
        )
        items = [product_dict(p) for p in products]
        return {"items": items, "total": len(items)}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to load featured products.")


@app.get("/api/products")
def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    q: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = None,
    sort_by: Optional[str] = None,
    page: Optional[int] = None,
    page_size: Optional[int] = None,
    skip: Optional[int] = None,
    limit: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    Public paginated product catalogue endpoint.
    Supports search, category filtering, price range, and sorting.
    """
    try:
        query = db.query(Product).filter(Product.is_active.is_(True))

        # Category filter
        if category and category.strip() and category.strip().lower() != "all":
            query = query.filter(Product.category.ilike(category.strip()))

        # Search filter (supports search or q)
        term = (search or q or "").strip()
        if term:
            query = query.filter(
                or_(
                    Product.name.ilike(f"%{term}%"),
                    Product.description.ilike(f"%{term}%"),
                    Product.category.ilike(f"%{term}%"),
                )
            )

        # Price range filter
        if min_price is not None:
            query = query.filter(Product.price >= min_price)
        if max_price is not None:
            query = query.filter(Product.price <= max_price)

        # Total count after filters
        total = query.count()

        # Sorting
        sort_mode = (sort or sort_by or "").lower().strip()
        if sort_mode == "price_asc":
            query = query.order_by(asc(Product.price), desc(Product.id))
        elif sort_mode == "price_desc":
            query = query.order_by(desc(Product.price), desc(Product.id))
        elif sort_mode in ("name", "name_asc"):
            query = query.order_by(asc(Product.name))
        elif sort_mode == "rating":
            query = query.order_by(desc(Product.rating), desc(Product.id))
        else:
            query = query.order_by(desc(Product.id))

        # Pagination logic
        effective_page_size = max(1, min(page_size or limit or 12, 100))
        if page is not None and page > 0:
            effective_page = page
            offset_val = (effective_page - 1) * effective_page_size
        elif skip is not None:
            offset_val = max(0, skip)
            effective_page = (offset_val // effective_page_size) + 1
        else:
            effective_page = 1
            offset_val = 0

        total_pages = max(1, (total + effective_page_size - 1) // effective_page_size) if total > 0 else 1

        products = query.offset(offset_val).limit(effective_page_size).all()
        items = [product_dict(p) for p in products]

        return {
            "items": items,
            "total": total,
            "page": effective_page,
            "page_size": effective_page_size,
            "total_pages": total_pages,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred while fetching products.")


@app.get("/api/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Retrieve details for a single active product."""
    if product_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid product ID.")

    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active.is_(True),
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    return product_dict(product)


@app.get("/api/categories")
def get_categories(db: Session = Depends(get_db)):
    """Return list of distinct active categories."""
    try:
        categories = (
            db.query(Product.category)
            .filter(Product.is_active.is_(True))
            .distinct()
            .order_by(Product.category.asc())
            .all()
        )
        return [c[0] for c in categories if c[0]]
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to load categories.")


# --------------------------------------------------
# ADMIN PRODUCT MANAGEMENT
# --------------------------------------------------

@app.get("/api/admin/products")
def admin_get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    admin: User = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint to list all products, including inactive ones."""
    query = db.query(Product)
    if category and category.lower() != "all":
        query = query.filter(Product.category.ilike(category.strip()))
    if search:
        query = query.filter(
            or_(
                Product.name.ilike(f"%{search.strip()}%"),
                Product.category.ilike(f"%{search.strip()}%"),
            )
        )
    total = query.count()
    effective_page_size = max(1, min(page_size, 100))
    offset = max(0, (page - 1) * effective_page_size)
    products = query.order_by(desc(Product.id)).offset(offset).limit(effective_page_size).all()

    return {
        "items": [product_dict(p) for p in products],
        "total": total,
        "page": page,
        "page_size": effective_page_size,
    }


@app.post("/api/admin/products", status_code=status.HTTP_201_CREATED)
def admin_create_product(
    data: ProductCreateRequest,
    admin: User = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint to create a new product."""
    try:
        discount = data.discount_pct
        if discount is None and data.original_price and data.original_price > data.price:
            discount = round((1 - (data.price / data.original_price)) * 100)

        product = Product(
            name=data.name.strip(),
            description=data.description.strip() if data.description else None,
            category=data.category.strip(),
            price=data.price,
            original_price=data.original_price,
            discount_pct=discount,
            stock=data.stock,
            image_url=data.image_url.strip() if data.image_url else None,
            rating=data.rating or "4.5",
            reviews_count=data.reviews_count or "10",
            is_active=data.is_active,
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        return product_dict(product)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create product.")


@app.put("/api/admin/products/{product_id}")
def admin_update_product(
    product_id: int,
    data: ProductUpdateRequest,
    admin: User = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint to update product details, inventory, price, and active status."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    try:
        if data.name is not None:
            product.name = data.name.strip()
        if data.description is not None:
            product.description = data.description.strip() if data.description else None
        if data.category is not None:
            product.category = data.category.strip()
        if data.price is not None:
            product.price = data.price
        if data.original_price is not None:
            product.original_price = data.original_price
        if data.discount_pct is not None:
            product.discount_pct = data.discount_pct
        elif product.original_price and float(product.original_price) > float(product.price):
            product.discount_pct = round((1 - (float(product.price) / float(product.original_price))) * 100)
        if data.stock is not None:
            product.stock = data.stock
        if data.image_url is not None:
            product.image_url = data.image_url.strip() if data.image_url else None
        if data.rating is not None:
            product.rating = data.rating
        if data.reviews_count is not None:
            product.reviews_count = data.reviews_count
        if data.is_active is not None:
            product.is_active = data.is_active

        db.commit()
        db.refresh(product)
        return product_dict(product)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update product.")


@app.delete("/api/admin/products/{product_id}")
def admin_delete_product(
    product_id: int,
    admin: User = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Deactivate or soft-delete a product to preserve order history."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    product.is_active = False
    db.commit()
    return {"message": "Product deactivated successfully.", "id": product_id}


@app.patch("/api/admin/products/{product_id}/status")
def admin_toggle_product_status(
    product_id: int,
    data: ProductStatusToggleRequest,
    admin: User = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Toggle product active/inactive state."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    product.is_active = data.is_active
    db.commit()
    db.refresh(product)
    return product_dict(product)


@app.patch("/api/admin/products/{product_id}/stock")
def admin_update_product_stock(
    product_id: int,
    data: ProductStockUpdateRequest,
    admin: User = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint to update product stock inventory."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    product.stock = data.stock
    db.commit()
    db.refresh(product)
    return product_dict(product)


# --------------------------------------------------
# CART (AUTHENTICATED)
# --------------------------------------------------

@app.get("/api/cart")
def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_user_cart_payload(current_user.id, db)


@app.post("/api/cart", status_code=status.HTTP_201_CREATED)
def add_to_cart(
    data: CartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == data.product_id,
        Product.is_active.is_(True),
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    if data.quantity > product.stock:
        raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {product.stock}.")

    item = db.query(CartItem).filter(
        CartItem.user_id == current_user.id,
        CartItem.product_id == data.product_id,
    ).first()

    if item:
        if item.quantity + data.quantity > product.stock:
            raise HTTPException(status_code=400, detail=f"Insufficient stock. You already have {item.quantity} in cart.")
        item.quantity += data.quantity
    else:
        item = CartItem(
            user_id=current_user.id,
            product_id=data.product_id,
            quantity=data.quantity,
        )
        db.add(item)

    db.commit()
    return get_user_cart_payload(current_user.id, db)


@app.put("/api/cart/{item_id}")
def update_cart_item(
    item_id: int,
    data: QuantityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found.")

    if data.quantity <= 0:
        db.delete(item)
        db.commit()
        return get_user_cart_payload(current_user.id, db)

    if data.quantity > item.product.stock:
        raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {item.product.stock}.")

    item.quantity = data.quantity
    db.commit()
    return get_user_cart_payload(current_user.id, db)


@app.delete("/api/cart/{item_id}")
def remove_cart_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(CartItem).filter(
        CartItem.id == item_id,
        CartItem.user_id == current_user.id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found.")

    db.delete(item)
    db.commit()
    payload = get_user_cart_payload(current_user.id, db)
    payload["message"] = "Cart item removed."
    return payload


@app.delete("/api/cart")
def clear_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(CartItem).filter(CartItem.user_id == current_user.id).delete(synchronize_session=False)
    db.commit()
    return {"message": "Cart cleared.", "items": [], "total_items": 0, "total": 0.0, "total_price": 0.0}


# --------------------------------------------------
# WISHLIST (AUTHENTICATED)
# --------------------------------------------------

@app.get("/api/wishlist")
def get_wishlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(WishlistItem).filter(WishlistItem.user_id == current_user.id).all()
    item_dicts = [wishlist_dict(item) for item in items]
    return {
        "items": item_dicts,
        "total_items": len(item_dicts),
    }


@app.post("/api/wishlist", status_code=status.HTTP_201_CREATED)
def add_to_wishlist(
    data: CartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == data.product_id,
        Product.is_active.is_(True),
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    existing = db.query(WishlistItem).filter(
        WishlistItem.user_id == current_user.id,
        WishlistItem.product_id == data.product_id,
    ).first()

    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product is already in your wishlist.")

    item = WishlistItem(
        user_id=current_user.id,
        product_id=data.product_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    items = db.query(WishlistItem).filter(WishlistItem.user_id == current_user.id).all()
    return {
        "id": item.id,
        "product_id": item.product_id,
        "product": product_dict(product),
        "items": [wishlist_dict(i) for i in items],
        "total_items": len(items),
    }


@app.delete("/api/wishlist/{item_id}")
def remove_from_wishlist(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(WishlistItem).filter(
        WishlistItem.id == item_id,
        WishlistItem.user_id == current_user.id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Wishlist item not found.")

    db.delete(item)
    db.commit()

    items = db.query(WishlistItem).filter(WishlistItem.user_id == current_user.id).all()
    return {
        "message": "Removed from wishlist.",
        "items": [wishlist_dict(i) for i in items],
        "total_items": len(items),
    }


@app.post("/api/wishlist/{item_id}/move-to-cart")
def move_wishlist_to_cart(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wish = db.query(WishlistItem).filter(
        WishlistItem.id == item_id,
        WishlistItem.user_id == current_user.id,
    ).first()

    if not wish:
        raise HTTPException(status_code=404, detail="Wishlist item not found.")

    product = db.query(Product).filter(Product.id == wish.product_id).first()
    if not product or product.stock < 1:
        raise HTTPException(status_code=400, detail="Product is unavailable.")

    cart_item = db.query(CartItem).filter(
        CartItem.user_id == current_user.id,
        CartItem.product_id == product.id,
    ).first()

    if cart_item:
        if cart_item.quantity + 1 > product.stock:
            raise HTTPException(status_code=400, detail="Insufficient stock.")
        cart_item.quantity += 1
    else:
        db.add(
            CartItem(
                user_id=current_user.id,
                product_id=product.id,
                quantity=1,
            )
        )

    db.delete(wish)
    db.commit()

    cart_payload = get_user_cart_payload(current_user.id, db)
    cart_payload["message"] = "Product moved to cart."
    return cart_payload


# --------------------------------------------------
# CHECKOUT & ORDERS (AUTHENTICATED)
# --------------------------------------------------

@app.post("/api/checkout", status_code=status.HTTP_201_CREATED)
def checkout(
    data: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Check idempotency
    if data.idempotency_key:
        existing_order = db.query(Order).filter(Order.idempotency_key == data.idempotency_key).first()
        if existing_order:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate checkout submission.")

    cart_items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Your cart is empty.")

    # Parse shipping information
    shipping_name = current_user.full_name
    shipping_phone = current_user.phone or "9876543210"
    shipping_email = current_user.email
    shipping_address = data.shipping_address or ""
    shipping_city = "Chennai"
    shipping_state = "Tamil Nadu"
    shipping_postal = "600001"

    if data.payment_method not in ("cod", "online", "card", "upi"):
        raise HTTPException(status_code=400, detail="Invalid payment method.")

    if isinstance(data.shipping, dict):
        if "city" in data.shipping and not str(data.shipping.get("city") or "").strip():
            raise HTTPException(status_code=422, detail="City is required in shipping address.")
        if "postal_code" in data.shipping and len(str(data.shipping.get("postal_code") or "").strip()) < 3:
            raise HTTPException(status_code=422, detail="Invalid postal code.")
        shipping_name = data.shipping.get("name") or shipping_name
        shipping_phone = data.shipping.get("phone") or shipping_phone
        shipping_email = data.shipping.get("email") or shipping_email
        shipping_address = data.shipping.get("address") or shipping_address
        shipping_city = data.shipping.get("city") or shipping_city
        shipping_state = data.shipping.get("state") or shipping_state
        shipping_postal = data.shipping.get("postal_code") or shipping_postal
    elif isinstance(data.shipping, ShippingAddressModel):
        if data.shipping.city is not None and not str(data.shipping.city).strip():
            raise HTTPException(status_code=422, detail="City is required in shipping address.")
        if data.shipping.postal_code is not None and len(str(data.shipping.postal_code).strip()) < 3:
            raise HTTPException(status_code=422, detail="Invalid postal code.")
        shipping_name = data.shipping.name or shipping_name
        shipping_phone = data.shipping.phone or shipping_phone
        shipping_email = data.shipping.email or shipping_email
        shipping_address = data.shipping.address or shipping_address
        shipping_city = data.shipping.city or shipping_city
        shipping_state = data.shipping.state or shipping_state
        shipping_postal = data.shipping.postal_code or shipping_postal
    elif isinstance(data.shipping, str) and data.shipping.strip():
        shipping_address = data.shipping.strip()

    if not shipping_address or len(shipping_address.strip()) < 5:
        shipping_address = "Standard Delivery Address, Anna Nagar, Chennai"

    try:
        # Validate stock and calculate subtotal atomically
        total_subtotal = 0.0
        order_line_items = []

        for item in cart_items:
            product = db.query(Product).filter(
                Product.id == item.product_id,
                Product.is_active.is_(True),
            ).with_for_update().first()

            if not product:
                raise HTTPException(status_code=400, detail=f"Product {item.product_id} is no longer available.")
            if product.stock < item.quantity:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}. Available: {product.stock}.")

            unit_price = float(product.price)
            line_total = round(unit_price * item.quantity, 2)
            total_subtotal += line_total

            # Deduct stock
            product.stock -= item.quantity

            order_line_items.append({
                "product_id": product.id,
                "product_name": product.name,
                "unit_price": unit_price,
                "quantity": item.quantity,
                "subtotal": line_total,
            })

        order_number = f"GG-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"
        total_subtotal = round(total_subtotal, 2)
        shipping_charge = 0.0
        total_amount = round(total_subtotal + shipping_charge, 2)

        order = Order(
            order_number=order_number,
            user_id=current_user.id,
            shipping_name=shipping_name,
            shipping_phone=shipping_phone,
            shipping_email=shipping_email,
            shipping_address=shipping_address,
            shipping_city=shipping_city,
            shipping_state=shipping_state,
            shipping_postal=shipping_postal,
            subtotal=total_subtotal,
            shipping_charge=shipping_charge,
            total_amount=total_amount,
            order_status="placed",
            payment_method=data.payment_method or "cod",
            payment_status="pending" if (data.payment_method or "cod") == "cod" else "paid",
            idempotency_key=data.idempotency_key,
            stock_deducted=True,
            stock_restored=False,
            notes=data.notes,
        )
        db.add(order)
        db.flush()

        for line in order_line_items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=line["product_id"],
                product_name=line["product_name"],
                unit_price=line["unit_price"],
                quantity=line["quantity"],
                subtotal=line["subtotal"],
            )
            db.add(order_item)

        # Record initial tracking event
        db.add(OrderTrackingEvent(
            order_id=order.id,
            status="placed",
            description="Order placed successfully.",
        ))

        # Clear cart
        db.query(CartItem).filter(CartItem.user_id == current_user.id).delete(synchronize_session=False)

        db.commit()
        db.refresh(order)
        return {
            "message": "Order placed successfully.",
            "order": order_dict(order),
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to complete checkout.")


@app.get("/api/orders")
def get_orders(
    current_user: User = Depends(get_current_user),
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=50),
    db: Session = Depends(get_db),
):
    base_q = (
        db.query(Order)
        .filter(Order.user_id == current_user.id)
        .order_by(desc(Order.created_at))
    )
    total = base_q.count()

    # If pagination params supplied, paginate; otherwise return all
    if page is not None or page_size is not None:
        eff_page = max(1, page or 1)
        eff_size = max(1, min(page_size or 5, 50))
        offset = (eff_page - 1) * eff_size
        orders = base_q.offset(offset).limit(eff_size).all()
        total_pages = max(1, (total + eff_size - 1) // eff_size)
        return {
            "items": [order_dict(o, include_tracking=True) for o in orders],
            "total": total,
            "page": eff_page,
            "page_size": eff_size,
            "total_pages": total_pages,
        }

    # No pagination: return everything
    orders = base_q.all()
    return {
        "items": [order_dict(o, include_tracking=True) for o in orders],
        "total": total,
    }


@app.get("/api/orders/{order_number}")
def get_order(
    order_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.order_number == order_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.user_id != current_user.id and not (current_user.role == "admin" or getattr(current_user, "is_admin", False)):
        raise HTTPException(status_code=403, detail="You do not have permission to view this order.")

    return order_dict(order, include_tracking=True)


@app.get("/api/orders/{order_number}/track")
def track_order(
    order_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.order_number == order_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.user_id != current_user.id and not (current_user.role == "admin" or getattr(current_user, "is_admin", False)):
        raise HTTPException(status_code=403, detail="You do not have permission to track this order.")

    # Backfill initial event if missing
    if not order.tracking_events:
        initial_event = OrderTrackingEvent(
            order_id=order.id,
            status=order.order_status or "placed",
            description="Order placed successfully.",
            created_at=order.created_at,
        )
        db.add(initial_event)
        db.commit()
        db.refresh(order)

    return {
        "order_number": order.order_number,
        "current_status": order.order_status,
        "timeline": list(TRACKING_TIMELINE),
        "estimated_delivery": order.estimated_delivery.isoformat() if order.estimated_delivery else None,
        "courier_name": order.courier_name,
        "tracking_number": order.tracking_number,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        "shipping": {
            "name": order.shipping_name,
            "phone": order.shipping_phone,
            "email": order.shipping_email,
            "address": order.shipping_address,
            "city": order.shipping_city,
            "state": order.shipping_state,
            "postal": order.shipping_postal,
        },
        "total_amount": float(order.total_amount),
        "items": [
            {
                "id": item.id,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "unit_price": float(getattr(item, "unit_price", 0)),
                "subtotal": float(getattr(item, "subtotal", 0)),
                "image_url": item.product.image_url if item.product else None,
            }
            for item in order.items
        ],
        "tracking_events": [tracking_event_dict(e) for e in order.tracking_events],
    }


@app.post("/api/orders/{order_number}/cancel")
def cancel_order(
    order_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.order_number == order_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.user_id != current_user.id and not (current_user.role == "admin" or getattr(current_user, "is_admin", False)):
        raise HTTPException(status_code=403, detail="You do not have permission to cancel this order.")

    if order.order_status == "cancelled":
        raise HTTPException(status_code=400, detail="Order is already cancelled.")

    if order.order_status not in ("placed", "pending", "confirmed"):
        raise HTTPException(status_code=400, detail="Only newly placed orders can be cancelled.")

    try:
        # Restore product stock atomically once
        if getattr(order, "stock_deducted", True) and not getattr(order, "stock_restored", False):
            for item in order.items:
                product = db.query(Product).filter(Product.id == item.product_id).with_for_update().first()
                if product:
                    product.stock += item.quantity
            order.stock_restored = True

        order.order_status = "cancelled"
        db.add(OrderTrackingEvent(
            order_id=order.id,
            status="cancelled",
            description="Order was cancelled by the customer.",
        ))
        db.commit()
        db.refresh(order)
        return order_dict(order, include_tracking=True)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to cancel order.")


# --------------------------------------------------
# ADMIN ORDER MANAGEMENT
# --------------------------------------------------

@app.get("/api/admin/orders")
def admin_get_orders(
    admin: User = Depends(get_admin),
    db: Session = Depends(get_db),
):
    orders = db.query(Order).order_by(desc(Order.created_at)).all()
    return [
        {
            **order_dict(order, include_tracking=True),
            "customer": {
                "id": order.user.id if order.user else None,
                "name": order.user.name if order.user else "Unknown",
                "email": order.user.email if order.user else "",
            },
        }
        for order in orders
    ]


@app.patch("/api/admin/orders/{order_number}/status")
def admin_update_order_status(
    order_number: str,
    data: OrderStatusRequest,
    admin: User = Depends(get_admin),
    db: Session = Depends(get_db),
):
    new_status = data.status or data.order_status
    # Full timeline statuses + cancelled + pending
    allowed_statuses = {
        "placed", "confirmed", "processing", "packed",
        "shipped", "out_for_delivery", "delivered", "cancelled",
        "pending",
    }

    if not new_status or new_status.lower() not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid order status.")

    order = db.query(Order).filter(Order.order_number == order_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if order.order_status == "cancelled" and new_status.lower() != "cancelled":
        raise HTTPException(status_code=400, detail="Cancelled orders cannot be reopened.")

    normalized_status = new_status.lower()

    # Safely restore product stock if order is cancelled
    if normalized_status == "cancelled" and getattr(order, "stock_deducted", True) and not getattr(order, "stock_restored", False):
        for item in order.items:
            prod = db.query(Product).filter(Product.id == item.product_id).with_for_update().first()
            if prod:
                prod.stock += item.quantity
        order.stock_restored = True

    order.order_status = normalized_status

    if data.payment_status:
        order.payment_status = data.payment_status.lower()

    if data.courier_name is not None:
        order.courier_name = data.courier_name.strip() or None

    if data.tracking_number is not None:
        order.tracking_number = data.tracking_number.strip() or None

    if data.estimated_delivery is not None:
        if data.estimated_delivery.strip():
            try:
                from datetime import datetime
                order.estimated_delivery = datetime.fromisoformat(data.estimated_delivery.replace("Z", "+00:00"))
            except Exception:
                pass
        else:
            order.estimated_delivery = None

    status_labels = {
        "placed": "Order Placed",
        "confirmed": "Order Confirmed",
        "processing": "Order Processing",
        "packed": "Order Packed",
        "shipped": "Order Shipped",
        "out_for_delivery": "Out for Delivery",
        "delivered": "Order Delivered",
        "cancelled": "Order Cancelled",
    }
    label = status_labels.get(normalized_status, normalized_status.replace("_", " ").title())
    desc = data.description or f"Order status changed to {label}."

    # Record tracking event in PostgreSQL
    db.add(OrderTrackingEvent(
        order_id=order.id,
        status=normalized_status,
        description=desc,
    ))

    db.commit()
    db.refresh(order)
    return order_dict(order, include_tracking=True)


# --------------------------------------------------
# ADMIN DASHBOARD OVERVIEW & SALES REPORTS
# --------------------------------------------------

@app.get("/api/admin/dashboard/stats")
def admin_get_dashboard_stats(
    admin: User = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """
    Returns actual overview statistics computed directly from PostgreSQL:
    Total Orders, Total Sales, Customers, Products, Pending Orders, Low-stock alerts,
    status distribution, and recent orders.
    """
    total_orders = db.query(Order).count()
    total_sales = db.query(func.coalesce(func.sum(Order.total_amount), 0.0)).filter(
        Order.order_status != "cancelled"
    ).scalar() or 0.0
    total_customers = db.query(User).filter(User.role != "admin").count()
    total_products = db.query(Product).count()
    pending_orders = db.query(Order).filter(
        Order.order_status.in_(["placed", "pending", "confirmed", "processing", "packed"])
    ).count()

    low_stock_query = db.query(Product).filter(Product.is_active.is_(True), Product.stock <= 10)
    low_stock_count = low_stock_query.count()
    low_stock_products = [product_dict(p) for p in low_stock_query.order_by(asc(Product.stock)).limit(12).all()]

    # Status distribution
    status_counts = {}
    for st, count in db.query(Order.order_status, func.count(Order.id)).group_by(Order.order_status).all():
        status_counts[st] = count

    # Recent orders (latest 10)
    recent_orders = db.query(Order).order_by(desc(Order.created_at)).limit(10).all()
    recent_orders_list = [
        {
            **order_dict(o, include_tracking=True),
            "customer": {
                "id": o.user.id if o.user else None,
                "name": o.user.name if o.user else (o.shipping_name or "Customer"),
                "email": o.user.email if o.user else (o.shipping_email or ""),
            },
        }
        for o in recent_orders
    ]

    return {
        "total_orders": total_orders,
        "total_sales": round(float(total_sales), 2),
        "total_customers": total_customers,
        "total_products": total_products,
        "pending_orders": pending_orders,
        "low_stock_count": low_stock_count,
        "status_counts": status_counts,
        "recent_orders": recent_orders_list,
        "low_stock_products": low_stock_products,
    }


@app.get("/api/admin/reports/sales")
def admin_get_sales_report(
    period: Optional[str] = "30d",  # "today", "7d", "30d", "this_month", "all", "custom"
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin: User = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """
    Computes date-filtered sales reports directly from PostgreSQL records:
    total sales, order volume, AOV, daily timeline, top selling products,
    and category revenue breakdown.
    """
    now = datetime.now(timezone.utc)
    start_dt = None
    end_dt = now

    if start_date and end_date:
        try:
            start_dt = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
            end_dt = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
        except Exception:
            pass

    if not start_dt:
        p = (period or "30d").lower()
        if p == "today":
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif p == "7d":
            start_dt = now - timedelta(days=7)
        elif p == "this_month":
            start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif p == "all":
            start_dt = datetime(2020, 1, 1, tzinfo=timezone.utc)
        else:  # default 30d
            start_dt = now - timedelta(days=30)

    # Filter orders in date window
    query = db.query(Order).filter(
        Order.created_at >= start_dt,
        Order.created_at <= end_dt,
    )

    all_period_orders = query.all()
    non_cancelled = [o for o in all_period_orders if o.order_status != "cancelled"]

    total_orders = len(all_period_orders)
    valid_orders_count = len(non_cancelled)
    total_sales = round(sum(float(o.total_amount) for o in non_cancelled), 2)
    aov = round(total_sales / valid_orders_count, 2) if valid_orders_count > 0 else 0.0

    # Sales by day
    sales_by_day_dict = {}
    for o in non_cancelled:
        if o.created_at:
            day_str = o.created_at.strftime("%Y-%m-%d")
            if day_str not in sales_by_day_dict:
                sales_by_day_dict[day_str] = {"sales": 0.0, "orders": 0}
            sales_by_day_dict[day_str]["sales"] += float(o.total_amount)
            sales_by_day_dict[day_str]["orders"] += 1

    sales_by_day = [
        {"date": day, "sales": round(data["sales"], 2), "orders": data["orders"]}
        for day, data in sorted(sales_by_day_dict.items())
    ]

    # Top selling products in this period
    order_ids = [o.id for o in non_cancelled]
    top_products = []
    if order_ids:
        rows = (
            db.query(
                OrderItem.product_id,
                OrderItem.product_name,
                func.sum(OrderItem.quantity).label("units_sold"),
                func.sum(OrderItem.subtotal).label("revenue"),
            )
            .filter(OrderItem.order_id.in_(order_ids))
            .group_by(OrderItem.product_id, OrderItem.product_name)
            .order_by(desc("units_sold"))
            .limit(10)
            .all()
        )
        for r in rows:
            prod = db.query(Product).filter(Product.id == r.product_id).first()
            top_products.append({
                "product_id": r.product_id,
                "name": r.product_name,
                "category": prod.category if prod else "General",
                "units_sold": int(r.units_sold or 0),
                "revenue": round(float(r.revenue or 0.0), 2),
                "image_url": prod.image_url if prod else None,
            })

    # Sales by Category
    category_sales_dict = {}
    if order_ids:
        item_rows = (
            db.query(OrderItem, Product.category)
            .outerjoin(Product, OrderItem.product_id == Product.id)
            .filter(OrderItem.order_id.in_(order_ids))
            .all()
        )
        for itm, cat in item_rows:
            category_name = cat or "General"
            if category_name not in category_sales_dict:
                category_sales_dict[category_name] = {"sales": 0.0, "count": 0}
            category_sales_dict[category_name]["sales"] += float(itm.subtotal or 0.0)
            category_sales_dict[category_name]["count"] += itm.quantity

    category_breakdown = [
        {"category": k, "sales": round(v["sales"], 2), "count": v["count"]}
        for k, v in sorted(category_sales_dict.items(), key=lambda x: x[1]["sales"], reverse=True)
    ]

    return {
        "period": period,
        "start_date": start_dt.strftime("%Y-%m-%d"),
        "end_date": end_dt.strftime("%Y-%m-%d"),
        "total_sales": total_sales,
        "total_orders": total_orders,
        "valid_orders": valid_orders_count,
        "average_order_value": aov,
        "sales_by_day": sales_by_day,
        "top_products": top_products,
        "category_breakdown": category_breakdown,
    }
