"""Exercise the real PHP HTTP boundary on loopback with disposable storage."""
import json
import os
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

with tempfile.TemporaryDirectory(prefix="realgram-room-http-") as directory:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    env = dict(os.environ, REALGRAM_ROOM_DB=str(Path(directory) / "room.sqlite"))
    process = subprocess.Popen(["php", "-S", f"127.0.0.1:{port}", "-t", str(Path(__file__).parent)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = f"http://127.0.0.1:{port}/room.php?action="
    def request(action, body=None, token="", method=None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer " + token
        req = urllib.request.Request(base + action, data=None if body is None else json.dumps(body).encode(), headers=headers, method=method or ("GET" if body is None else "POST"))
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                data = response.read()
                return response.status, response.headers, json.loads(data) if data else None
        except urllib.error.HTTPError as error:
            return error.code, error.headers, json.loads(error.read())
    try:
        for _ in range(40):
            try:
                with socket.create_connection(("127.0.0.1", port), timeout=.2):
                    break
            except OSError:
                time.sleep(.05)
        status, headers, _ = request("messages", method="OPTIONS")
        assert status == 204 and headers["Access-Control-Allow-Origin"] == "*"
        assert request("messages")[0] == 401
        alice = request("join", {"name": "HTTP Alice"})[2]
        bob = request("join", {"name": "HTTP Bob"})[2]
        assert alice["ok"] and bob["ok"]
        result = request("send", {"body": "Loopback-only message", "client_id": "http_message_001"}, alice["token"])
        assert result[0] == 200
        seen = request("messages", token=bob["token"])
        assert len(seen[2]["messages"]) == 1 and not seen[2]["messages"][0]["mine"]
        assert "no-store" in seen[1]["Cache-Control"]
        assert request("delete", {"message_id": result[2]["messages"][0]["id"]}, bob["token"])[0] == 403
        assert request("send", {"body": "x" * 9000, "client_id": "http_message_002"}, alice["token"])[0] == 413
        print("Live Lounge HTTP: preflight, authorization, two-client delivery, ownership, size and cache checks passed")
    finally:
        process.terminate()
        process.wait(timeout=5)
