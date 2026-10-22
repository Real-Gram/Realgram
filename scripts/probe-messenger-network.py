#!/usr/bin/env python3
"""Read-only, unauthenticated TLS/HTTPS/WSS checks for Realgram-owned endpoints.
Run on the network being investigated with VPN off. Does not test a media call.
"""
import argparse
import base64
import concurrent.futures
import hashlib
import json
import os
import socket
import ssl
import time
from datetime import datetime, timezone

HOSTS = ('api.realgram.no', 'realgram.no')


def probe(host, family, sockaddr, websocket, timeout):
    started = time.monotonic()
    result = {'host': host, 'family': 'IPv6' if family == socket.AF_INET6 else 'IPv4',
              'check': 'wss_upgrade' if websocket else 'https'}
    try:
        with socket.socket(family, socket.SOCK_STREAM) as raw:
            raw.settimeout(timeout)
            raw.connect(sockaddr)
            with ssl.create_default_context().wrap_socket(raw, server_hostname=host) as tls:
                result['tls'] = tls.version()
                key = base64.b64encode(os.urandom(16)).decode()
                path = '/ws/call' if websocket else ('/api.php' if host == 'api.realgram.no' else '/')
                headers = (f'GET {path} HTTP/1.1\r\nHost: {host}\r\n'
                           'User-Agent: Realgram-Connectivity-Probe/1\r\n')
                if websocket:
                    headers += ('Connection: Upgrade\r\nUpgrade: websocket\r\n'
                                f'Sec-WebSocket-Version: 13\r\nSec-WebSocket-Key: {key}\r\n')
                else:
                    headers += 'Connection: close\r\n'
                tls.sendall((headers + '\r\n').encode())
                data = b''
                while b'\r\n\r\n' not in data and len(data) < 16384:
                    chunk = tls.recv(2048)
                    if not chunk:
                        break
                    data += chunk
                head = data.split(b'\r\n\r\n', 1)[0].decode('iso-8859-1')
                lines = head.split('\r\n')
                result['http_status'] = int(lines[0].split()[1])
                if websocket:
                    values = {name.lower(): value for name, value in (line.split(':', 1) for line in lines[1:] if ':' in line)}
                    expected = base64.b64encode(hashlib.sha1((key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode()
                    result['ok'] = (result['http_status'] == 101 and values.get('sec-websocket-accept', '').strip() == expected
                                    and values.get('upgrade', '').strip().lower() == 'websocket')
                else:
                    # API may reject unauthenticated requests: reachability is separate from app authorization.
                    result['ok'] = 200 <= result['http_status'] < 500
    except Exception as error:
        result.update(ok=False, error=type(error).__name__)
    result['elapsed_ms'] = round((time.monotonic() - started) * 1000)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--label', required=True, help='Non-personal network label, e.g. test-mobile-vpn-off')
    parser.add_argument('--timeout', type=float, default=6)
    args = parser.parse_args()
    if not 0 < args.timeout <= 30:
        parser.error('timeout must be greater than zero and at most 30 seconds')
    results, jobs = [], []
    for host in HOSTS:
        try:
            addresses = list(dict.fromkeys((f, addr) for f, _, _, _, addr in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)))
            # Bound the test to two addresses per family; never scan a subnet.
            for family in (socket.AF_INET, socket.AF_INET6):
                for _, addr in [a for a in addresses if a[0] == family][:2]:
                    jobs.append((host, family, addr, False, args.timeout))
                    if host == 'api.realgram.no':
                        jobs.append((host, family, addr, True, args.timeout))
        except OSError:
            results.append({'host': host, 'check': 'dns', 'ok': False, 'error': 'DNS lookup failed'})
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        results += list(executor.map(lambda task: probe(*task), jobs))
    print(json.dumps({'at': datetime.now(timezone.utc).isoformat(), 'network': args.label,
                      'scope': 'DNS/TCP/TLS/HTTPS/WSS only; no authenticated call, push or media test',
                      'results': results}, indent=2))
    return 0 if results and all(r['ok'] for r in results) else 1


if __name__ == '__main__':
    raise SystemExit(main())
