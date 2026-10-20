#!/usr/bin/env python3
"""Fail closed before building a Realgram Android release with background calling.

The release must have a live authenticated API and an actual WebSocket
upgrade endpoint. Successful live ringing on two devices is separately required
through the release workflow's explicit manual verification gate.
"""
import http.client
import json
import os
import ssl
import sys
import urllib.parse
import urllib.request

HOST = "api.realgram.no"
TIMEOUT = 9


def verify_mobile_api():
    token = os.environ.get("REALGRAM_MOBILE_API_TOKEN", "realgram-mobile-diag-v1")
    query = urllib.parse.urlencode({"mobile": "1", "action": "remote-config", "_token": token})
    request = urllib.request.Request(
        f"https://{HOST}/api.php?{query}",
        headers={"Cache-Control": "no-cache"},
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        result = json.load(response)
    if result.get("ok") is not True:
        raise RuntimeError("Realgram mobile API rejects the version used by the Android app")
    print("PASS: Realgram mobile API accepts the Android client")


def verify_websocket_upgrade():
    # This tests an actual HTTP/1.1 WebSocket upgrade over port 443.
    # A normal 200/404 (or TLS error) means background call signaling is broken.
    connection = http.client.HTTPSConnection(HOST, port=443, timeout=TIMEOUT,
                                             context=ssl.create_default_context())
    try:
        connection.request("GET", "/ws/call", headers={
            "Host": HOST,
            "Upgrade": "websocket",
            "Connection": "Upgrade",
            "Sec-WebSocket-Version": "13",
            "Sec-WebSocket-Key": "MDEyMzQ1Njc4OWFiY2RlZg==",
        })
        response = connection.getresponse()
        if response.status != 101:
            raise RuntimeError(f"Realgram calling relay did not upgrade: HTTP {response.status}")
        print("PASS: secure WebSocket signaling route upgrades on port 443")
    finally:
        connection.close()


if __name__ == "__main__":
    try:
        verify_mobile_api()
        verify_websocket_upgrade()
    except Exception as exc:
        print(f"::error::Background call release check failed: {exc}", file=sys.stderr)
        sys.exit(1)
