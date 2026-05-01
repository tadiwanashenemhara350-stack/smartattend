import urllib.request
import urllib.error
import json
import time

url_init = "https://smartattend-4mau.onrender.com/auth/init"
url_debug = "https://smartattend-4mau.onrender.com/debug-500"

payload = json.dumps({
    "email": "tadiwanashenemhara350@gmail.com",
    "password": "tadiwa0627",
    "full_name": "Tadiwa Nemhara"
}).encode('utf-8')

headers = {'Content-Type': 'application/json'}

def try_initialize():
    for _ in range(60):
        print("Checking debug endpoint...")
        try:
            req_debug = urllib.request.Request(url_debug)
            res_debug = urllib.request.urlopen(req_debug)
            data = res_debug.read().decode()
            if "{" in data and "status" in data:
                print("Server is updated! Debug response:", data)
                # Now try initializing
                print("Initializing admin...")
                req = urllib.request.Request(url_init, data=payload, headers=headers)
                try:
                    res = urllib.request.urlopen(req)
                    print("Initialization successful:", res.read().decode())
                    return True
                except urllib.error.HTTPError as e:
                    print(f"Init Error {e.code}: {e.read().decode()}")
                    return False
        except Exception:
            pass
        
        print("Still building on Render, waiting 10s...")
        time.sleep(10)
    print("Timeout waiting for Render.")

try_initialize()
