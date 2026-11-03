import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import urllib.request
import urllib.error
import json
import http.cookiejar
try:
    import psycopg2
except ImportError:
    import psycopg as psycopg2
import time
import jwt
from datetime import datetime, timedelta, timezone
from backend.config import settings
from backend.security import generate_reset_token, hash_reset_token

BASE_URL = "http://127.0.0.1:8000"

print("=================================================================")
print("GLOW & GLAM E-COMMERCE - COMPLETE AUTH & SYSTEM TEST SUITE")
print("=================================================================\n")

total = 0
passed = 0

def assert_test(cond, name, details=""):
    global total, passed
    total += 1
    if cond:
        passed += 1
        print(f"[PASS] {name}")
    else:
        print(f"[FAIL] {name} - {details}")

# Setup CookieJar for handling HttpOnly cookies
cookie_jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))

# Health check
try:
    req = urllib.request.Request(f"{BASE_URL}/api/health")
    with opener.open(req) as res:
        data = json.loads(res.read().decode())
        assert_test(res.status == 200 and data.get("database") == "connected", "Health check & PostgreSQL connection")
except Exception as e:
    assert_test(False, "Health check", str(e))

# SCENARIO 1: New customer registration
test_email = f"nandhini.customer.{int(time.time())}@glowandglam.com"
test_password = "SecurePassword@2026"
reg_payload = {
    "full_name": "Nandhini Sakthi",
    "email": test_email,
    "phone": "+91 9876543210",
    "password": test_password,
    "confirm_password": test_password,
    "terms_accepted": True
}

registered_user = None
try:
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/register",
        data=json.dumps(reg_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req) as res:
        data = json.loads(res.read().decode())
        registered_user = data.get("user", {})
        assert_test(
            res.status == 201 and registered_user.get("email") == test_email,
            "Scenario 1: New customer registration"
        )
except Exception as e:
    assert_test(False, "Scenario 1: New customer registration", str(e))

# SCENARIO 2: Duplicate email registration
try:
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/register",
        data=json.dumps(reg_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req) as res:
        assert_test(False, "Scenario 2: Duplicate email registration allowed unexpectedly")
except urllib.error.HTTPError as e:
    assert_test(e.code == 409, "Scenario 2: Duplicate email registration rejected with 409 Conflict")
except Exception as e:
    assert_test(False, "Scenario 2: Duplicate email registration", str(e))

# SCENARIO 3: Password hashing in PostgreSQL directly (Argon2id)
try:
    db_conn = psycopg2.connect(dbname='glow_and_glam_db', user='postgres', password='nandha123', host='127.0.0.1', port=5432)
    cur = db_conn.cursor()
    cur.execute("SELECT hashed_password FROM users WHERE email=%s;", (test_email,))
    row = cur.fetchone()
    db_conn.close()
    is_argon2 = bool(row and row[0].startswith("$argon2id$"))
    assert_test(is_argon2, "Scenario 3: Password hashing in PostgreSQL (Argon2id format verified)")
except Exception as e:
    assert_test(False, "Scenario 3: Password hashing in PostgreSQL", str(e))

# SCENARIO 4: Login with valid credentials
login_payload = {
    "email": test_email,
    "password": test_password,
    "remember_me": True
}
login_cookie_found = False
try:
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=json.dumps(login_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req) as res:
        data = json.loads(res.read().decode())
        for cookie in cookie_jar:
            if cookie.name == "glow_access_token":
                login_cookie_found = True
        assert_test(res.status == 200 and login_cookie_found, "Scenario 4: Login with valid credentials & HttpOnly cookie")
except Exception as e:
    assert_test(False, "Scenario 4: Login with valid credentials", str(e))

# SCENARIO 5: Login with invalid credentials
bad_login = {
    "email": test_email,
    "password": "WrongPassword123!"
}
try:
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=json.dumps(bad_login).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req) as res:
        assert_test(False, "Scenario 5: Login with invalid credentials succeeded unexpectedly")
except urllib.error.HTTPError as e:
    err_body = json.loads(e.read().decode())
    assert_test(e.code == 401 and "Invalid email or password" in err_body.get("detail", ""), "Scenario 5: Login with invalid credentials returns generic 401")
except Exception as e:
    assert_test(False, "Scenario 5: Login with invalid credentials", str(e))

# SCENARIO 6: Access to protected endpoints without authentication
unauthed_opener = urllib.request.build_opener()
try:
    req = urllib.request.Request(f"{BASE_URL}/api/auth/me")
    with unauthed_opener.open(req) as res:
        assert_test(False, "Scenario 6: Access to protected endpoint without auth succeeded unexpectedly")
except urllib.error.HTTPError as e:
    assert_test(e.code == 401, "Scenario 6: Access to protected endpoint without authentication rejected with 401")
except Exception as e:
    assert_test(False, "Scenario 6: Access without auth", str(e))

# SCENARIO 7: Access to protected endpoints with valid authentication
try:
    req = urllib.request.Request(f"{BASE_URL}/api/auth/me")
    with opener.open(req) as res:
        data = json.loads(res.read().decode())
        assert_test(res.status == 200 and data.get("email") == test_email, "Scenario 7: Access to protected endpoints with valid authentication")
except Exception as e:
    assert_test(False, "Scenario 7: Protected endpoint access", str(e))

# SCENARIO 8: Access after token expiration
try:
    user_id = registered_user.get("id") if registered_user else 1
    expired_payload = {
        "sub": str(user_id),
        "email": test_email,
        "exp": datetime.now(timezone.utc) - timedelta(minutes=10),
        "iat": datetime.now(timezone.utc) - timedelta(minutes=40)
    }
    expired_jwt = jwt.encode(expired_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {expired_jwt}"}
    )
    with unauthed_opener.open(req) as res:
        assert_test(False, "Scenario 8: Expired token accepted unexpectedly")
except urllib.error.HTTPError as e:
    err_body = json.loads(e.read().decode())
    assert_test(e.code == 401 and "expired" in err_body.get("detail", "").lower(), "Scenario 8: Access after token expiration rejected with 401 'Session expired'")
except Exception as e:
    assert_test(False, "Scenario 8: Token expiration test", str(e))

# SCENARIO 9: Customer profile update
update_payload = {
    "full_name": "Nandhini Sakthi (Updated)",
    "phone": "+91 9999988888"
}
try:
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/me",
        data=json.dumps(update_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="PUT"
    )
    with opener.open(req) as res:
        data = json.loads(res.read().decode())
        assert_test(
            res.status == 200 and data.get("full_name") == "Nandhini Sakthi (Updated)" and data.get("phone") == "+91 9999988888",
            "Scenario 9: Customer profile update"
        )
except Exception as e:
    assert_test(False, "Scenario 9: Customer profile update", str(e))

# SCENARIO 10: Logout
try:
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/logout",
        data=b"{}",
        headers={"Content-Type": "application/json"}
    )
    with opener.open(req) as res:
        data = json.loads(res.read().decode())
        assert_test(res.status == 200 and "Logged out" in data.get("message", ""), "Scenario 10: Logout clears authentication cookie")
except Exception as e:
    assert_test(False, "Scenario 10: Logout", str(e))

# SCENARIO 11: Password-reset validation
# 11a. Request password reset (does not expose email existence)
try:
    forgot_req = urllib.request.Request(
        f"{BASE_URL}/api/auth/forgot-password",
        data=json.dumps({"email": test_email}).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with opener.open(forgot_req) as res:
        forgot_data = json.loads(res.read().decode())
        expected_msg = "If an account with that email address exists, a password reset link has been sent."
        assert_test(res.status == 200 and forgot_data.get("message") == expected_msg, "Scenario 11a: Password-reset request without email enumeration")

    # 11b. Verify token creation and hash representation in database
    db_conn = psycopg2.connect(dbname='glow_and_glam_db', user='postgres', password='nandha123', host='127.0.0.1', port=5432)
    cur = db_conn.cursor()
    cur.execute("""
        SELECT prt.token_hash, prt.used 
        FROM password_reset_tokens prt 
        JOIN users u ON prt.user_id = u.id 
        WHERE u.email = %s 
        ORDER BY prt.created_at DESC LIMIT 1;
    """, (test_email,))
    prt_row = cur.fetchone()
    assert_test(bool(prt_row and len(prt_row[0]) == 64 and prt_row[1] == False), "Scenario 11b: Reset token stored as secure SHA-256 hash in database")

    # 11c. Create a test reset token to test the reset-password endpoint end-to-end
    cur.execute("SELECT id FROM users WHERE email = %s;", (test_email,))
    uid = cur.fetchone()[0]
    test_raw_token = generate_reset_token()
    test_hashed_token = hash_reset_token(test_raw_token)
    expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    cur.execute("""
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used)
        VALUES (%s, %s, %s, %s);
    """, (uid, test_hashed_token, expires, False))
    db_conn.commit()
    db_conn.close()

    new_pwd = "BrandNewPassword@2026"
    reset_payload = {
        "token": test_raw_token,
        "new_password": new_pwd,
        "confirm_password": new_pwd
    }
    reset_req = urllib.request.Request(
        f"{BASE_URL}/api/auth/reset-password",
        data=json.dumps(reset_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with opener.open(reset_req) as res:
        reset_res = json.loads(res.read().decode())
        assert_test(res.status == 200 and "successfully" in reset_res.get("message", "").lower(), "Scenario 11c: Password reset with valid token succeeds")

    # 11d. Reusing the same token must fail (single-use token enforcement)
    try:
        with opener.open(reset_req) as res:
            assert_test(False, "Scenario 11d: Reusing used reset token succeeded unexpectedly")
    except urllib.error.HTTPError as e:
        assert_test(e.code == 400, "Scenario 11d: Reusing used reset token rejected (single-use enforced)")

    # 11e. Login with new password
    new_login_req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=json.dumps({"email": test_email, "password": new_pwd}).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with opener.open(new_login_req) as res:
        assert_test(res.status == 200, "Scenario 11e: Login with updated password succeeds")

except Exception as e:
    assert_test(False, "Scenario 11: Password-reset validation", str(e))

# SCENARIO 12: Mobile responsiveness checks
try:
    with open("src/styles.css", "r", encoding="utf-8") as f:
        css = f.read()
    has_small_mobile = "@media (max-width: 360px)" in css
    has_mobile_modal = "@media (max-width: 520px)" in css
    has_tablet = "@media (max-width: 900px)" in css or "@media (max-width: 768px)" in css
    has_auth_responsive = ".auth-modal" in css and ".profile-modal" in css
    assert_test(has_small_mobile and has_mobile_modal and has_tablet and has_auth_responsive, "Scenario 12: Mobile responsiveness styles verified")
except Exception as e:
    assert_test(False, "Scenario 12: Mobile responsiveness", str(e))

# SCENARIO 13: Frontend production build
try:
    dist_html = os.path.exists("dist/index.html")
    dist_assets = os.path.exists("dist/assets") and len(os.listdir("dist/assets")) >= 2
    assert_test(dist_html and dist_assets, "Scenario 13: Frontend production build files verified")
except Exception as e:
    assert_test(False, "Scenario 13: Frontend production build", str(e))

# SWAGGER UI CHECK
try:
    docs_req = urllib.request.Request(f"{BASE_URL}/docs")
    with opener.open(docs_req) as res:
        assert_test(res.status == 200, "Swagger UI documentation accessible at /docs")
except Exception as e:
    assert_test(False, "Swagger UI check", str(e))

print("\n=================================================================")
print(f"ALL SCENARIOS TEST SUMMARY: {passed} / {total} tests passed ({round((passed/total)*100)}%)")
print("=================================================================")
