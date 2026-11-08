/**
 * MangaShelf — Arquitectura de Proveedores de Contenido y APIs Públicas Legales
 * ---------------------------------------------------------------------------
 * Conecta fuentes locales y repositorios abiertos de Dominio Público sin
 * scraping, sin claves privadas expuestas y con soporte completo offline:
 *
 * 1. `DemoCatalogProvider`: Obras ficticias generadas localmente en SVG (100% offline).
 * 2. `LocalFilesProvider`: Importador persistente (IndexedDB) de archivos del
 *    usuario (.CBZ, .ZIP, .EPUB, .PDF e imágenes sueltas).
 * 3. `InternetArchiveProvider`: Integración con la API pública oficial de
 *    Internet Archive (`archive.org`) para cómics e historietas de Dominio Público.
 * 4. `GutendexProvider`: Integración con la API abierta `gutendex.com`
 *    (Project Gutenberg) para clásicos ilustrados y ficción de Dominio Público.
 */

import { DEMO_SERIES, generateCoverSvg, generatePageSvg } from '../data/demoCatalog.js';
import { ArchiveParser } from '../utils/ArchiveParser.js';

export class BaseSourceProvider {
  constructor({ id, name, description, isDemo = false, isLocal = false, isExternalApi = false, limitsNotice = '' }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.isDemo = isDemo;
    this.isLocal = isLocal;
    this.isExternalApi = isExternalApi;
    this.limitsNotice = limitsNotice;
  }

  async getCatalog() {
    return [];
  }

  async getChapterPages(seriesId, chapterId) {
    throw new Error('Método getChapterPages() no implementado.');
  }
}

/**
 * 1. Proveedor Oficial de Demostración (100% Offline, Arte y Guion Ficticios).
 */
export class DemoCatalogProvider extends BaseSourceProvider {
  constructor() {
    super({
      id: 'mangashelf-demo-source',
      name: 'Catálogo Ficticio MangaShelf (Local)',
      description: 'Obras originales de demostración generadas en SVG en el dispositivo.',
      isDemo: true,
      isLocal: true,
      limitsNotice: 'Sin límites de red. Funciona 100% sin conexión.'
    });
    this._coverCache = new Map();
  }

  async getCatalog() {
    return DEMO_SERIES.map((series) => {
      if (!this._coverCache.has(series.id)) {
        this._coverCache.set(series.id, generateCoverSvg(series));
      }
      return {
        ...series,
        sourceId: this.id,
        sourceName: this.name,
        coverUrl: this._coverCache.get(series.id),
        chaptersCount: series.chapters.length
      };
    });
  }

  async getChapterPages(seriesId, chapterId) {
    const series = DEMO_SERIES.find((s) => s.id === seriesId);
    if (!series) throw new Error('Serie no encontrada en el catálogo de demostración.');
    const chapter = series.chapters.find((c) => c.id === chapterId);
    if (!chapter) throw new Error('Capítulo no encontrado.');

    const pages = [];
    for (let i = 1; i <= chapter.pagesCount; i++) {
      pages.push({
        pageNumber: i,
        totalPages: chapter.pagesCount,
        imageUrl: generatePageSvg(series, chapter, i),
        caption: `Página ${i} de ${chapter.pagesCount} • Contenido Demo`
      });
    }
    return pages;
  }
}

/**
 * 2. Proveedor Persistente de Archivos Locales del Usuario (.CBZ, .EPUB, .PDF, Imágenes).
 */
export class LocalFilesProvider extends BaseSourceProvider {
  constructor(idbService) {
    super({
      id: 'user-local-files',
      name: 'Archivos Locales del Usuario (CBZ / EPUB / PDF / Imágenes)',
      description: 'Obras importadas desde tu dispositivo y guardadas en IndexedDB.',
      isDemo: false,
      isLocal: true,
      limitsNotice: 'Almacenado localmente en IndexedDB de tu navegador (límite recomendado: 150 MB por archivo).'
    });
    this.idb = idbService;
    this.customSeries = [];
  }

  async loadPersistedSeries() {
    if (!this.idb) return [];
    const saved = await this.idb.getAllImportedSeries();
    this.customSeries = saved;
    return this.customSeries;
  }

  async importFiles(fileList, customTitle = '', customAuthor = '') {
    const parsedSeries = await ArchiveParser.parseUserFiles(
      fileList,
      customTitle,
      customAuthor
    );
    if (this.idb) {
      await this.idb.saveImportedSeries(parsedSeries);
    }
    this.customSeries.unshift(parsedSeries);
    return parsedSeries;
  }

  async removeImportedSeries(seriesId) {
    this.customSeries = this.customSeries.filter((s) => s.id !== seriesId);
    if (this.idb) {
      await this.idb.deleteImportedSeries(seriesId);
    }
  }

  async getCatalog() {
    return this.customSeries;
  }

  async getChapterPages(seriesId, chapterId) {
    const series = this.customSeries.find((s) => s.id === seriesId);
    if (!series) throw new Error('Obra local no encontrada.');
    const chapter = series.chapters.find((c) => c.id === chapterId) || series.chapters[0];
    if (!chapter) throw new Error('Capítulo local no encontrado.');

    const urls = chapter.storedPages || chapter._localUrls || [];
    return urls.map((url, idx) => ({
      pageNumber: idx + 1,
      totalPages: urls.length,
      imageUrl: url,
      pdfDataUrl: chapter.pdfDataUrl || series.pdfDataUrl || null,
      caption: `Página ${idx + 1} de ${urls.length} • ${series.fileFormat || 'Archivo Local'}`
    }));
  }
}

/**
 * 3. Proveedor API Pública: Internet Archive (archive.org) — Cómics de Dominio Público.
 * Utiliza los endpoints públicos con CORS habilitado de archive.org sin claves secretas.
 */
export class InternetArchiveProvider extends BaseSourceProvider {
  constructor() {
    super({
      id: 'internet-archive-pd',
      name: 'Internet Archive (API Dominio Público)',
      description:
        'Cómics clásicos e historietas de Dominio Público servidos desde la API abierta de Archive.org.',
      isDemo: false,
      isLocal: false,
      isExternalApi: true,
      limitsNotice:
        'API pública gratuita sin clave. Sujeta a disponibilidad de archive.org y velocidad de su servidor de imágenes BookReader.'
    });

    // Obras verificadas de Dominio Público en Internet Archive como base y fallback
    this.curatedPublicDomainWorks = [
      {
        id: 'ia-little-nemo-1911',
        iaIdentifier: 'littlenemoinbe00mcca',
        title: 'Little Nemo in Slumberland (1911)',
        author: 'Winsor McCay (Dominio Público)',
        status: 'Completado',
        genres: ['Dominio Público', 'Fantasía', 'Clásico'],
        releaseYear: 1911,
        isDemo: false,
        isPublicDomain: true,
        sourceId: 'internet-archive-pd',
        sourceName: 'Internet Archive API (Dominio Público)',
        coverUrl: 'https://archive.org/services/img/littlenemoinbe00mcca',
        synopsis:
          '[DOMINIO PÚBLICO — ARCHIVE.ORG] Obra maestra histórica del cómic publicada por Winsor McCay en 1911. Servida mediante la API pública de Internet Archive; puedes descargar sus páginas para lectura offline.',
        chaptersCount: 1,
        chapters: [
          {
            id: 'ia-nemo-cap-1',
            number: 1,
            title: 'Edición Histórica Ilustrada (Selección)',
            releaseDate: '1911-01-01',
            pagesCount: 8,
            iaIdentifier: 'littlenemoinbe00mcca',
            pageOffset: 5,
            summary: 'Páginas escaneadas del archivo histórico de Internet Archive.'
          }
        ]
      },
      {
        id: 'ia-birdseye-center-1905',
        iaIdentifier: 'dreamsophrarebit00mcca',
        title: 'Dreams of the Rarebit Fiend (1905)',
        author: 'Winsor McCay (Dominio Público)',
        status: 'Completado',
        genres: ['Dominio Público', 'Surrealismo', 'Clásico'],
        releaseYear: 1905,
        isDemo: false,
        isPublicDomain: true,
        sourceId: 'internet-archive-pd',
        sourceName: 'Internet Archive API (Dominio Público)',
        coverUrl: 'https://archive.org/services/img/dreamsophrarebit00mcca',
        synopsis:
          '[DOMINIO PÚBLICO — ARCHIVE.ORG] Recopilación clásica de tiras secuenciales publicada en 1905, libre de derechos de autor y accesible desde Internet Archive.',
        chaptersCount: 1,
        chapters: [
          {
            id: 'ia-rarebit-cap-1',
            number: 1,
            title: 'Tiras Secuenciales (Archivo 1905)',
            releaseDate: '1905-01-01',
            pagesCount: 8,
            iaIdentifier: 'dreamsophrarebit00mcca',
            pageOffset: 6,
            summary: 'Páginas históricas servidas vía API de Internet Archive.'
          }
        ]
      }
    ];

    this.dynamicSearchResults = [];
  }

  async getCatalog() {
    return [...this.dynamicSearchResults, ...this.curatedPublicDomainWorks];
  }

  /**
   * Consulta en vivo la API AdvancedSearch de Internet Archive filtrando obras de
   * dominio público / textos abiertos.
   */
  async searchPublicDomain(query = 'comic') {
    const cleanQ = encodeURIComponent(query.trim() || 'comic');
    const url = `https://archive.org/advancedsearch.php?q=(${cleanQ})+AND+mediatype:(texts)+AND+(rights:(Public+Domain)+OR+licenseurl:(publicdomain))&fl[]=identifier,title,creator,year,description&rows=6&page=1&output=json`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const docs = data?.response?.docs || [];

      const mapped = docs
        .filter((d) => d.identifier && d.title)
        .map((doc) => {
          const id = `ia-${doc.identifier}`;
          const desc = Array.isArray(doc.description)
            ? doc.description[0]
            : doc.description || 'Obra del catálogo abierto de Internet Archive.';
          return {
            id,
            iaIdentifier: doc.identifier,
            title: String(doc.title).slice(0, 85),
            author: Array.isArray(doc.creator)
              ? doc.creator[0]
              : doc.creator || 'Dominio Público (Archive.org)',
            status: 'Completado',
            genres: ['Dominio Público', 'Archive.org'],
            releaseYear: Number(doc.year) || 1920,
            isDemo: false,
            isPublicDomain: true,
            sourceId: this.id,
            sourceName: 'Internet Archive API',
            coverUrl: `https://archive.org/services/img/${encodeURIComponent(doc.identifier)}`,
            synopsis: `[API ARCHIVE.ORG] ${String(desc).replace(/<[^>]+>/g, '').slice(0, 280)}`,
            chaptersCount: 1,
            chapters: [
              {
                id: `${id}-cap-1`,
                number: 1,
                title: 'Edición Digitalizada (Vista de Páginas)',
                releaseDate: `${doc.year || '1920'}-01-01`,
                pagesCount: 8,
                iaIdentifier: doc.identifier,
                pageOffset: 3,
                summary: `Identificador Archive.org: ${doc.identifier}`
              }
            ]
          };
        });

      // Combinar sin duplicados
      const existingIds = new Set(this.curatedPublicDomainWorks.map((w) => w.id));
      this.dynamicSearchResults = mapped.filter((m) => !existingIds.has(m.id));
      return await this.getCatalog();
    } catch (err) {
      clearTimeout(timer);
      throw new Error(
        `No se pudo conectar con la API de Internet Archive (${err.message}). Mostrando catálogo de respaldo.`
      );
    }
  }

  async getChapterPages(seriesId, chapterId) {
    const all = await this.getCatalog();
    const series = all.find((s) => s.id === seriesId);
    if (!series) throw new Error('Obra de Internet Archive no encontrada.');
    const chapter = series.chapters.find((c) => c.id === chapterId) || series.chapters[0];
    const iaId = chapter.iaIdentifier || series.iaIdentifier;
    const offset = chapter.pageOffset || 1;
    const count = chapter.pagesCount || 8;

    const pages = [];
    for (let i = 1; i <= count; i++) {
      const pageIndex = offset + i - 1;
      pages.push({
        pageNumber: i,
        totalPages: count,
        imageUrl: `https://archive.org/download/${encodeURIComponent(
          iaId
        )}/page/n${pageIndex}_w800.jpg`,
        caption: `Página ${i} de ${count} • Dominio Público (Archive.org)`
      });
    }
    return pages;
  }
}

/**
 * 4. Proveedor API Pública: Gutendex (Project Gutenberg Open JSON API).
 * Conecta con `https://gutendex.com/books` para consultar obras libres de derechos.
 */
export class GutendexProvider extends BaseSourceProvider {
  constructor() {
    super({
      id: 'gutendex-public-domain',
      name: 'Project Gutenberg (API Gutendex)',
      description:
        'Catálogo de libros clásicos e ilustrados en Dominio Público mediante la API abierta Gutendex.',
      isDemo: false,
      isLocal: false,
      isExternalApi: true,
      limitsNotice:
        'API pública gratuita y open source (gutendex.com). Sin autenticación; límite de velocidad compartido.'
    });
    this.cachedBooks = [];
  }

  async fetchPublicDomainBooks(searchQuery = 'adventure') {
    const q = encodeURIComponent(searchQuery.trim() || 'adventure');
    const url = `https://gutendex.com/books/?search=${q}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const results = (data?.results || []).slice(0, 6);

      this.cachedBooks = results.map((book) => {
        const seriesId = `gutenberg-${book.id}`;
        const author =
          book.authors && book.authors[0]
            ? book.authors[0].name
            : 'Autor de Dominio Público';
        const cover =
          book.formats?.['image/jpeg'] ||
          ArchiveParser._renderEpubCoverSvg(book.title, author);
        const summary =
          (book.summaries && book.summaries[0]) ||
          `Obra clásica de Dominio Público del Proyecto Gutenberg (ID #${book.id}). Descargas registradas: ${book.download_count}.`;

        // Generar láminas de lectura a partir del resumen y ficha bibliográfica abierta
        const pagesSvg = [
          ArchiveParser._renderEpubSectionToSvgDataUrl(
            book.title,
            author,
            `Ficha Oficial Project Gutenberg #${book.id}`,
            [
              `Título: ${book.title}`,
              `Autor: ${author}`,
              `Temáticas: ${(book.subjects || []).slice(0, 4).join(', ') || 'Clásico'}`,
              `Idiomas disponibles: ${(book.languages || ['en']).join(', ')}`,
              'Estado legal: Dominio Público (Libre distribución).'
            ],
            1,
            2
          ),
          ArchiveParser._renderEpubSectionToSvgDataUrl(
            book.title,
            author,
            'Sinopsis y Extracto Documental',
            [
              summary,
              'Puedes descargar el archivo EPUB completo desde Project Gutenberg e importarlo directamente en el lector EPUB nativo de MangaShelf.'
            ],
            2,
            2
          )
        ];

        return {
          id: seriesId,
          gutenbergId: book.id,
          title: book.title,
          author,
          status: 'Completado',
          genres: ['Dominio Público', 'Gutenberg'],
          releaseYear: 1900,
          isDemo: false,
          isPublicDomain: true,
          sourceId: this.id,
          sourceName: 'Project Gutenberg API (Gutendex)',
          coverUrl: cover,
          synopsis: `[PROJECT GUTENBERG #${book.id}] ${summary}`,
          chaptersCount: 1,
          chapters: [
            {
              id: `${seriesId}-cap-1`,
              number: 1,
              title: 'Vista Previa y Ficha Documental',
              releaseDate: '2026-01-01',
              pagesCount: pagesSvg.length,
              summary: `Metadatos obtenidos en vivo desde gutendex.com`,
              storedPages: pagesSvg
            }
          ]
        };
      });

      return this.cachedBooks;
    } catch (err) {
      clearTimeout(timer);
      throw new Error(
        `La API de Gutendex no respondió (${err.message}). La app continúa operativa con tus fuentes locales.`
      );
    }
  }

  async getCatalog() {
    return this.cachedBooks;
  }

  async getChapterPages(seriesId, chapterId) {
    const series = this.cachedBooks.find((s) => s.id === seriesId);
    if (!series) throw new Error('Obra de Gutenberg no encontrada en sesión.');
    const ch = series.chapters.find((c) => c.id === chapterId) || series.chapters[0];
    return (ch.storedPages || []).map((url, idx) => ({
      pageNumber: idx + 1,
      totalPages: ch.storedPages.length,
      imageUrl: url,
      caption: `Lámina ${idx + 1} de ${ch.storedPages.length} • Project Gutenberg`
    }));
  }
}

/**
 * Registro Central de Fuentes Autorizadas y Gestor de Descargas Offline.
 */
export class SourceRegistry {
  constructor(idbService) {
    this.idb = idbService;
    this.providers = new Map();

    this.demoProvider = new DemoCatalogProvider();
    this.localProvider = new LocalFilesProvider(idbService);
    this.iaProvider = new InternetArchiveProvider();
    this.gutendexProvider = new GutendexProvider();

    this.registerProvider(this.demoProvider);
    this.registerProvider(this.localProvider);
    this.registerProvider(this.iaProvider);
    this.registerProvider(this.gutendexProvider);
  }

  registerProvider(provider) {
    this.providers.set(provider.id, provider);
  }

  getProviders() {
    return Array.from(this.providers.values());
  }

  async initializeLocalData() {
    await this.localProvider.loadPersistedSeries();
  }

  async getAllSeries() {
    const localList = await this.localProvider.getCatalog();
    const demoList = await this.demoProvider.getCatalog();
    const iaList = await this.iaProvider.getCatalog();
    const gutList = await this.gutendexProvider.getCatalog();
    return [...localList, ...demoList, ...iaList, ...gutList];
  }

  async getSeriesById(seriesId) {
    const all = await this.getAllSeries();
    return all.find((s) => s.id === seriesId) || null;
  }

  /**
   * Obtiene las páginas de un capítulo priorizando la versión descargada en IndexedDB
   * para garantizar funcionamiento sin conexión.
   */
  async getChapterPages(seriesId, chapterId) {
    if (this.idb) {
      const offlineRecord = await this.idb.getOfflineChapter(seriesId, chapterId);
      if (offlineRecord && Array.isArray(offlineRecord.pages) && offlineRecord.pages.length > 0) {
        return offlineRecord.pages;
      }
    }

    const series = await this.getSeriesById(seriesId);
    if (!series) throw new Error('No se encontró la serie solicitada.');
    const provider = this.providers.get(series.sourceId) || this.demoProvider;
    return provider.getChapterPages(seriesId, chapterId);
  }

  /**
   * Descarga todas las páginas de un capítulo y las almacena como DataURLs locales
   * en IndexedDB para lectura 100% sin conexión.
   */
  async downloadChapterForOffline(seriesId, chapterId, onProgress = null) {
    const series = await this.getSeriesById(seriesId);
    if (!series) throw new Error('Serie no encontrada.');
    const provider = this.providers.get(series.sourceId) || this.demoProvider;
    const rawPages = await provider.getChapterPages(seriesId, chapterId);

    const offlinePages = [];
    for (let i = 0; i < rawPages.length; i++) {
      const p = rawPages[i];
      let finalUrl = p.imageUrl;

      // Si es una URL remota HTTP(S), intentar descargarla a DataURL para que funcione en Modo Avión
      if (/^https?:\/\//i.test(finalUrl)) {
        try {
          const resp = await fetch(finalUrl, { mode: 'cors' });
          if (resp.ok) {
            const blob = await resp.blob();
            finalUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(blob);
            });
          }
        } catch {
          // Si el servidor externo restringe CORS en una imagen, guardar en Cache API no-cors
          if ('caches' in window) {
            try {
              const cache = await caches.open('mangashelf-user-downloads-v1');
              await cache.add(new Request(finalUrl, { mode: 'no-cors' }));
            } catch {
              // Ignorar si está offline
            }
          }
        }
      }

      offlinePages.push({
        ...p,
        imageUrl: finalUrl,
        isOfflineSaved: true
      });

      if (onProgress) {
        onProgress(i + 1, rawPages.length);
      }
    }

    if (this.idb) {
      await this.idb.saveOfflineChapter(seriesId, chapterId, offlinePages, {
        seriesTitle: series.title
      });
    }

    return offlinePages;
  }
}
