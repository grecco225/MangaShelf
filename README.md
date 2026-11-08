# MangaShelf v2 — Organizador y Lector Digital PWA (Android & Web)

Aplicación web progresiva (**PWA**) de código abierto para organizar una biblioteca personal y leer cómics, manga y libros digitales desde el navegador o instalada en teléfonos **Android**.

* **100% Gratuita y Privada:** No utiliza servicios de pago, no requiere cuentas obligatorias, no expone claves secretas y no sube los archivos del usuario a ningún servidor.
* **Formatos Locales Soportados:** `.CBZ`, `.ZIP`, `.EPUB`, `.PDF` e imágenes sueltas (`.JPG`, `.PNG`, `.WEBP`, `.SVG`), procesados en el navegador mediante `DecompressionStream` y persistidos en **IndexedDB**.
* **Fuentes Legales y Dominio Público:** Conecta con las APIs públicas gratuitas de **Internet Archive (`archive.org`)** y **Project Gutenberg (`gutendex.com`)**, manteniendo siempre operativo el catálogo local si no hay conexión.

---

## Ejecución Local

```powershell
cd C:\Users\TOSHIBA\MangaShelf
python server.py 8080
```

Abre en tu navegador: `http://localhost:8080`

---

## Despliegue Gratuito en Producción (HTTPS incluido)

Como **MangaShelf** es una PWA estática sin dependencias de backend de pago, puedes desplegarla gratis con **HTTPS automático** en cualquiera de estas plataformas:

1. **Cloudflare Pages (Recomendada — Ancho de banda gratuito ilimitado, sin suspensión por inactividad):**
   * Sube esta carpeta a un repositorio de GitHub o ejecuta `npx wrangler pages deploy . --project-name mangashelf`.
   * Lee automáticamente el archivo `_headers` con la política de seguridad (`Content-Security-Policy`, `X-Content-Type-Options`, etc.).
2. **GitHub Pages (100% gratis, sin tarjeta de crédito ni suspensión):**
   * En tu repositorio de GitHub ve a **Settings → Pages → Deploy from a branch (`main`)**.
3. **Vercel (Plan Hobby gratuito):**
   * Lee automáticamente `vercel.json` con los encabezados de seguridad. Límite gratuito: 100 GB/mes de transferencia para uso personal no comercial.
4. **Netlify (Plan Starter gratuito):**
   * Lee `_headers`. Límite gratuito: 100 GB/mes (si se supera la cuota gratuita en el plan libre, el sitio se pausa hasta el mes siguiente sin cobrarte si no añades método de pago).
