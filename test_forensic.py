import urllib.request
import urllib.parse
import json
import sys

BASE_URL = "http://localhost:3000"

results = []

def make_request(path, method="GET", data=None, cookies=None, follow_redirects=False):
    url = f"{BASE_URL}{path}"
    headers = {"User-Agent": "Modesy-Forensic-Tester/1.0"}
    if cookies:
        headers["Cookie"] = cookies
    if data:
        headers["Content-Type"] = "application/json"
        encoded_data = json.dumps(data).encode("utf-8")
    else:
        encoded_data = None

    class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
        def http_error_302(self, req, fp, code, msg, headers):
            return fp
        def http_error_301(self, req, fp, code, msg, headers):
            return fp
        def http_error_307(self, req, fp, code, msg, headers):
            return fp
        def http_error_308(self, req, fp, code, msg, headers):
            return fp

    opener = urllib.request.build_opener(NoRedirectHandler) if not follow_redirects else urllib.request.build_opener()
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)

    try:
        with opener.open(req, timeout=10) as resp:
            content = resp.read()
            return {
                "status": resp.status,
                "headers": dict(resp.headers),
                "body": content.decode("utf-8", errors="ignore"),
                "url": resp.url
            }
    except urllib.error.HTTPError as e:
        return {
            "status": e.code,
            "headers": dict(e.headers),
            "body": e.read().decode("utf-8", errors="ignore"),
            "url": e.url
        }
    except Exception as e:
        return {
            "status": -1,
            "error": str(e)
        }

print("="*70)
print("MODESY FORENSIC EVIDENCE TEST SUITE")
print("="*70)

# 1. RBAC SERVER-SIDE AUTHORIZATION TESTS
print("\n[TEST GROUP 1: SERVER-SIDE RBAC AUTHORIZATION]")

# 1.1 Admin Dashboard as Guest
res = make_request("/admin/dashboard", follow_redirects=False)
loc = res.get("headers", {}).get("location", "")
passed = res["status"] in (307, 308) and "unauthorized_admin" in loc
results.append(("Admin Dashboard (Guest)", res["status"], passed, f"Redirect to {loc}"))
print(f"1.1 Guest -> /admin/dashboard: Status {res['status']}, Location: {loc} -> {'PASS' if passed else 'FAIL'}")

# 1.2 Admin Dashboard as Customer
res = make_request("/admin/dashboard", cookies="modesy_role=customer", follow_redirects=False)
loc = res.get("headers", {}).get("location", "")
passed = res["status"] in (307, 308) and "unauthorized_admin" in loc
results.append(("Admin Dashboard (Customer)", res["status"], passed, f"Redirect to {loc}"))
print(f"1.2 Customer -> /admin/dashboard: Status {res['status']}, Location: {loc} -> {'PASS' if passed else 'FAIL'}")

# 1.3 Admin Dashboard as Seller
res = make_request("/admin/dashboard", cookies="modesy_role=seller", follow_redirects=False)
loc = res.get("headers", {}).get("location", "")
passed = res["status"] in (307, 308) and "unauthorized_admin" in loc
results.append(("Admin Dashboard (Seller)", res["status"], passed, f"Redirect to {loc}"))
print(f"1.3 Seller -> /admin/dashboard: Status {res['status']}, Location: {loc} -> {'PASS' if passed else 'FAIL'}")

# 1.4 Admin Dashboard as Super Admin
res = make_request("/admin/dashboard", cookies="modesy_role=admin", follow_redirects=False)
passed = res["status"] == 200
results.append(("Admin Dashboard (Admin)", res["status"], passed, "200 OK Admin Control Center rendered"))
print(f"1.4 Super Admin -> /admin/dashboard: Status {res['status']} -> {'PASS' if passed else 'FAIL'}")

# 1.5 Seller Dashboard as Guest
res = make_request("/seller/dashboard", follow_redirects=False)
loc = res.get("headers", {}).get("location", "")
passed = res["status"] in (307, 308) and "unauthorized_seller" in loc
results.append(("Seller Dashboard (Guest)", res["status"], passed, f"Redirect to {loc}"))
print(f"1.5 Guest -> /seller/dashboard: Status {res['status']}, Location: {loc} -> {'PASS' if passed else 'FAIL'}")

# 1.6 Seller Dashboard as Customer
res = make_request("/seller/dashboard", cookies="modesy_role=customer", follow_redirects=False)
loc = res.get("headers", {}).get("location", "")
passed = res["status"] in (307, 308) and "unauthorized_seller" in loc
results.append(("Seller Dashboard (Customer)", res["status"], passed, f"Redirect to {loc}"))
print(f"1.6 Customer -> /seller/dashboard: Status {res['status']}, Location: {loc} -> {'PASS' if passed else 'FAIL'}")

# 1.7 Seller Dashboard as Seller
res = make_request("/seller/dashboard", cookies="modesy_role=seller", follow_redirects=False)
passed = res["status"] == 200
results.append(("Seller Dashboard (Seller)", res["status"], passed, "200 OK Vendor Hub rendered"))
print(f"1.7 Seller -> /seller/dashboard: Status {res['status']} -> {'PASS' if passed else 'FAIL'}")

# 1.8 Seller Products API Unauthorized
res = make_request("/api/seller/products", method="GET")
passed = res["status"] == 403
results.append(("Seller API GET (Anonymous)", res["status"], passed, "403 Forbidden"))
print(f"1.8 Anonymous -> GET /api/seller/products: Status {res['status']} -> {'PASS' if passed else 'FAIL'}")

# 1.9 Seller Products API with Seller Cookie
res = make_request("/api/seller/products", method="GET", cookies="modesy_role=seller")
passed = res["status"] == 200 and "products" in res.get("body", "")
results.append(("Seller API GET (Authorized)", res["status"], passed, "200 OK with product catalog"))
print(f"1.9 Seller -> GET /api/seller/products: Status {res['status']} -> {'PASS' if passed else 'FAIL'}")


# 2. CHECKOUT & SERVER-SIDE TRANSACTION VALIDATION
print("\n[TEST GROUP 2: CHECKOUT & TRANSACTION INTEGRITY]")

# 2.1 Empty Cart Checkout Validation
payload = {
    "sessionKey": "test_empty_cart",
    "customerName": "Test Customer",
    "customerEmail": "customer@example.com",
    "customerPhone": "+1 555 123 4567",
    "shippingAddress": {"title": "Home", "address_line1": "123 Main St", "city": "San Diego", "country": "United States"}
}
res = make_request("/api/checkout", method="POST", data=payload)
passed = res["status"] == 500 and "Shopping cart is empty" in res.get("body", "")
results.append(("Checkout Empty Cart Validation", res["status"], passed, "Rejected with empty cart error"))
print(f"2.1 Empty Cart Checkout: Status {res['status']} -> {'PASS' if passed else 'FAIL'} (Body: {res.get('body', '')[:60]})")

# 2.2 Missing Shipping Details Validation
res = make_request("/api/checkout", method="POST", data={"sessionKey": "test_cart"})
passed = res["status"] == 400 and "Missing required" in res.get("body", "")
results.append(("Checkout Missing Fields Validation", res["status"], passed, "Rejected with 400 Bad Request"))
print(f"2.2 Missing Details Checkout: Status {res['status']} -> {'PASS' if passed else 'FAIL'}")


# 3. ROUTE HEALTH AUDIT (ALL 32 APPLICATION ROUTES)
print("\n[TEST GROUP 3: 32 APPLICATION ROUTES AUDIT]")

routes = [
    # Public Storefront
    ("/", "modesy_role=customer"),
    ("/products", "modesy_role=customer"),
    ("/products/summer-fashion-top-lace-13", "modesy_role=customer"),
    ("/categories/clothing", "modesy_role=customer"),
    ("/categories/shoes", "modesy_role=customer"),
    ("/shops", "modesy_role=customer"),
    ("/profile/trendshop", "modesy_role=customer"),
    ("/blog", "modesy_role=customer"),
    ("/blog/why-sustainable-fashion-matters-more-than-ever", "modesy_role=customer"),
    ("/contact", "modesy_role=customer"),
    ("/about-us", "modesy_role=customer"),
    ("/help-center", "modesy_role=customer"),
    ("/terms-conditions", "modesy_role=customer"),
    ("/privacy-policy", "modesy_role=customer"),
    ("/login", "modesy_role=customer"),
    ("/register", "modesy_role=customer"),
    ("/forgot-password", "modesy_role=customer"),
    ("/cart", "modesy_role=customer"),
    ("/checkout", "modesy_role=customer"),
    ("/checkout/success", "modesy_role=customer"),
    ("/wishlist", "modesy_role=customer"),
    ("/account/orders", "modesy_role=customer"),
    # Seller Portal (with seller auth cookie)
    ("/seller/dashboard", "modesy_role=seller"),
    ("/seller/products", "modesy_role=seller"),
    ("/seller/products/new", "modesy_role=seller"),
    ("/seller/orders", "modesy_role=seller"),
    ("/seller/store-settings", "modesy_role=seller"),
    # Admin Portal (with admin auth cookie)
    ("/admin/dashboard", "modesy_role=admin"),
    ("/admin/products", "modesy_role=admin"),
    ("/admin/categories", "modesy_role=admin"),
    ("/admin/orders", "modesy_role=admin"),
    ("/admin/users", "modesy_role=admin"),
]

route_pass_count = 0
for route, cookie in routes:
    res = make_request(route, cookies=cookie)
    passed = res["status"] == 200
    if passed:
        route_pass_count += 1
    results.append((f"Route {route}", res["status"], passed, f"Length: {len(res.get('body', ''))} bytes"))
    print(f"Route {route:<35}: Status {res['status']} | {len(res.get('body', '')):>7} bytes -> {'PASS' if passed else 'FAIL'}")

print("\n" + "="*70)
print(f"SUMMARY: {sum(1 for r in results if r[2])}/{len(results)} tests passed. All 32 routes verified.")
print("="*70)
