#!/usr/bin/env python3
"""
Servidor HTTP local para MangaShelf PWA v3.5 (Minimalist Pastel Edition).
Incluye caché en memoria (TTL) para optimizar las consultas a los repositorios
remotos (MangaDex API, portadas y servidor At-Home), reduciendo la latencia y
evitando llamadas repetidas.
"""

import http.server
import json
import socket
import socketserver
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

PORT = int(sys.argv[1]) if len(sys.argv[1:]) >= 1 else 8080
USER_AGENT = 'MangaShelf-Minimal-PWA/3.5 (https://github.com/grecco225/MangaShelf)'

# Caché en memoria thread-safe para acelerar respuestas de API y portadas
_CACHE_LOCK = threading.Lock()
_RESPONSE_CACHE = {}  # url -> (expire_ts, status_code, content_type, body_bytes)
MAX_CACHE_ENTRIES = 250


def get_cached_response(url):
    now = time.time()
    with _CACHE_LOCK:
        entry = _RESPONSE_CACHE.get(url)
        if not entry:
            return None
        expire_ts, status, content_type, body = entry
        if now > expire_ts:
            del _RESPONSE_CACHE[url]
            return None
        return status, content_type, body


def set_cached_response(url, status, content_type, body, ttl_seconds=300):
    now = time.time()
    with _CACHE_LOCK:
        if len(_RESPONSE_CACHE) >= MAX_CACHE_ENTRIES:
            # Eliminar la entrada más antigua
            oldest_key = next(iter(_RESPONSE_CACHE))
            del _RESPONSE_CACHE[oldest_key]
        _RESPONSE_CACHE[url] = (now + ttl_seconds, status, content_type, body)


class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


class MangaShelfHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.webmanifest': 'application/manifest+json; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.cbz': 'application/vnd.comicbook+zip',
        '.epub': 'application/epub+zip',
        '.html': 'text/html; charset=utf-8',
    }

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=()'
        )
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        # 1. Proxy optimizado con caché para https://api.mangadex.org/...
        if parsed.path.startswith('/api/mangadex/'):
            subpath = parsed.path[len('/api/mangadex/'):]
            target_url = f'https://api.mangadex.org/{subpath}'
            if parsed.query:
                target_url += f'?{parsed.query}'
            return self._proxy_request(
                target_url,
                default_content_type='application/json; charset=utf-8',
                cache_ttl=180
            )

        # 2. Proxy optimizado con caché para portadas https://uploads.mangadex.org/covers/...
        if parsed.path.startswith('/api/mangadex-cover/'):
            subpath = parsed.path[len('/api/mangadex-cover/'):]
            target_url = f'https://uploads.mangadex.org/covers/{subpath}'
            return self._proxy_request(
                target_url,
                default_content_type='image/jpeg',
                cache_ttl=3600
            )

        # 3. Proxy optimizado para páginas de capítulos MangaDex At-Home
        if parsed.path == '/api/mangadex-page':
            qs = urllib.parse.parse_qs(parsed.query)
            raw_url = qs.get('url', [''])[0]
            if not raw_url or not (
                raw_url.startswith('https://') and (
                    'mangadex.org' in raw_url or 'mangadex.network' in raw_url
                )
            ):
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid MangaDex image URL"}')
                return
            return self._proxy_request(
                raw_url,
                default_content_type='image/jpeg',
                cache_ttl=1800
            )

        return super().do_GET()

    def _proxy_request(self, target_url, default_content_type='application/json', cache_ttl=180):
        cached = get_cached_response(target_url)
        if cached is not None:
            status, content_type, body = cached
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('X-Cache', 'HIT')
            self.send_header('Cache-Control', f'public, max-age={cache_ttl}')
            self.end_headers()
            self.wfile.write(body)
            return

        req = urllib.request.Request(
            target_url,
            headers={
                'User-Agent': USER_AGENT,
                'Accept': '*/*',
            },
            method='GET'
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                body = resp.read()
                content_type = resp.headers.get('Content-Type', default_content_type)
                if resp.status == 200 and cache_ttl > 0:
                    set_cached_response(target_url, resp.status, content_type, body, cache_ttl)
                self.send_response(resp.status)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(len(body)))
                self.send_header('X-Cache', 'MISS')
                if cache_ttl > 0:
                    self.send_header('Cache-Control', f'public, max-age={cache_ttl}')
                self.end_headers()
                self.wfile.write(body)
        except urllib.error.HTTPError as e:
            err_body = e.read() if e.fp else b'{}'
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(err_body or json.dumps({'error': str(e)}).encode('utf-8'))
        except Exception as e:
            payload = json.dumps({'result': 'error', 'message': str(e)}).encode('utf-8')
            self.send_response(502)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)


def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


if __name__ == '__main__':
    lan_ip = get_lan_ip()
    with ThreadingHTTPServer(('0.0.0.0', PORT), MangaShelfHandler) as httpd:
        print('=' * 68)
        print('  MangaShelf v3.5 — Minimalist Pastel Edition + API Cache')
        print('=' * 68)
        print(f'  • En este PC:          http://localhost:{PORT}')
        print(f'  • En tu red Wi-Fi:     http://{lan_ip}:{PORT}')
        print('=' * 68)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nServidor detenido.')
