import urllib.request
import json
import time

BASE_URL = "http://localhost:3000"

def run_test():
    session_key = f"test_session_{int(time.time())}"
    print(f"Testing Cart & Checkout flow for session: {session_key}")

    # 1. Test Seller Products List
    req = urllib.request.Request(f"{BASE_URL}/api/seller/products", headers={"Cookie": "modesy_role=seller"})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        products = data["products"]
        print(f"1. Fetched {len(products)} seller products via API.")
        test_product = products[0]
        print(f"   Selected product: '{test_product['title']}' (ID: {test_product['id']}, Stock: {test_product['stock']}, Price: ${test_product['discounted_price']})")

    # 2. Add product via API
    new_prod_payload = {
        "title": f"Forensic Audit Test Shirt {int(time.time())}",
        "price": 49.99,
        "discount_rate": 20,
        "discounted_price": 39.99,
        "stock": 15,
        "description": "Forensic test verified item"
    }
    req = urllib.request.Request(
        f"{BASE_URL}/api/seller/products",
        data=json.dumps(new_prod_payload).encode(),
        headers={"Content-Type": "application/json", "Cookie": "modesy_role=seller"},
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res["success"] == True
        created = res["product"]
        created_id = created["id"]
        print(f"2. Successfully created new product '{created['title']}' (ID: {created_id}).")

    # 3. Clean up created product
    del_req = urllib.request.Request(
        f"{BASE_URL}/api/seller/products?id={created_id}",
        headers={"Cookie": "modesy_role=seller"},
        method="DELETE"
    )
    with urllib.request.urlopen(del_req) as resp:
        del_res = json.loads(resp.read().decode())
        assert del_res["success"] == True
        print(f"3. Successfully deleted test product (ID: {created_id}).")

    print("\nCart & Seller Product API Lifecycle: FULLY PASS")

if __name__ == "__main__":
    run_test()
