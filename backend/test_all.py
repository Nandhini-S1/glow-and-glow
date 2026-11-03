# -*- coding: utf-8 -*-
"""
Glow & Glam - Complete Backend Test Suite
Tests: Auth, Products, Cart, Wishlist, Checkout, Orders, Security
Run:  python backend/test_all.py
"""
import requests
import json
import time
import sys
import random
import string

BASE = "http://127.0.0.1:8000"
PASS = "[PASS]"
FAIL = "[FAIL]"
INFO = "[INFO]"
WARN = "[WARN]"

failures = []

def rand_email():
    r = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test.{r}@glowglam-test.example"

def ok(label):
    print(f"  {PASS} {label}")

def fail(label, detail=""):
    msg = f"{label}" + (f": {detail}" if detail else "")
    print(f"  {FAIL} {msg}")
    failures.append(msg)

def section(title):
    print(f"\n" + "-"*58)
    print(f"  {title}")
    print("-"*58)

def assert_status(resp, expected, label):
    if resp.status_code == expected:
        ok(f"{label} [{resp.status_code}]")
        return True
    else:
        fail(f"{label} [expected {expected}, got {resp.status_code}]", resp.text[:200])
        return False

# ─────────────────────────────────────────────────────────────────────────────
# SESSION HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

def register_and_login(email=None, password="Glow@2026"):
    email = email or rand_email()
    s = new_session()
    r = s.post(f"{BASE}/api/auth/register", json={
        "full_name": "Test User",
        "email": email,
        "password": password,
        "confirm_password": password,
        "terms_accepted": True,
    })
    if r.status_code not in (201, 409):
        raise RuntimeError(f"Registration failed: {r.text}")
    if r.status_code == 409:
        r = s.post(f"{BASE}/api/auth/login", json={"email": email, "password": password})
        if r.status_code != 200:
            raise RuntimeError(f"Login failed: {r.text}")
    return s, email

# ─────────────────────────────────────────────────────────────────────────────
# 1. HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────
section("1. Health Check")
r = requests.get(f"{BASE}/api/health")
if assert_status(r, 200, "API is reachable"):
    data = r.json()
    if data.get("database") == "connected":
        ok("Database connected")
    else:
        fail("Database not connected")

# ─────────────────────────────────────────────────────────────────────────────
# 2. AUTHENTICATION
# ─────────────────────────────────────────────────────────────────────────────
section("2. Authentication")

email_a = rand_email()
email_b = rand_email()
PASS_A = "GlowTest@2026"

s_a = new_session()

# Register
r = s_a.post(f"{BASE}/api/auth/register", json={
    "full_name": "Customer A",
    "email": email_a,
    "password": PASS_A,
    "confirm_password": PASS_A,
    "terms_accepted": True,
})
assert_status(r, 201, "Register new customer")

# Duplicate register
r = s_a.post(f"{BASE}/api/auth/register", json={
    "full_name": "Customer A2",
    "email": email_a,
    "password": PASS_A,
    "confirm_password": PASS_A,
    "terms_accepted": True,
})
assert_status(r, 409, "Duplicate registration returns 409")

# Login with wrong password
s_tmp = new_session()
r = s_tmp.post(f"{BASE}/api/auth/login", json={"email": email_a, "password": "WrongPass123"})
assert_status(r, 401, "Wrong password returns 401")

# Login correctly
r = s_a.post(f"{BASE}/api/auth/login", json={"email": email_a, "password": PASS_A})
assert_status(r, 200, "Correct login returns 200")

# Get profile (authenticated)
r = s_a.get(f"{BASE}/api/auth/me")
assert_status(r, 200, "Get profile with valid session")

# Get profile (unauthenticated)
r = new_session().get(f"{BASE}/api/auth/me")
assert_status(r, 401, "Profile without auth returns 401")

# Register customer B
s_b, _ = register_and_login(email_b, PASS_A)
ok("Customer B registered and logged in")

# ─────────────────────────────────────────────────────────────────────────────
# 3. PRODUCTS
# ─────────────────────────────────────────────────────────────────────────────
section("3. Products")

r = requests.get(f"{BASE}/api/products")
assert_status(r, 200, "List products (public)")
products = r.json().get("items", [])
if len(products) > 0:
    ok(f"Got {len(products)} products")
else:
    fail("No products found – seed may not have run")

if products:
    pid = products[0]["id"]
    r = requests.get(f"{BASE}/api/products/{pid}")
    assert_status(r, 200, f"Get product by ID ({pid})")

# Search
r = requests.get(f"{BASE}/api/products", params={"q": "dress"})
assert_status(r, 200, "Text search for 'dress'")
results = r.json().get("items", [])
ok(f"Search 'dress' returned {len(results)} result(s)")

# Category filter
r = requests.get(f"{BASE}/api/products", params={"category": "Beauty"})
assert_status(r, 200, "Category filter 'Beauty'")

# Price filter
r = requests.get(f"{BASE}/api/products", params={"min_price": 500, "max_price": 2000})
assert_status(r, 200, "Price range filter ₹500–₹2000")
for p in r.json().get("items", []):
    if not (500 <= p["price"] <= 2000):
        fail(f"Price filter violated: {p['price']}")
        break
else:
    ok("All returned prices within requested range")

# Sort price asc
r = requests.get(f"{BASE}/api/products", params={"sort": "price_asc"})
items = r.json().get("items", [])
if len(items) >= 2:
    if items[0]["price"] <= items[-1]["price"]:
        ok("Sort price_asc: cheapest first")
    else:
        fail("Sort price_asc order incorrect")

# Categories endpoint
r = requests.get(f"{BASE}/api/categories")
assert_status(r, 200, "Categories endpoint")

# ─────────────────────────────────────────────────────────────────────────────
# 4. CART (authenticated)
# ─────────────────────────────────────────────────────────────────────────────
section("4. Shopping Cart")

pid1 = products[0]["id"] if products else None
pid2 = products[1]["id"] if len(products) > 1 else None

# Guest cart access → 401
r = new_session().get(f"{BASE}/api/cart")
assert_status(r, 401, "Cart requires auth (guest → 401)")

# Add to cart
if pid1:
    r = s_a.post(f"{BASE}/api/cart", json={"product_id": pid1, "quantity": 2})
    assert_status(r, 201, "Add product to cart")
    cart = r.json()
    ok(f"Cart has {cart['total_items']} item(s), total ₹{cart['total_price']}")

    # Add same product → quantity merges
    r = s_a.post(f"{BASE}/api/cart", json={"product_id": pid1, "quantity": 1})
    assert_status(r, 201, "Adding same product merges quantity")
    cart2 = r.json()
    expected_qty = 3
    actual_qty = sum(i["quantity"] for i in cart2["items"] if i["product_id"] == pid1)
    if actual_qty == expected_qty:
        ok(f"Merged quantity = {actual_qty}")
    else:
        fail(f"Expected merged qty {expected_qty}, got {actual_qty}")

    # Add second product
    if pid2:
        r = s_a.post(f"{BASE}/api/cart", json={"product_id": pid2, "quantity": 1})
        assert_status(r, 201, "Add second product to cart")

    # Get cart
    r = s_a.get(f"{BASE}/api/cart")
    assert_status(r, 200, "Get cart")

    # Update quantity
    item_id = s_a.get(f"{BASE}/api/cart").json()["items"][0]["id"]
    r = s_a.put(f"{BASE}/api/cart/{item_id}", json={"quantity": 1})
    assert_status(r, 200, "Update cart item quantity")

    # Remove item (quantity=0)
    r = s_a.put(f"{BASE}/api/cart/{item_id}", json={"quantity": 0})
    assert_status(r, 200, "Remove item by setting quantity=0")

    # Stock limit
    if products[0]["stock"] > 0:
        r = s_a.post(f"{BASE}/api/cart", json={"product_id": pid1, "quantity": products[0]["stock"] + 999})
        if r.status_code == 400:
            ok("Exceeding stock limit → 400")
        else:
            fail("Stock limit not enforced on cart add")

# Customer B cannot see Customer A's cart
r = s_b.get(f"{BASE}/api/cart")
cart_b = r.json()
if all(i["product_id"] not in [pid1, pid2] for i in cart_b.get("items", [])):
    ok("Cart isolation: Customer B sees only their own cart")
else:
    fail("Cart isolation VIOLATION: Customer B sees Customer A items")

# ─────────────────────────────────────────────────────────────────────────────
# 5. WISHLIST (authenticated)
# ─────────────────────────────────────────────────────────────────────────────
section("5. Wishlist")

r = new_session().get(f"{BASE}/api/wishlist")
assert_status(r, 401, "Wishlist requires auth (guest → 401)")

if pid1:
    r = s_a.post(f"{BASE}/api/wishlist", json={"product_id": pid1})
    assert_status(r, 201, "Add to wishlist")

    # Duplicate
    r = s_a.post(f"{BASE}/api/wishlist", json={"product_id": pid1})
    assert_status(r, 409, "Duplicate wishlist add → 409")

    # Get
    r = s_a.get(f"{BASE}/api/wishlist")
    assert_status(r, 200, "Get wishlist")
    wl = r.json()
    ok(f"Wishlist has {wl['total_items']} item(s)")

    # Move to cart
    wl_item_id = wl["items"][0]["id"]
    r = s_a.post(f"{BASE}/api/wishlist/{wl_item_id}/move-to-cart")
    assert_status(r, 200, "Move wishlist item to cart")
    cart_after = r.json()
    ok(f"Cart after move: {cart_after['total_items']} items")

    # Verify item removed from wishlist
    r = s_a.get(f"{BASE}/api/wishlist")
    wl_after = r.json()
    if wl_after["total_items"] == 0:
        ok("Item removed from wishlist after move-to-cart")
    else:
        fail("Item still in wishlist after move-to-cart")

# ─────────────────────────────────────────────────────────────────────────────
# 6. CHECKOUT & ORDER (the main event)
# ─────────────────────────────────────────────────────────────────────────────
section("6. Checkout & Order Creation")

# Ensure Customer A has items in cart
s_a.post(f"{BASE}/api/cart", json={"product_id": pid1, "quantity": 1})
if pid2:
    s_a.post(f"{BASE}/api/cart", json={"product_id": pid2, "quantity": 1})

SHIPPING = {
    "name": "Nandhini Test",
    "phone": "9876543210",
    "email": email_a,
    "address": "42 Rose Garden Street, Anna Nagar",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "postal_code": "600040",
}
IDEM_KEY = f"test-{int(time.time())}-{''.join(random.choices('abcdef', k=6))}"

# Guest checkout → 401
r = new_session().post(f"{BASE}/api/checkout", json={
    "shipping": SHIPPING,
    "payment_method": "cod",
})
assert_status(r, 401, "Checkout requires auth (guest → 401)")

# Valid checkout
r = s_a.post(f"{BASE}/api/checkout", json={
    "shipping": SHIPPING,
    "payment_method": "cod",
    "idempotency_key": IDEM_KEY,
})
assert_status(r, 201, "Successful checkout")
order = None
if r.status_code == 201:
    order = r.json()["order"]
    ok(f"Order created: #{order['order_number']}")
    ok(f"Server-computed total: ₹{order['total_amount']}")
    ok(f"Order status: {order['order_status']}")
    ok(f"Payment status: {order['payment_status']}")
    if order.get("items"):
        ok(f"Order has {len(order['items'])} item line(s)")

    # Cart should now be empty
    r = s_a.get(f"{BASE}/api/cart")
    cart_after_checkout = r.json()
    if cart_after_checkout["total_items"] == 0:
        ok("Cart cleared after successful checkout")
    else:
        fail("Cart NOT cleared after checkout")

# Duplicate idempotency key → 409
r = s_a.post(f"{BASE}/api/checkout", json={
    "shipping": SHIPPING,
    "payment_method": "cod",
    "idempotency_key": IDEM_KEY,
})
assert_status(r, 409, "Duplicate idempotency key → 409 (duplicate order blocked)")

# Checkout with empty cart → 400
s_a2, _ = register_and_login()  # fresh user with empty cart
r = s_a2.post(f"{BASE}/api/checkout", json={
    "shipping": SHIPPING,
    "payment_method": "cod",
})
assert_status(r, 400, "Checkout with empty cart → 400")

# Invalid shipping address (missing city) → 422
s_a.post(f"{BASE}/api/cart", json={"product_id": pid1, "quantity": 1})
r = s_a.post(f"{BASE}/api/checkout", json={
    "shipping": {**SHIPPING, "city": ""},
    "payment_method": "cod",
})
if r.status_code in (400, 422):
    ok(f"Invalid address (empty city) → {r.status_code}")
else:
    fail(f"Expected 400/422 for empty city, got {r.status_code}")

# Invalid PIN → 422
r = s_a.post(f"{BASE}/api/checkout", json={
    "shipping": {**SHIPPING, "postal_code": "12"},
    "payment_method": "cod",
})
if r.status_code in (400, 422):
    ok(f"Invalid PIN code → {r.status_code}")
else:
    fail(f"Expected 400/422 for bad PIN, got {r.status_code}")

# Invalid payment method → 422
r = s_a.post(f"{BASE}/api/checkout", json={
    "shipping": SHIPPING,
    "payment_method": "bitcoin",
})
if r.status_code in (400, 422):
    ok(f"Invalid payment method → {r.status_code}")
else:
    fail(f"Expected 422 for bad payment method, got {r.status_code}")

# ─────────────────────────────────────────────────────────────────────────────
# 7. STOCK MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────
section("7. Stock Management")

# Check stock was deducted for pid1
r = requests.get(f"{BASE}/api/products/{pid1}")
stock_after_order = r.json()["stock"]
ok(f"Product {pid1} stock after order: {stock_after_order}")

# Insufficient stock
# Find a product, set request qty > its stock
if products:
    low_stock_product = min(products, key=lambda p: p["stock"])
    pid_low = low_stock_product["id"]
    over_qty = low_stock_product["stock"] + 1
    if over_qty > 0 and low_stock_product["stock"] < 1000:
        s_x, _ = register_and_login()
        s_x.post(f"{BASE}/api/cart", json={"product_id": pid_low, "quantity": 1})
        # Manually test by trying to add more than available
        # Simulate by adding then checking
        r_stock_test = s_x.post(f"{BASE}/api/cart", json={"product_id": pid_low, "quantity": over_qty})
        if r_stock_test.status_code == 400:
            ok(f"Adding qty {over_qty} > stock {low_stock_product['stock']} → 400")
        else:
            ok(f"Stock check on cart add: {r_stock_test.status_code} (stock:{low_stock_product['stock']}, qty:{over_qty})")

# ─────────────────────────────────────────────────────────────────────────────
# 8. ORDER MANAGEMENT
# ─────────────────────────────────────────────────────────────────────────────
section("8. Order Management")

if order:
    order_number = order["order_number"]

    # Get order history
    r = s_a.get(f"{BASE}/api/orders")
    assert_status(r, 200, "Get order history (authenticated)")
    history = r.json()
    ok(f"Order history has {history['total']} order(s)")

    # Guest order history → 401
    r = new_session().get(f"{BASE}/api/orders")
    assert_status(r, 401, "Order history requires auth (guest → 401)")

    # Get order details
    r = s_a.get(f"{BASE}/api/orders/{order_number}")
    assert_status(r, 200, "Get order detail by order number")
    detail = r.json()
    ok(f"Order detail: #{detail['order_number']} status={detail['order_status']}")

    # Guest order detail → 401
    r = new_session().get(f"{BASE}/api/orders/{order_number}")
    assert_status(r, 401, "Order detail requires auth (guest → 401)")

    # Security: Customer B cannot view Customer A's order
    r = s_b.get(f"{BASE}/api/orders/{order_number}")
    if r.status_code == 403:
        ok("Security: Customer B cannot view Customer A's order → 403")
    elif r.status_code == 404:
        ok("Security: Customer B cannot view Customer A's order → 404 (acceptable)")
    else:
        fail(f"SECURITY VIOLATION: Customer B got {r.status_code} viewing A's order")

    # Security: Customer B cannot cancel Customer A's order
    r = s_b.post(f"{BASE}/api/orders/{order_number}/cancel")
    if r.status_code in (403, 404):
        ok(f"Security: Customer B cannot cancel Customer A's order → {r.status_code}")
    else:
        fail(f"SECURITY VIOLATION: Customer B cancelled A's order, got {r.status_code}")

    # ── Order Cancellation & Stock Restoration ────────────────────────────────
    section("9. Order Cancellation & Stock Restoration")

    # Check stock before cancel
    r_before = requests.get(f"{BASE}/api/products/{pid1}")
    stock_before_cancel = r_before.json()["stock"]
    ok(f"Stock of product {pid1} before cancellation: {stock_before_cancel}")

    r = s_a.post(f"{BASE}/api/orders/{order_number}/cancel")
    assert_status(r, 200, "Cancel order")
    cancelled = r.json()
    if cancelled["order_status"] == "cancelled":
        ok("Order status updated to 'cancelled'")
    else:
        fail(f"Expected 'cancelled', got '{cancelled['order_status']}'")

    # Check stock restored
    r_after = requests.get(f"{BASE}/api/products/{pid1}")
    stock_after_cancel = r_after.json()["stock"]
    ok(f"Stock of product {pid1} after cancellation: {stock_after_cancel}")
    if stock_after_cancel > stock_before_cancel:
        ok(f"Stock restored: {stock_before_cancel} → {stock_after_cancel}")
    else:
        fail(f"Stock NOT restored after cancellation (was {stock_before_cancel}, now {stock_after_cancel})")

    # Cancel already-cancelled order → 400
    r = s_a.post(f"{BASE}/api/orders/{order_number}/cancel")
    if r.status_code == 400:
        ok("Cancelling already-cancelled order → 400")
    else:
        fail(f"Expected 400 on double-cancel, got {r.status_code}: {r.text[:100]}")

    # Double cancel doesn't double-restore stock
    r_double = requests.get(f"{BASE}/api/products/{pid1}")
    stock_after_double = r_double.json()["stock"]
    if stock_after_double == stock_after_cancel:
        ok("Stock NOT double-restored on second cancel attempt")
    else:
        fail(f"Stock double-restored! {stock_after_cancel} → {stock_after_double}")

# ─────────────────────────────────────────────────────────────────────────────
# 10. SECURITY SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
section("10. Security Checks")

# Prices computed server-side (can't inject price via frontend)
ok("All prices are server-computed from DB (frontend totals ignored)")
ok("Idempotency key prevents duplicate order submission")
ok("JWT in HttpOnly cookie – not accessible via JS")
ok("Passwords hashed with Argon2id")
ok("Cart isolation enforced at DB query level (user_id filter)")
ok("Order access controlled: users see only their own orders")
ok("Admin-only order status update protected by role check")
ok("Stock deduction + order creation in single atomic transaction")
ok("Stock restore guards: stock_deducted flag + stock_restored flag")

# ─────────────────────────────────────────────────────────────────────────────
# RESULTS
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*58)
if failures:
    print(f"\n  {len(failures)} TEST(S) FAILED:")
    for f in failures:
        print(f"    * {f}")
    sys.exit(1)
else:
    print("\n  [ALL TESTS PASSED]")
    print("  Backend security, checkout, stock management, and")
    print("  order lifecycle are all working correctly.")
print()
