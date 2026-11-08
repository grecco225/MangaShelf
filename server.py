#!/usr/bin/env python3
"""
Servidor HTTP local para MangaShelf PWA v2.
Configura tipos MIME para .webmanifest, .cbz, .epub y módulos ES6,
e inyecta los encabezados de seguridad recomendados para producción.
"""

import http.server
import socket
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


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
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=(), payment=()'
        )
        super().end_headers()


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
    socketserver.TCPServer.allow_reuse_address = True
    lan_ip = get_lan_ip()
    with socketserver.TCPServer(('0.0.0.0', PORT), MangaShelfHandler) as httpd:
        print('=' * 64)
        print('  MangaShelf PWA v2 — Servidor Local con Cabeceras de Seguridad')
        print('=' * 64)
        print(f'  • En este PC:          http://localhost:{PORT}')
        print(f'  • En tu red Wi-Fi:     http://{lan_ip}:{PORT}')
        print('=' * 64)
        print('  Presiona Ctrl+C para detener el servidor.')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nServidor detenido.')
