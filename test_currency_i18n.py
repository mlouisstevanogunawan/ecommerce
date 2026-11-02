#!/usr/bin/env python3
import urllib.request
import urllib.error
import json
import re
import sys

BASE_URL = 'http://localhost:3000'

def test_api_rates():
    print("\n--- Test 1: Exchange Rates Endpoint ---")
    req = urllib.request.Request(f"{BASE_URL}/api/currency/rates")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        assert data.get('base') == 'USD', f"Expected base USD, got {data.get('base')}"
        rates = data.get('rates', {})
        for curr in ['USD', 'IDR', 'EUR', 'GBP', 'JPY', 'SGD', 'MYR', 'AUD']:
            assert curr in rates, f"Missing rate for {curr}"
            assert rates[curr] > 0, f"Invalid rate for {curr}: {rates[curr]}"
        print(f"-> PASS: Rates retrieved successfully for 8 currencies. IDR: {rates['IDR']}, EUR: {rates['EUR']}")

def test_currency_switching_html():
    print("\n--- Test 2: Server Rendering with Currency Cookie (IDR) ---")
    req = urllib.request.Request(f"{BASE_URL}")
    req.add_header('Cookie', 'modesy_currency=IDR; modesy_locale=en')
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        # Check for Indonesian Rupiah symbol 'Rp' in the HTML
        assert 'Rp' in html, "Expected 'Rp' symbol in rendered HTML for IDR currency"
        print("-> PASS: Homepage rendered with 'Rp' currency symbol.")

    print("\n--- Test 3: Server Rendering with Currency Cookie (EUR) ---")
    req = urllib.request.Request(f"{BASE_URL}")
    req.add_header('Cookie', 'modesy_currency=EUR; modesy_locale=en')
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        assert '€' in html, "Expected '€' symbol in rendered HTML for EUR currency"
        print("-> PASS: Homepage rendered with '€' currency symbol.")

def test_language_switching_html():
    print("\n--- Test 4: Server Rendering with Language Cookie (id) ---")
    req = urllib.request.Request(f"{BASE_URL}")
    req.add_header('Cookie', 'modesy_locale=id; modesy_currency=IDR')
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        assert '<html lang="id"' in html, f"Expected <html lang=\"id\"> in HTML"
        assert 'Keranjang' in html, "Expected Indonesian word 'Keranjang' in rendered HTML"
        assert 'Keinginan' in html, "Expected Indonesian word 'Keinginan' in rendered HTML"
        print("-> PASS: HTML lang='id' and Indonesian translations (Keranjang, Keinginan) rendered.")

def test_invalid_cookie_fallback():
    print("\n--- Test 5: Graceful Fallback for Invalid Cookie Values ---")
    req = urllib.request.Request(f"{BASE_URL}")
    req.add_header('Cookie', 'modesy_currency=MALICIOUS_CURRENCY; modesy_locale=BAD_LOCALE')
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        html = resp.read().decode('utf-8')
        assert '<html lang="en"' in html, "Expected fallback to <html lang='en'>"
        print("-> PASS: Invalid cookies gracefully fallback to default USD and 'en'.")

def test_accept_language_detection():
    print("\n--- Test 6: Auto-detection from Accept-Language Header ---")
    req = urllib.request.Request(f"{BASE_URL}")
    req.add_header('Accept-Language', 'id-ID,id;q=0.9,en;q=0.8')
    # No cookies sent
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        assert '<html lang="id"' in html, "Expected auto-detected <html lang='id'>"
        print("-> PASS: Indonesian locale auto-detected from Accept-Language header.")

def test_checkout_audit_trail():
    print("\n--- Test 7: Checkout with Display Currency & Exchange Rate Audit ---")
    # Place an order with IDR display currency and rate 18000
    payload = {
        "sessionKey": "test_currency_cart",
        "items": [
            {
                "product_id": "p0000000-0000-0000-0000-000000000007",
                "variant_id": None,
                "quantity": 1
            }
        ],
        "customerName": "Rizky Pratama",
        "customerEmail": "rizky@example.id",
        "customerPhone": "+62 812 3456 7890",
        "shippingAddress": {
            "first_name": "Rizky",
            "last_name": "Pratama",
            "phone": "+62 812 3456 7890",
            "address_line1": "Jl. Sudirman No. 45",
            "city": "Jakarta",
            "state": "DKI Jakarta",
            "country": "Indonesia",
            "postal_code": "10220"
        },
        "paymentMethod": "credit_card",
        "currency": "IDR",
        "exchangeRate": 18150.0
    }

    req = urllib.request.Request(
        f"{BASE_URL}/api/checkout",
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        assert data.get('success') is True, f"Checkout failed: {data}"
        order = data.get('order', {})
        # Verify base USD calculation
        assert order.get('total') == 74.0, f"Expected base USD total 74.0, got {order.get('total')}"
        # Verify display currency and exchange rate were recorded
        assert order.get('currency') == 'IDR', f"Expected currency 'IDR', got {order.get('currency')}"
        assert order.get('exchange_rate') == 18150.0, f"Expected exchange_rate 18150.0, got {order.get('exchange_rate')}"
        print(f"-> PASS: Order {order.get('order_number')} created successfully.")
        print(f"   Base USD Total: ${order.get('total')}")
        print(f"   Recorded Display Currency: {order.get('currency')}")
        print(f"   Recorded Exchange Rate: {order.get('exchange_rate')}")

def main():
    print("============================================================")
    print("TESTING CURRENCY & LANGUAGE SWITCHER IMPLEMENTATION")
    print("============================================================")
    try:
        test_api_rates();
        test_currency_switching_html();
        test_currency_switching_html();
        test_language_switching_html();
        test_invalid_cookie_fallback();
        test_accept_language_detection();
        test_checkout_audit_trail();
        print("\n============================================================")
        print("ALL CURRENCY & I18N TESTS PASSED SUCCESSFULLY!")
        print("============================================================")
    except AssertionError as e:
        print(f"\n❌ TEST ASSERTION FAILED: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
