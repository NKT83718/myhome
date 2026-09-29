#!/usr/bin/env python3
"""Smoke-test the mandatory DATA-API.yaml checks against a running API."""
import os, sys, requests

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000").rstrip("/")
failures = []

def check(name, method, path, **kwargs):
    url = BASE_URL + path
    r = requests.request(method, url, timeout=15, **kwargs)
    if r.status_code != 200:
        failures.append(f"{name}: expected 200, got {r.status_code}: {r.text[:300]}")
        return None
    return r

# Reset first for reproducibility.
check("reset", "POST", "/api/reset")
r = check("bill-read", "GET", "/api/bill")
if r:
    data = r.json()
    for key in ("period","account","address","paid","items","total_sum"):
        if key not in data: failures.append(f"bill-read: missing {key}")

r = check("bill-item-create", "POST", "/api/bill/items", json={
    "name":"Полив придомовой территории","item_type":"fixed","unit":"м³","tariff":44.5,"quantity":2.0
})
if r and not {"items","total_sum"} <= r.json().keys():
    failures.append("bill-item-create: missing items/total_sum")

r = check("bill-pay", "POST", "/api/bill/pay")
if r:
    data=r.json()
    for key in ("paid","receipt_label","total_sum"):
        if key not in data: failures.append(f"bill-pay: missing {key}")

for name,path,expected in [
    ("house-read","/api/house",("address","systems","waste")),
]:
    r=check(name,"GET",path)
    if r:
        data=r.json()
        for key in expected:
            if key not in data: failures.append(f"{name}: missing {key}")

check("requests-read","GET","/api/requests")
check("chat-read","GET","/api/chat")
r=check("chat-create","POST","/api/chat",json={"author":"Вы (кв. 8)","text":"Подтверждаю проверку вентиляции."})
if r and not {"id","created_at","author","text"} <= r.json().keys():
    failures.append("chat-create: missing required fields")

r=check("polls-read","GET","/api/polls",params={"user_id":"flat_8"})
r=check("poll-vote","POST","/api/polls/2/vote",json={"user_id":"flat_8","option_id":1})

if failures:
    print("FAIL")
    print("\n".join(failures))
    sys.exit(1)
print(f"OK: mandatory API checks passed against {BASE_URL}")
