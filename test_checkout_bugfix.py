import urllib.request
import json
import sys

BASE_URL = "http://localhost:3000"

def post_checkout(payload):
    req = urllib.request.Request(
        f"{BASE_URL}/api/checkout",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))

print("="*60)
print("TESTING CHECKOUT BUGFIX")
print("="*60)

# TEST 1: Empty cart validation (must return 500 'Shopping cart is empty')
empty_payload = {
    "sessionKey": "empty_session_123",
    "customerName": "Jane Doe",
    "customerEmail": "jane@example.com",
    "shippingAddress": {
        "title": "Home",
        "first_name": "Jane",
        "last_name": "Doe",
        "phone": "+1 555 123 4567",
        "address_line1": "742 Evergreen Terrace",
        "city": "Los Angeles",
        "state": "CA",
        "country": "United States",
        "postal_code": "90001"
    }
}
status, data = post_checkout(empty_payload)
print(f"Test 1 - Empty Cart Validation: Status {status}, Error: {data.get('error')}")
assert status == 500, f"Expected 500, got {status}"
assert data.get("error") == "Shopping cart is empty", f"Unexpected error: {data}"
print("-> PASS: Empty cart is correctly rejected.")

# TEST 2: Valid cart with 'Women kipling bailey saddle handbag' (ID p0000000-0000-0000-0000-000000000007, Qty 1)
valid_payload = {
    "sessionKey": "user_session_456",
    "items": [
        {
            "product_id": "p0000000-0000-0000-0000-000000000007",
            "quantity": 1
        }
    ],
    "customerName": "Jane Doe",
    "customerEmail": "jane@example.com",
    "customerPhone": "+1 555 123 4567",
    "shippingAddress": {
        "title": "Home",
        "first_name": "Jane",
        "last_name": "Doe",
        "phone": "+1 555 123 4567",
        "address_line1": "742 Evergreen Terrace",
        "city": "Los Angeles",
        "state": "CA",
        "country": "United States",
        "postal_code": "90001"
    },
    "paymentMethod": "credit_card"
}
status, data = post_checkout(valid_payload)
print(f"\nTest 2 - Valid Cart Checkout: Status {status}, Success: {data.get('success')}")
assert status == 200, f"Expected 200, got {status}: {data}"
order = data.get("order")
assert order is not None, "Order is missing"
print(f"   Order ID: {order['id']}")
print(f"   Order Number: {order['order_number']}")
print(f"   Subtotal: ${order['subtotal']} (Expected: $59.0)")
print(f"   Shipping Fee: ${order['shipping_fee']} (Expected: $15.0)")
print(f"   Total: ${order['total']} (Expected: $74.0)")
print(f"   Items Count: {len(order['items'])}")
assert order['subtotal'] == 59.0, f"Subtotal mismatch: {order['subtotal']}"
assert order['shipping_fee'] == 15.0, f"Shipping mismatch: {order['shipping_fee']}"
assert order['total'] == 74.0, f"Total mismatch: {order['total']}"
assert len(order['items']) == 1, "Expected 1 item"
print("-> PASS: Order created with exact $74 total and correct item snapshot.")

# TEST 3: Sync Cart endpoint test
req = urllib.request.Request(
    f"{BASE_URL}/api/cart",
    data=json.dumps({
        "sessionKey": "sync_session_789",
        "items": [{"product_id": "p0000000-0000-0000-0000-000000000007", "quantity": 2}]
    }).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    sync_data = json.loads(resp.read().decode("utf-8"))
print(f"\nTest 3 - /api/cart Sync: Success {sync_data.get('success')}, Subtotal: ${sync_data['cart']['subtotal']}")
assert sync_data['cart']['subtotal'] == 118.0, "Subtotal should be $118"
print("-> PASS: Server cart sync endpoint works properly.")

print("\nALL CHECKOUT TESTS PASSED!")
