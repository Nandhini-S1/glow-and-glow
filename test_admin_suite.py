import requests
import json

BASE = 'http://127.0.0.1:8000'
s_admin = requests.Session()
s_cust1 = requests.Session()
s_cust2 = requests.Session()

def ok(m): print(f"  [PASS] {m}")
def err(m): print(f"  [FAIL] {m}"); exit(1)

print("=== 1. ADMIN LOGIN & ROLE VERIFICATION ===")
r = s_admin.post(f"{BASE}/api/auth/login", json={"email": "admin@glowandglam.com", "password": "Admin@Glow2026"})
if r.status_code != 200: err(f"Admin login failed: {r.text}")
admin_data = r.json()
token_admin = admin_data["access_token"]
headers_admin = {"Authorization": f"Bearer {token_admin}"}
r = s_admin.get(f"{BASE}/api/auth/me", headers=headers_admin)
if r.status_code != 200 or r.json().get("role") != "admin": err(f"Admin me check failed: {r.text}")
ok("Admin logged in with role=admin")

print("=== 2. ADMIN DASHBOARD OVERVIEW STATS ===")
r = s_admin.get(f"{BASE}/api/admin/dashboard/stats", headers=headers_admin)
if r.status_code != 200: err(f"Admin stats failed: {r.text}")
stats = r.json()
tot_orders = stats["total_orders"]
tot_sales = stats["total_sales"]
tot_prods = stats["total_products"]
pending = stats["pending_orders"]
ok(f"Stats retrieved: Total Orders: {tot_orders}, Total Sales: Rs {tot_sales}, Products: {tot_prods}, Pending: {pending}")

print("=== 3. CUSTOMER ORDER CREATION & CART PERSISTENCE ===")
# Register customer 1
email1 = f"cust_admin_test_{tot_orders}@example.com"
r = s_cust1.post(f"{BASE}/api/auth/register", json={
    "name": "Test Customer",
    "email": email1,
    "password": "Password123!",
    "confirm_password": "Password123!",
    "terms_accepted": True
})
token_c1 = r.json()["access_token"]
headers_c1 = {"Authorization": f"Bearer {token_c1}"}

# Get product
products = s_cust1.get(f"{BASE}/api/products").json()["items"]
p = products[0]

# Add to cart
r = s_cust1.post(f"{BASE}/api/cart", json={"product_id": p["id"], "quantity": 2}, headers=headers_c1)
if r.status_code != 201: err(f"Add to cart failed: {r.text}")
ok(f"Product {p['id']} added to cart (qty 2)")

# Checkout
r = s_cust1.post(f"{BASE}/api/checkout", json={
    "shipping": {
        "name": "Test Customer",
        "phone": "9876543210",
        "email": email1,
        "address": "123 Market Street",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "postal_code": "600001"
    },
    "payment_method": "cod"
}, headers=headers_c1)
if r.status_code != 201: err(f"Checkout failed: {r.text}")
order = r.json()["order"]
order_num = order["order_number"]
ok(f"Order placed successfully: #{order_num}")

print("=== 4. ADMIN ORDER MANAGEMENT & STATUS UPDATES ===")
# Admin updates through timeline: confirmed -> packed -> shipped
for next_st in ["confirmed", "packed", "shipped"]:
    r = s_admin.patch(f"{BASE}/api/admin/orders/{order_num}/status", json={"status": next_st}, headers=headers_admin)
    if r.status_code != 200: err(f"Update to {next_st} failed: {r.text}")
    ok(f"Order #{order_num} updated to {next_st}")

# Admin updates tracking & courier
r = s_admin.patch(f"{BASE}/api/admin/orders/{order_num}/status", json={
    "status": "out_for_delivery",
    "courier_name": "BlueDart Express",
    "tracking_number": "BD88992211IN",
    "estimated_delivery": "2026-11-05T18:00:00Z",
    "description": "Package out with delivery executive"
}, headers=headers_admin)
if r.status_code != 200: err(f"Tracking update failed: {r.text}")
ok("Courier BlueDart & AWB BD88992211IN saved in PostgreSQL")

print("=== 5. CUSTOMER TRACKING & TIMELINE VERIFICATION ===")
r = s_cust1.get(f"{BASE}/api/orders/{order_num}/track", headers=headers_c1)
if r.status_code != 200: err(f"Track order failed: {r.text}")
track = r.json()
if track["courier_name"] != "BlueDart Express" or track["tracking_number"] != "BD88992211IN":
    err(f"Logistics info not returned: {track}")
if len(track["tracking_events"]) < 4:
    err(f"Events missing in PostgreSQL: {track['tracking_events']}")
ok(f"Customer verified tracking: status={track['current_status']}, {len(track['tracking_events'])} timeline events in DB")

print("=== 6. CUSTOMER ISOLATION SECURITY CHECK ===")
# Register customer 2
r = s_cust2.post(f"{BASE}/api/auth/register", json={
    "name": "Other Customer",
    "email": f"other_{tot_orders}@example.com",
    "password": "Password123!",
    "confirm_password": "Password123!",
    "terms_accepted": True
})
token_c2 = r.json()["access_token"]
headers_c2 = {"Authorization": f"Bearer {token_c2}"}
r = s_cust2.get(f"{BASE}/api/orders/{order_num}/track", headers=headers_c2)
if r.status_code != 403: err(f"Security violation! Unauthorized customer was able to view order: {r.status_code}")
ok("Customer B blocked with 403 Forbidden from viewing Customer A order")

print("=== 7. PRODUCT MANAGEMENT & LOW-STOCK RESTOCK ===")
# Admin updates stock
r = s_admin.patch(f"{BASE}/api/admin/products/{p['id']}/stock", json={"stock": 8}, headers=headers_admin)
if r.status_code != 200: err(f"Stock update failed: {r.text}")
ok(f"Product {p['id']} stock updated to 8 (low stock alert triggered)")

# Check dashboard stats detects low stock
r = s_admin.get(f"{BASE}/api/admin/dashboard/stats", headers=headers_admin)
if r.json()["low_stock_count"] < 1: err("Low stock not detected")
ok(f"Dashboard detected {r.json()['low_stock_count']} low-stock item(s)")

# Restock to 50
s_admin.patch(f"{BASE}/api/admin/products/{p['id']}/stock", json={"stock": 50}, headers=headers_admin)
ok("Product safely restocked to 50")

print("=== 8. SALES REPORTS WITH DATE FILTERS ===")
r = s_admin.get(f"{BASE}/api/admin/reports/sales?period=today", headers=headers_admin)
if r.status_code != 200: err(f"Sales report today failed: {r.text}")
rep_today = r.json()
ok(f"Sales report for today: Rs {rep_today['total_sales']} across {rep_today['total_orders']} order(s)")

r = s_admin.get(f"{BASE}/api/admin/reports/sales?period=all", headers=headers_admin)
rep_all = r.json()
ok(f"Sales report for all time: Rs {rep_all['total_sales']}, AOV: Rs {rep_all['average_order_value']}, {len(rep_all['top_products'])} top products")

print("\n=============================================")
print("ALL ADMIN DASHBOARD & TRACKING VERIFICATIONS PASSED!")
print("=============================================")
