#!/usr/bin/env python3
"""
Servidor HTTP local para MangaShelf PWA v3 (Edición MangaDex + Bootstrap UX).
Configura tipos MIME para .webmanifest, .cbz, .epub y módulos ES6,
inyecta encabezados de seguridad y provee un proxy transparente para la API oficial
de MangaDex (api.mangadex.org, portadas uploads.mangadex.org y servidor de páginas At-Home)
evitando bloqueos de CORS o hotlinking en el navegador.
"""

import http.server
import json
import socket
import socketserver
import sys
import urllib.error
import urllib.parse
import urllib.request

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
USER_AGENT = 'MangaShelf-PWA/3.0 (https://github.com/grecco225/MangaShelf)'


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
        self.send_header('Cache-Control', 'no-cache')
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

        # 1. Proxy JSON oficial para https://api.mangadex.org/...
        if parsed.path.startswith('/api/mangadex/'):
            subpath = parsed.path[len('/api/mangadex/'):]
            target_url = f'https://api.mangadex.org/{subpath}'
            if parsed.query:
                target_url += f'?{parsed.query}'
            return self._proxy_request(target_url, default_content_type='application/json; charset=utf-8')

        # 2. Proxy de portadas oficiales https://uploads.mangadex.org/covers/...
        if parsed.path.startswith('/api/mangadex-cover/'):
            subpath = parsed.path[len('/api/mangadex-cover/'):]
            target_url = f'https://uploads.mangadex.org/covers/{subpath}'
            return self._proxy_request(target_url, default_content_type='image/jpeg', cache_max_age=86400)

        # 3. Proxy de páginas de capítulos MangaDex At-Home
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
            return self._proxy_request(raw_url, default_content_type='image/jpeg', cache_max_age=86400)

        return super().do_GET()

    def _proxy_request(self, target_url, default_content_type='application/json', cache_max_age=0):
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
                self.send_response(resp.status)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(len(body)))
                if cache_max_age > 0:
                    self.send_header('Cache-Control', f'public, max-age={cache_max_age}')
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
        print('  MangaShelf PWA v3 — Servidor Local + Proxy Oficial MangaDex API')
        print('=' * 68)
        print(f'  • En este PC:          http://localhost:{PORT}')
        print(f'  • En tu red Wi-Fi:     http://{lan_ip}:{PORT}')
        print(f'  • Proxy MangaDex API:  http://localhost:{PORT}/api/mangadex/manga')
        print('=' * 68)
        print('  Presiona Ctrl+C para detener el servidor.')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nServidor detenido.')
