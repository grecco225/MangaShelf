/**
 * MangaShelf — Validador y Extractor Nativo de Archivos Locales (ArchiveParser)
 * ---------------------------------------------------------------------------
 * Procesa archivos directamente en el navegador del usuario sin subir nada a
 * servidores externos, utilizando APIs Web estándar (`DataView`, `DecompressionStream`,
 * `DOMParser`, `FileReader`).
 *
 * FORMATOS SOPORTADOS:
 * - `.cbz` / `.zip`: Descompresión nativa ZIP (Stored y Deflate), lectura de
 *   metadatos `ComicInfo.xml` y extracción ordenada de páginas de imagen.
 * - `.epub`: Descompresión nativa del contenedor OEBPS/OPF, lectura de metadatos
 *   Dublin Core (`dc:title`, `dc:creator`) y paginación de capítulos XHTML/imágenes.
 * - `.pdf`: Validación de cabecera binaria `%PDF-`, conteo de páginas y visor
 *   integrado compatible con escritorio y móvil.
 * - Imágenes sueltas (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, `.svg`, `.avif`).
 *
 * LÍMITES DOCUMENTADOS:
 * - `.cbr` (RAR): El formato RAR tiene patente/compresión propietaria que los
 *   navegadores no descomprimen de forma nativa con `DecompressionStream`.
 *   Se detecta su firma binaria (`Rar!`) y se informa claramente al usuario.
 * - Tamaño máximo recomendado por archivo en memoria móvil: 150 MB.
 */

const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB

export class ArchiveParser {
  /**
   * Procesa una lista de objetos `File` seleccionados por el usuario y devuelve
   * un objeto de serie listo para guardarse en IndexedDB y mostrarse en la Biblioteca.
   */
  static async parseUserFiles(fileList, customTitle = '', customAuthor = '') {
    const files = Array.from(fileList || []);
    if (files.length === 0) {
      throw new Error('No se seleccionó ningún archivo.');
    }

    for (const f of files) {
      if (f.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(
          `El archivo «${f.name}» supera el límite seguro de 150 MB para memoria móvil.`
        );
      }
      if (f.size === 0) {
        throw new Error(`El archivo «${f.name}» está vacío (0 bytes).`);
      }
    }

    const firstFile = files[0];
    const ext = this._getExtension(firstFile.name);

    // 1. Detectar si es un archivo .CBR (RAR) mirando extensión o firma binaria
    const headerBytes = new Uint8Array(await firstFile.slice(0, 8).arrayBuffer());
    if (ext === 'cbr' || ext === 'rar' || this._isRarSignature(headerBytes)) {
      throw new Error(
        'Formato .CBR (RAR) detectado: El algoritmo RAR es propietario y no tiene descompresión nativa en el navegador sin módulos pesados externos. Por favor, usa archivos .CBZ (ZIP), .EPUB, .PDF o imágenes sueltas.'
      );
    }

    // 2. Si es un archivo .CBZ o .ZIP
    if (ext === 'cbz' || ext === 'zip') {
      if (!this._isZipSignature(headerBytes)) {
        throw new Error(
          `El archivo «${firstFile.name}» no tiene una cabecera ZIP/CBZ válida (PK).`
        );
      }
      return await this._parseCbzFile(firstFile, customTitle, customAuthor);
    }

    // 3. Si es un archivo .EPUB
    if (ext === 'epub') {
      if (!this._isZipSignature(headerBytes)) {
        throw new Error(
          `El archivo «${firstFile.name}» no es un contenedor EPUB válido.`
        );
      }
      return await this._parseEpubFile(firstFile, customTitle, customAuthor);
    }

    // 4. Si es un archivo .PDF
    if (ext === 'pdf' || this._isPdfSignature(headerBytes)) {
      if (!this._isPdfSignature(headerBytes)) {
        throw new Error(
          `El archivo «${firstFile.name}» no tiene una cabecera PDF válida (%PDF-).`
        );
      }
      return await this._parsePdfFile(firstFile, customTitle, customAuthor);
    }

    // 5. Si son imágenes sueltas
    const imageFiles = files.filter((f) => this._isSupportedImageName(f.name));
    if (imageFiles.length > 0) {
      return await this._parseImageFiles(imageFiles, customTitle, customAuthor);
    }

    throw new Error(
      `Formato no compatible («${firstFile.name}»). Formatos admitidos: .CBZ, .ZIP, .EPUB, .PDF e imágenes (.JPG, .PNG, .WEBP, .SVG).`
    );
  }

  // =========================================================================
  // Extractores por Formato
  // =========================================================================

  static async _parseCbzFile(file, customTitle, customAuthor) {
    const buffer = await file.arrayBuffer();
    const entries = await this._extractZipEntries(buffer);

    let xmlTitle = '';
    let xmlAuthor = '';
    let xmlSummary = '';
    let xmlGenres = ['Cómic CBZ', 'Archivo Local'];

    // Buscar ComicInfo.xml si existe dentro del CBZ
    const comicInfoEntry = entries.find(
      (e) => e.name.toLowerCase().endsWith('comicinfo.xml')
    );
    if (comicInfoEntry) {
      try {
        const xmlBytes = await this._decompressEntry(buffer, comicInfoEntry);
        const xmlText = new TextDecoder('utf-8').decode(xmlBytes);
        const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
        xmlTitle = doc.querySelector('Title')?.textContent?.trim() || '';
        xmlAuthor =
          doc.querySelector('Writer')?.textContent?.trim() ||
          doc.querySelector('Penciller')?.textContent?.trim() ||
          '';
        xmlSummary = doc.querySelector('Summary')?.textContent?.trim() || '';
        const genreText = doc.querySelector('Genre')?.textContent?.trim();
        if (genreText) {
          xmlGenres = genreText
            .split(',')
            .map((g) => g.trim())
            .filter(Boolean);
        }
      } catch (e) {
        console.warn('No se pudo leer ComicInfo.xml:', e);
      }
    }

    const imageEntries = entries
      .filter((e) => !e.isDirectory && this._isSupportedImageName(e.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (imageEntries.length === 0) {
      throw new Error(
        `El archivo CBZ «${file.name}» no contiene páginas de imagen compatibles (.jpg, .png, .webp, .svg).`
      );
    }

    const pageDataUrls = [];
    for (const entry of imageEntries) {
      const rawBytes = await this._decompressEntry(buffer, entry);
      const mime = this._getImageMime(entry.name);
      const dataUrl = await this._uint8ArrayToDataUrl(rawBytes, mime);
      pageDataUrls.push(dataUrl);
    }

    const finalTitle =
      customTitle || xmlTitle || file.name.replace(/\.(cbz|zip)$/i, '');
    const finalAuthor = customAuthor || xmlAuthor || 'Importado desde CBZ';
    const seriesId = `cbz-${Date.now()}`;
    const chapterId = `${seriesId}-cap-1`;

    return {
      id: seriesId,
      title: finalTitle,
      author: finalAuthor,
      status: 'Completado',
      genres: xmlGenres,
      tags: ['CBZ', 'Local'],
      releaseYear: new Date().getFullYear(),
      isDemo: false,
      isLocalFile: true,
      fileFormat: 'CBZ',
      sourceId: 'user-local-files',
      sourceName: 'Archivo Local (.CBZ)',
      coverUrl: pageDataUrls[0],
      synopsis:
        xmlSummary ||
        `Archivo .CBZ («${file.name}») descomprimido y validado localmente con ${pageDataUrls.length} páginas.`,
      chaptersCount: 1,
      chapters: [
        {
          id: chapterId,
          number: 1,
          title: finalTitle,
          releaseDate: new Date().toISOString().slice(0, 10),
          pagesCount: pageDataUrls.length,
          summary: `${pageDataUrls.length} páginas extraídas de ${file.name}`,
          storedPages: pageDataUrls
        }
      ]
    };
  }

  static async _parseEpubFile(file, customTitle, customAuthor) {
    const buffer = await file.arrayBuffer();
    const entries = await this._extractZipEntries(buffer);

    const findEntry = (pathSuffix) =>
      entries.find(
        (e) => e.name.toLowerCase().replace(/\\/g, '/') === pathSuffix.toLowerCase()
      ) ||
      entries.find((e) =>
        e.name.toLowerCase().replace(/\\/g, '/').endsWith(pathSuffix.toLowerCase())
      );

    let title = customTitle || file.name.replace(/\.epub$/i, '');
    let author = customAuthor || 'Autor EPUB';
    let description = `Libro digital .EPUB («${file.name}») procesado localmente en el navegador.`;

    // Intentar leer META-INF/container.xml y el archivo .opf
    let opfEntry = entries.find((e) => e.name.toLowerCase().endsWith('.opf'));
    const containerEntry = findEntry('META-INF/container.xml');
    if (containerEntry) {
      try {
        const xmlBytes = await this._decompressEntry(buffer, containerEntry);
        const xml = new TextDecoder('utf-8').decode(xmlBytes);
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        const fullPath = doc.querySelector('rootfile')?.getAttribute('full-path');
        if (fullPath) {
          const found = findEntry(fullPath);
          if (found) opfEntry = found;
        }
      } catch {
        // Continuar con opfEntry detectado por extensión
      }
    }

    const orderedTextPages = [];
    if (opfEntry) {
      try {
        const opfBytes = await this._decompressEntry(buffer, opfEntry);
        const opfXml = new TextDecoder('utf-8').decode(opfBytes);
        const opfDoc = new DOMParser().parseFromString(opfXml, 'application/xml');

        const dcTitle =
          opfDoc.getElementsByTagNameNS('*', 'title')[0]?.textContent?.trim() ||
          opfDoc.querySelector('title')?.textContent?.trim();
        const dcCreator =
          opfDoc.getElementsByTagNameNS('*', 'creator')[0]?.textContent?.trim() ||
          opfDoc.querySelector('creator')?.textContent?.trim();
        const dcDesc =
          opfDoc.getElementsByTagNameNS('*', 'description')[0]?.textContent?.trim() ||
          opfDoc.querySelector('description')?.textContent?.trim();

        if (!customTitle && dcTitle) title = dcTitle;
        if (!customAuthor && dcCreator) author = dcCreator;
        if (dcDesc) description = dcDesc;

        // Extraer orden del spine
        const manifestMap = new Map();
        Array.from(opfDoc.querySelectorAll('manifest > item')).forEach((item) => {
          const id = item.getAttribute('id');
          const href = item.getAttribute('href');
          if (id && href) manifestMap.set(id, href);
        });

        const spineRefs = Array.from(opfDoc.querySelectorAll('spine > itemref'))
          .map((ref) => manifestMap.get(ref.getAttribute('idref')))
          .filter(Boolean);

        for (const href of spineRefs) {
          const cleanHref = decodeURIComponent(href.split('#')[0]);
          const xhtmlEntry = findEntry(cleanHref);
          if (xhtmlEntry) {
            const xhtmlBytes = await this._decompressEntry(buffer, xhtmlEntry);
            const xhtmlStr = new TextDecoder('utf-8').decode(xhtmlBytes);
            orderedTextPages.push(this._extractReadableTextFromXhtml(xhtmlStr));
          }
        }
      } catch (e) {
        console.warn('Aviso al procesar OPF del EPUB:', e);
      }
    }

    // También buscar si el EPUB contiene imágenes (ej. manga en EPUB)
    const imageEntries = entries
      .filter((e) => !e.isDirectory && this._isSupportedImageName(e.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const renderedPages = [];
    for (const imgEntry of imageEntries.slice(0, 40)) {
      const bytes = await this._decompressEntry(buffer, imgEntry);
      const mime = this._getImageMime(imgEntry.name);
      renderedPages.push(await this._uint8ArrayToDataUrl(bytes, mime));
    }

    // Convertir los capítulos XHTML del EPUB en láminas SVG de alta legibilidad
    if (orderedTextPages.length === 0) {
      const fallbackXhtml = entries.filter((e) =>
        /\.(xhtml|html|htm)$/i.test(e.name)
      );
      for (const fEntry of fallbackXhtml.slice(0, 25)) {
        const bytes = await this._decompressEntry(buffer, fEntry);
        const text = new TextDecoder('utf-8').decode(bytes);
        orderedTextPages.push(this._extractReadableTextFromXhtml(text));
      }
    }

    orderedTextPages.forEach((sec, idx) => {
      if (sec.heading || sec.paragraphs.length > 0) {
        renderedPages.push(
          this._renderEpubSectionToSvgDataUrl(
            title,
            author,
            sec.heading || `Sección ${idx + 1}`,
            sec.paragraphs,
            idx + 1,
            orderedTextPages.length
          )
        );
      }
    });

    if (renderedPages.length === 0) {
      throw new Error(
        `No se encontraron páginas o capítulos legibles dentro del archivo EPUB «${file.name}».`
      );
    }

    const coverUrl = this._renderEpubCoverSvg(title, author);
    const seriesId = `epub-${Date.now()}`;
    const chapterId = `${seriesId}-cap-1`;

    return {
      id: seriesId,
      title,
      author,
      status: 'Completado',
      genres: ['Libro EPUB', 'Archivo Local'],
      tags: ['EPUB', 'Local'],
      releaseYear: new Date().getFullYear(),
      isDemo: false,
      isLocalFile: true,
      fileFormat: 'EPUB',
      sourceId: 'user-local-files',
      sourceName: 'Archivo Local (.EPUB)',
      coverUrl,
      synopsis: description,
      chaptersCount: 1,
      chapters: [
        {
          id: chapterId,
          number: 1,
          title: `${title} (Edición EPUB)`,
          releaseDate: new Date().toISOString().slice(0, 10),
          pagesCount: renderedPages.length,
          summary: `${renderedPages.length} láminas extraídas de ${file.name}`,
          storedPages: renderedPages
        }
      ]
    };
  }

  static async _parsePdfFile(file, customTitle, customAuthor) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const pdfDataUrl = await this._uint8ArrayToDataUrl(bytes, 'application/pdf');

    // Estimar número de páginas buscando '/Type /Page' (sin '/Pages')
    const rawLatin = new TextDecoder('latin1').decode(
      bytes.subarray(0, Math.min(bytes.length, 2 * 1024 * 1024))
    );
    const matches = rawLatin.match(/\/Type\s*\/Page\b/g);
    const estimatedPages = Math.max(1, matches ? matches.length : 1);

    const title = customTitle || file.name.replace(/\.pdf$/i, '');
    const author = customAuthor || 'Documento PDF Local';
    const coverUrl = this._renderEpubCoverSvg(title, `${author} • PDF`);
    const seriesId = `pdf-${Date.now()}`;
    const chapterId = `${seriesId}-cap-1`;

    // Crear lámina informativa + enlace embebido al visor PDF
    const infoPageSvg = this._renderEpubSectionToSvgDataUrl(
      title,
      author,
      `Documento PDF Validado (${(file.size / 1024).toFixed(1)} KB)`,
      [
        `Archivo: ${file.name}`,
        `Páginas detectadas: ~${estimatedPages}`,
        'El documento PDF se ha guardado localmente en IndexedDB.',
        'Puedes visualizarlo directamente con el visor PDF integrado en la parte superior del lector.'
      ],
      1,
      1
    );

    return {
      id: seriesId,
      title,
      author,
      status: 'Completado',
      genres: ['Documento PDF', 'Archivo Local'],
      tags: ['PDF', 'Local'],
      releaseYear: new Date().getFullYear(),
      isDemo: false,
      isLocalFile: true,
      fileFormat: 'PDF',
      pdfDataUrl,
      sourceId: 'user-local-files',
      sourceName: 'Archivo Local (.PDF)',
      coverUrl,
      synopsis: `Documento PDF («${file.name}») almacenado localmente en tu dispositivo para consulta offline.`,
      chaptersCount: 1,
      chapters: [
        {
          id: chapterId,
          number: 1,
          title: `${title} (PDF)`,
          releaseDate: new Date().toISOString().slice(0, 10),
          pagesCount: 1,
          summary: `Documento PDF (${estimatedPages} págs. aprox.)`,
          storedPages: [infoPageSvg],
          pdfDataUrl
        }
      ]
    };
  }

  static async _parseImageFiles(imageFiles, customTitle, customAuthor) {
    const sorted = [...imageFiles].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );

    const pageDataUrls = [];
    for (const imgFile of sorted) {
      const buf = await imgFile.arrayBuffer();
      const mime = imgFile.type || this._getImageMime(imgFile.name);
      pageDataUrls.push(await this._uint8ArrayToDataUrl(new Uint8Array(buf), mime));
    }

    const title = customTitle || 'Colección de Imágenes Locales';
    const author = customAuthor || 'Archivos del Usuario';
    const seriesId = `imgs-${Date.now()}`;
    const chapterId = `${seriesId}-cap-1`;

    return {
      id: seriesId,
      title,
      author,
      status: 'En curso',
      genres: ['Imágenes Locales', 'Personal'],
      tags: ['Imágenes', 'Local'],
      releaseYear: new Date().getFullYear(),
      isDemo: false,
      isLocalFile: true,
      fileFormat: 'IMAGES',
      sourceId: 'user-local-files',
      sourceName: 'Imágenes del Dispositivo',
      coverUrl: pageDataUrls[0],
      synopsis: `Capítulo creado a partir de ${pageDataUrls.length} imágenes seleccionadas desde tu dispositivo y guardadas en IndexedDB.`,
      chaptersCount: 1,
      chapters: [
        {
          id: chapterId,
          number: 1,
          title: 'Capítulo Importado',
          releaseDate: new Date().toISOString().slice(0, 10),
          pagesCount: pageDataUrls.length,
          summary: `${pageDataUrls.length} páginas de imagen locales.`,
          storedPages: pageDataUrls
        }
      ]
    };
  }

  // =========================================================================
  // Descompresor Nativo ZIP (Central Directory + DecompressionStream)
  // =========================================================================

  static async _extractZipEntries(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);

    // Buscar End of Central Directory (EOCD: 0x06054b50) desde el final
    let eocdOffset = -1;
    const minOffset = Math.max(0, bytes.length - 65557);
    for (let i = bytes.length - 22; i >= minOffset; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      throw new Error('No se encontró el directorio central ZIP en el archivo.');
    }

    const totalEntries = view.getUint16(eocdOffset + 10, true);
    const centralDirOffset = view.getUint32(eocdOffset + 16, true);

    const entries = [];
    let ptr = centralDirOffset;
    const decoder = new TextDecoder('utf-8');

    for (let i = 0; i < totalEntries && ptr < eocdOffset; i++) {
      const sig = view.getUint32(ptr, true);
      if (sig !== 0x02014b50) break;

      const compressionMethod = view.getUint16(ptr + 10, true);
      const compressedSize = view.getUint32(ptr + 20, true);
      const uncompressedSize = view.getUint32(ptr + 24, true);
      const fileNameLen = view.getUint16(ptr + 28, true);
      const extraLen = view.getUint16(ptr + 30, true);
      const commentLen = view.getUint16(ptr + 32, true);
      const localHeaderOffset = view.getUint32(ptr + 42, true);

      const nameBytes = bytes.subarray(ptr + 46, ptr + 46 + fileNameLen);
      const name = decoder.decode(nameBytes);

      entries.push({
        name,
        isDirectory: name.endsWith('/'),
        compressionMethod,
        compressedSize,
        uncompressedSize,
        localHeaderOffset
      });

      ptr += 46 + fileNameLen + extraLen + commentLen;
    }

    return entries;
  }

  static async _decompressEntry(arrayBuffer, entry) {
    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);
    const localOffset = entry.localHeaderOffset;

    if (view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error(`Cabecera local inválida para la entrada «${entry.name}».`);
    }

    const fileNameLen = view.getUint16(localOffset + 26, true);
    const extraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + fileNameLen + extraLen;
    const compressedSlice = bytes.subarray(
      dataStart,
      dataStart + entry.compressedSize
    );

    if (entry.compressionMethod === 0) {
      // Stored (sin compresión)
      return compressedSlice;
    }

    if (entry.compressionMethod === 8) {
      // Deflate (RFC 1951) usando DecompressionStream nativo del navegador
      if (typeof DecompressionStream === 'undefined') {
        throw new Error(
          'Tu navegador no soporta DecompressionStream nativo para descomprimir archivos CBZ/EPUB.'
        );
      }
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(compressedSlice);
      writer.close();

      const response = new Response(ds.readable);
      const outBuffer = await response.arrayBuffer();
      return new Uint8Array(outBuffer);
    }

    throw new Error(
      `Método de compresión ZIP (${entry.compressionMethod}) no soportado en «${entry.name}».`
    );
  }

  // =========================================================================
  // Utilidades de Renderizado EPUB y Validación Binaria
  // =========================================================================

  static _extractReadableTextFromXhtml(xhtmlString) {
    const doc = new DOMParser().parseFromString(xhtmlString, 'text/html');
    const heading =
      doc.querySelector('h1, h2, h3, title')?.textContent?.trim() || '';
    const paragraphs = Array.from(doc.querySelectorAll('p, li, blockquote'))
      .map((el) => el.textContent.replace(/\s+/g, ' ').trim())
      .filter((t) => t.length > 0);

    if (paragraphs.length === 0 && doc.body) {
      const raw = doc.body.textContent.replace(/\s+/g, ' ').trim();
      if (raw) paragraphs.push(raw);
    }

    return { heading, paragraphs };
  }

  static _renderEpubCoverSvg(title, author) {
    const safeTitle = this._escapeXml(title.slice(0, 34));
    const safeAuthor = this._escapeXml(author.slice(0, 38));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" width="400" height="560">
      <defs>
        <linearGradient id="epubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e1b4b"/>
          <stop offset="100%" stop-color="#0f766e"/>
        </linearGradient>
      </defs>
      <rect width="400" height="560" fill="url(#epubGrad)"/>
      <rect x="22" y="22" width="356" height="516" rx="14" fill="none" stroke="#00d4aa" stroke-width="3"/>
      <circle cx="200" cy="220" r="78" fill="#0b0e14" fill-opacity="0.45" stroke="#00d4aa" stroke-width="3"/>
      <text x="200" y="230" text-anchor="middle" fill="#00d4aa" font-family="sans-serif" font-size="28" font-weight="900">BOOK</text>
      <text x="200" y="390" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="24" font-weight="800">${safeTitle}</text>
      <text x="200" y="435" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="16" font-weight="600">${safeAuthor}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  static _renderEpubSectionToSvgDataUrl(
    bookTitle,
    author,
    sectionTitle,
    paragraphs,
    pageNum,
    totalPages
  ) {
    const fullText = paragraphs.join('\n\n');
    const wrappedLines = this._wrapParagraphs(fullText, 54, 20);

    const linesSvg = wrappedLines
      .map(
        (line, idx) =>
          `<text x="72" y="${210 + idx * 40}" fill="#e2e8f0" font-family="Georgia, serif" font-size="22">${this._escapeXml(
            line
          )}</text>`
      )
      .join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1160" width="800" height="1160">
      <rect width="800" height="1160" fill="#0d121d"/>
      <rect x="32" y="28" width="736" height="1104" rx="12" fill="#131a29" stroke="#29354f" stroke-width="2"/>
      <text x="72" y="76" fill="#00d4aa" font-family="sans-serif" font-size="15" font-weight="700">${this._escapeXml(
        bookTitle.toUpperCase()
      )} • ${this._escapeXml(author)}</text>
      <line x1="72" y1="96" x2="728" y2="96" stroke="#29354f" stroke-width="2"/>
      <text x="72" y="146" fill="#ffffff" font-family="sans-serif" font-size="28" font-weight="800">${this._escapeXml(
        sectionTitle.slice(0, 44)
      )}</text>
      ${linesSvg}
      <line x1="72" y1="1060" x2="728" y2="1060" stroke="#29354f" stroke-width="1.5"/>
      <text x="72" y="1096" fill="#94a3b8" font-family="sans-serif" font-size="15">Lector MangaShelf • Contenido Importado</text>
      <text x="728" y="1096" text-anchor="end" fill="#f8fafc" font-family="sans-serif" font-size="16" font-weight="700">Lámina ${pageNum} de ${totalPages}</text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  static _wrapParagraphs(text, maxChars, maxLines) {
    const paragraphs = String(text || '').split(/\n+/);
    const lines = [];
    for (const para of paragraphs) {
      const words = para.split(/\s+/).filter(Boolean);
      let current = '';
      for (const word of words) {
        if ((current + ' ' + word).trim().length <= maxChars) {
          current = (current + ' ' + word).trim();
        } else {
          if (current) lines.push(current);
          current = word;
          if (lines.length >= maxLines) return lines;
        }
      }
      if (current && lines.length < maxLines) {
        lines.push(current);
      }
      if (lines.length < maxLines) {
        lines.push(''); // Espacio entre párrafos
      }
      if (lines.length >= maxLines) break;
    }
    return lines.slice(0, maxLines);
  }

  static _escapeXml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  static _getExtension(filename) {
    const parts = String(filename || '')
      .toLowerCase()
      .split('.');
    return parts.length > 1 ? parts.pop() : '';
  }

  static _isSupportedImageName(name) {
    return /\.(jpe?g|png|webp|gif|svg|avif)$/i.test(name) && !name.includes('__MACOSX');
  }

  static _getImageMime(name) {
    const ext = this._getExtension(name);
    const map = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      avif: 'image/avif'
    };
    return map[ext] || 'image/png';
  }

  static _isZipSignature(bytes) {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)
    );
  }

  static _isRarSignature(bytes) {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x61 &&
      bytes[2] === 0x72 &&
      bytes[3] === 0x21
    );
  }

  static _isPdfSignature(bytes) {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46
    );
  }

  static _uint8ArrayToDataUrl(uint8Array, mimeType) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([uint8Array], { type: mimeType });
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
}
