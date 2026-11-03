import re
from decimal import Decimal
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator, ConfigDict


# ─────────────────────────────────────────────────────────────────────────────
# Auth schemas
# ─────────────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=25)
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str
    terms_accepted: bool

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v

    @field_validator("terms_accepted")
    @classmethod
    def validate_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must agree to the Terms and Conditions to create an account")
        return v

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)
    remember_me: Optional[bool] = False


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=25)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        return v

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class AuthResponse(BaseModel):
    message: str
    user: UserResponse
    token: Optional[str] = None


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Product schemas
# ─────────────────────────────────────────────────────────────────────────────

class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    category: str
    price: float
    original_price: Optional[float] = None
    discount_pct: Optional[int] = None
    stock: int
    image_url: Optional[str] = None
    rating: Optional[str] = None
    reviews_count: Optional[str] = None
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

    @field_validator("price", "original_price", mode="before")
    @classmethod
    def coerce_decimal(cls, v):
        return None if v is None else float(v)


class ProductListResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ─────────────────────────────────────────────────────────────────────────────
# Cart schemas
# ─────────────────────────────────────────────────────────────────────────────

class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductResponse
    model_config = ConfigDict(from_attributes=True)


class CartResponse(BaseModel):
    items: List[CartItemResponse]
    total_items: int
    total_price: float


class AddToCartRequest(BaseModel):
    product_id: int = Field(..., gt=0)
    quantity: int = Field(1, ge=1, le=100)


class UpdateCartItemRequest(BaseModel):
    quantity: int = Field(..., ge=0, le=100)


# ─────────────────────────────────────────────────────────────────────────────
# Wishlist schemas
# ─────────────────────────────────────────────────────────────────────────────

class WishlistItemResponse(BaseModel):
    id: int
    product_id: int
    product: ProductResponse
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class WishlistResponse(BaseModel):
    items: List[WishlistItemResponse]
    total_items: int


class AddToWishlistRequest(BaseModel):
    product_id: int = Field(..., gt=0)


# ─────────────────────────────────────────────────────────────────────────────
# Checkout / Order schemas
# ─────────────────────────────────────────────────────────────────────────────

class ShippingAddress(BaseModel):
    """Shipping address collected at checkout (all fields server-validated)."""
    name: str = Field(..., min_length=2, max_length=150, description="Recipient full name")
    phone: str = Field(..., min_length=7, max_length=25, description="Contact phone number")
    email: EmailStr = Field(..., description="Contact email address")
    address: str = Field(..., min_length=5, max_length=500, description="Street address")
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    postal_code: str = Field(..., min_length=3, max_length=20, description="PIN / ZIP code")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) < 7:
            raise ValueError("Phone number must contain at least 7 digits")
        return v

    @field_validator("postal_code")
    @classmethod
    def validate_postal(cls, v: str) -> str:
        if not re.match(r"^[A-Za-z0-9 \-]{3,20}$", v):
            raise ValueError("Invalid postal / PIN code")
        return v


class CheckoutRequest(BaseModel):
    """
    Frontend sends shipping details + payment method + optional idempotency key.
    The backend computes ALL prices from the database.
    """
    shipping: ShippingAddress
    payment_method: str = Field("cod", description="'cod' or 'online'")
    idempotency_key: Optional[str] = Field(None, max_length=64,
        description="Unique key to prevent duplicate submissions")
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("payment_method")
    @classmethod
    def validate_payment_method(cls, v: str) -> str:
        allowed = {"cod", "online"}
        if v not in allowed:
            raise ValueError(f"payment_method must be one of {allowed}")
        return v


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    unit_price: float
    quantity: int
    subtotal: float
    model_config = ConfigDict(from_attributes=True)

    @field_validator("unit_price", "subtotal", mode="before")
    @classmethod
    def coerce_decimal(cls, v):
        return float(v) if v is not None else 0.0


class OrderResponse(BaseModel):
    id: int
    order_number: str
    order_status: str
    payment_method: str
    payment_status: str
    shipping_name: str
    shipping_phone: str
    shipping_email: str
    shipping_address: str
    shipping_city: str
    shipping_state: str
    shipping_postal: str
    subtotal: float
    shipping_charge: float
    total_amount: float
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    items: List[OrderItemResponse] = []
    model_config = ConfigDict(from_attributes=True)

    @field_validator("subtotal", "shipping_charge", "total_amount", mode="before")
    @classmethod
    def coerce_decimal(cls, v):
        return float(v) if v is not None else 0.0


class OrderListResponse(BaseModel):
    items: List[OrderResponse]
    total: int


class CheckoutResponse(BaseModel):
    message: str
    order: OrderResponse


class OrderStatusUpdate(BaseModel):
    """Admin-only: update order or payment status."""
    order_status: Optional[str] = Field(None, description="pending|confirmed|shipped|delivered|cancelled")
    payment_status: Optional[str] = Field(None, description="pending|paid|failed|refunded")

    @field_validator("order_status")
    @classmethod
    def validate_order_status(cls, v):
        if v is None:
            return v
        allowed = {"pending", "confirmed", "shipped", "delivered", "cancelled"}
        if v not in allowed:
            raise ValueError(f"order_status must be one of {allowed}")
        return v

    @field_validator("payment_status")
    @classmethod
    def validate_payment_status(cls, v):
        if v is None:
            return v
        allowed = {"pending", "paid", "failed", "refunded"}
        if v not in allowed:
            raise ValueError(f"payment_status must be one of {allowed}")
        return v
