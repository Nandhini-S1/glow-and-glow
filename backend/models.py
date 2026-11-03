from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey,
    Numeric, Text, func, UniqueConstraint
)
from sqlalchemy.orm import relationship
from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(25), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="customer", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete-orphan")
    wishlist_items = relationship("WishlistItem", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user")

    @property
    def name(self) -> str:
        return self.full_name

    @name.setter
    def name(self, val: str):
        self.full_name = val

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @is_admin.setter
    def is_admin(self, val: bool):
        self.role = "admin" if val else "customer"

    @property
    def password_hash(self) -> str:
        return self.hashed_password

    @password_hash.setter
    def password_hash(self, val: str):
        self.hashed_password = val

    def __repr__(self):
        return f"<User id={self.id} email='{self.email}' role='{self.role}'>"


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(128), index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="reset_tokens")

    def __repr__(self):
        return f"<PasswordResetToken user_id={self.user_id} used={self.used}>"


class Product(Base):
    """Catalogue product seeded by admin; browsed by customers."""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False)
    original_price = Column(Numeric(10, 2), nullable=True)
    discount_pct = Column(Integer, nullable=True)
    stock = Column(Integer, nullable=False, default=50)
    image_url = Column(String(500), nullable=True)
    rating = Column(String(10), nullable=True)
    reviews_count = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cart_items = relationship("CartItem", back_populates="product")
    wishlist_items = relationship("WishlistItem", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")

    def __repr__(self):
        return f"<Product id={self.id} name='{self.name}' category='{self.category}'>"


class CartItem(Base):
    """Persistent shopping-cart item for authenticated users."""
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="cart_items")
    product = relationship("Product", back_populates="cart_items")

    def __repr__(self):
        return f"<CartItem user_id={self.user_id} product_id={self.product_id} qty={self.quantity}>"


class WishlistItem(Base):
    """Persistent wishlist item for authenticated users."""
    __tablename__ = "wishlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="wishlist_items")
    product = relationship("Product", back_populates="wishlist_items")

    def __repr__(self):
        return f"<WishlistItem user_id={self.user_id} product_id={self.product_id}>"


# ─────────────────────────────────────────────────────────────────────────────
# Orders
# ─────────────────────────────────────────────────────────────────────────────

# Order lifecycle:
# placed → confirmed → processing → packed → shipped → out_for_delivery → delivered
#                              └──────→ cancelled  (from placed/confirmed/processing)

ORDER_STATUSES = (
    "placed", "confirmed", "processing", "packed",
    "shipped", "out_for_delivery", "delivered", "cancelled",
)
TRACKING_TIMELINE = (
    "placed", "confirmed", "processing", "packed",
    "shipped", "out_for_delivery", "delivered",
)
PAYMENT_STATUSES = ("pending", "paid", "failed", "refunded")
PAYMENT_METHODS = ("cod", "online")   # extensible


class Order(Base):
    """
    Parent order record.
    All monetary totals are recalculated server-side at checkout time;
    the frontend total is NEVER trusted.
    """
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(30), unique=True, index=True, nullable=False)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)

    # ── Shipping address ──────────────────────────────────────────────────────
    shipping_name = Column(String(150), nullable=False)
    shipping_phone = Column(String(25), nullable=False)
    shipping_email = Column(String(255), nullable=False)
    shipping_address = Column(Text, nullable=False)
    shipping_city = Column(String(100), nullable=False)
    shipping_state = Column(String(100), nullable=False)
    shipping_postal = Column(String(20), nullable=False)

    # ── Financials (server-computed) ──────────────────────────────────────────
    subtotal = Column(Numeric(12, 2), nullable=False)      # sum of all item totals
    shipping_charge = Column(Numeric(10, 2), nullable=False, default=0)
    total_amount = Column(Numeric(12, 2), nullable=False)  # subtotal + shipping

    # ── Status ────────────────────────────────────────────────────────────────
    order_status = Column(String(20), nullable=False, default="pending")
    # Payment is tracked separately so it can be updated independently
    payment_method = Column(String(20), nullable=False, default="cod")
    payment_status = Column(String(20), nullable=False, default="pending")

    # Idempotency key supplied by the frontend to prevent duplicate submissions
    idempotency_key = Column(String(64), unique=True, index=True, nullable=True)

    # Flags to guard stock-restore from running more than once
    stock_deducted = Column(Boolean, nullable=False, default=False)
    stock_restored = Column(Boolean, nullable=False, default=False)

    notes = Column(Text, nullable=True)

    # ── Tracking / logistics ──────────────────────────────────────────────
    estimated_delivery = Column(DateTime(timezone=True), nullable=True)
    courier_name = Column(String(100), nullable=True)
    tracking_number = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    tracking_events = relationship(
        "OrderTrackingEvent", back_populates="order",
        cascade="all, delete-orphan", order_by="OrderTrackingEvent.created_at",
    )

    @property
    def status(self) -> str:
        return self.order_status

    @status.setter
    def status(self, val: str):
        self.order_status = val

    def __repr__(self):
        return f"<Order #{self.order_number} user={self.user_id} status='{self.order_status}'>"


class OrderItem(Base):
    """
    One product line inside an order.
    Snapshot of name and unit_price at time of purchase so order history
    remains accurate even if the product changes later.
    """
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)

    product_name = Column(String(200), nullable=False)      # snapshot
    unit_price = Column(Numeric(10, 2), nullable=False)     # snapshot
    quantity = Column(Integer, nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)       # unit_price × quantity

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    @property
    def price(self):
        return self.unit_price

    @price.setter
    def price(self, val):
        self.unit_price = val

    def __repr__(self):
        return f"<OrderItem order={self.order_id} product='{self.product_name}' qty={self.quantity}>"


class OrderTrackingEvent(Base):
    """
    Records every status transition for an order, forming the
    tracking timeline visible to both customers and admins.
    """
    __tablename__ = "order_tracking_events"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(30), nullable=False)           # e.g. "shipped"
    description = Column(String(500), nullable=True)      # human-readable note
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="tracking_events")

    def __repr__(self):
        return f"<TrackingEvent order={self.order_id} status='{self.status}'>"
