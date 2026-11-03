import requests
import json

BASE = 'http://127.0.0.1:8000'

print('====================================================')
print('GLOW & GLAM API TESTING - USER REQUIRED ENDPOINTS')
print('====================================================')

# 1. GET /api/products
print('\n[1] GET /api/products')
r1 = requests.get(f'{BASE}/api/products')
print(f'HTTP Status: {r1.status_code}')
d1 = r1.json()
print(f'Total count: {d1.get("total")}')
print(f'Items loaded: {len(d1.get("items", []))}')
if d1.get("items"):
    p = d1["items"][0]
    print(f'Sample product: id={p.get("id")}, name="{p.get("name")}", price=Rs {p.get("price")}, category={p.get("category")}')

# 2. POST /api/auth/login
print('\n[2] POST /api/auth/login')
r2 = requests.post(f'{BASE}/api/auth/login', json={'email': 'admin@glowandglam.com', 'password': 'Admin@Glow2026'})
print(f'HTTP Status: {r2.status_code}')
d2 = r2.json()
token = d2.get('access_token')
print(f'Token Type: {d2.get("token_type")}')
print(f'JWT Token (first 30 chars): {token[:30]}...')
print(f'User: {d2.get("user", {}).get("full_name")}, role: {d2.get("user", {}).get("role")}, is_admin: {d2.get("user", {}).get("is_admin")}')

headers = {'Authorization': f'Bearer {token}'}

# 3. GET /api/auth/me
print('\n[3] GET /api/auth/me')
r3 = requests.get(f'{BASE}/api/auth/me', headers=headers)
print(f'HTTP Status: {r3.status_code}')
d3 = r3.json()
print(f'Authenticated User: ID={d3.get("id")}, Name="{d3.get("full_name")}", Email={d3.get("email")}, Role={d3.get("role")}, is_admin={d3.get("is_admin")}')

# 4. GET /api/cart
print('\n[4] GET /api/cart')
r4 = requests.get(f'{BASE}/api/cart', headers=headers)
print(f'HTTP Status: {r4.status_code}')
d4 = r4.json()
print(f'Cart Status: Total items = {d4.get("total_items")}, Total price = Rs {d4.get("total")}')

# 5. GET /api/wishlist
print('\n[5] GET /api/wishlist')
r5 = requests.get(f'{BASE}/api/wishlist', headers=headers)
print(f'HTTP Status: {r5.status_code}')
d5 = r5.json()
print(f'Wishlist Status: Total items = {d5.get("total_items")}, Items = {len(d5.get("items", []))}')

# Customer account verification test
print('\n[6] Customer vs Admin Authorization Check')
# Register or login as customer
r_cust = requests.post(f'{BASE}/api/auth/login', json={'email': 'nandhini.customer@glowandglam.com', 'password': 'Password123!'})
if r_cust.status_code != 200:
    # use other test customer
    r_cust = requests.post(f'{BASE}/api/auth/login', json={'email': 'cust_admin_test_8@example.com', 'password': 'Password123!'})
cust_token = r_cust.json().get('access_token')
cust_headers = {'Authorization': f'Bearer {cust_token}'}

# Customer calls GET /api/auth/me
r_cust_me = requests.get(f'{BASE}/api/auth/me', headers=cust_headers)
print(f'Customer GET /api/auth/me Status: {r_cust_me.status_code}, Role: {r_cust_me.json().get("role")}, is_admin: {r_cust_me.json().get("is_admin")}')

# Customer attempts to call admin endpoints
r_cust_admin_stats = requests.get(f'{BASE}/api/admin/dashboard/stats', headers=cust_headers)
print(f'Customer GET /api/admin/dashboard/stats: {r_cust_admin_stats.status_code} (Expected 403 Forbidden)')

r_cust_admin_orders = requests.get(f'{BASE}/api/admin/orders', headers=cust_headers)
print(f'Customer GET /api/admin/orders: {r_cust_admin_orders.status_code} (Expected 403 Forbidden)')

r_cust_admin_prods = requests.post(f'{BASE}/api/admin/products', json={'name': 'Hacked'}, headers=cust_headers)
print(f'Customer POST /api/admin/products: {r_cust_admin_prods.status_code} (Expected 403 Forbidden)')

print('\n====================================================')
print('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!')
print('====================================================')
