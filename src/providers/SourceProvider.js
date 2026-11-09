/**
 * MangaShelf — Arquitectura de Proveedores de Contenido y APIs Oficiales (v3)
 * ---------------------------------------------------------------------------
 * Conecta fuentes locales y APIs públicas oficiales:
 *
 * 1. `MangaDexProvider`: Integración en vivo con la API Oficial de MangaDex
 *    (`https://api.mangadex.org`) para buscar mangas, portadas, metadatos,
 *    lista de capítulos (`es`, `es-la`, `en`) y páginas del servidor At-Home.
 * 2. `DemoCatalogProvider`: Obras originales generadas localmente en SVG (100% offline).
 * 3. `LocalFilesProvider`: Importador persistente (IndexedDB) de archivos del
 *    usuario (.CBZ, .ZIP, .EPUB, .PDF e imágenes sueltas).
 * 4. `InternetArchiveProvider`: Integración con la API pública oficial de
 *    Internet Archive (`archive.org`) para cómics de Dominio Público.
 * 5. `GutendexProvider`: Integración con la API abierta `gutendex.com`
 *    (Project Gutenberg) para clásicos ilustrados de Dominio Público.
 */

import { DEMO_SERIES, generateCoverSvg, generatePageSvg } from '../data/demoCatalog.js';
import { ArchiveParser } from '../utils/ArchiveParser.js';

export class BaseSourceProvider {
  constructor({
    id,
    name,
    lang = 'ES / EN',
    version = '1.4',
    icon = 'bi-globe2',
    description,
    isDemo = false,
    isLocal = false,
    isExternalApi = false,
    limitsNotice = ''
  }) {
    this.id = id;
    this.name = name;
    this.lang = lang;
    this.version = version;
    this.icon = icon;
    this.description = description;
    this.isDemo = isDemo;
    this.isLocal = isLocal;
    this.isExternalApi = isExternalApi;
    this.limitsNotice = limitsNotice;
    this.lastLatencyMs = null;
    this.cacheHits = 0;
  }

  async getCatalog() {
    return [];
  }

  async getChapterPages(seriesId, chapterId) {
    throw new Error('Método getChapterPages() no implementado.');
  }
}

/**
 * 1. Proveedor Oficial API MangaDex (https://api.mangadex.org)
 * Optimizado con caché de consultas, deduplicación de peticiones en vuelo,
 * portadas ligeras (.256.jpg) y precarga inteligente.
 */
export class MangaDexProvider extends BaseSourceProvider {
  constructor() {
    super({
      id: 'mangadex-official-api',
      name: 'MangaDex Oficial',
      lang: 'ES / LATAM / EN',
      version: 'v5.10',
      icon: 'bi-Journal-richtext',
      description: 'Repositorio global oficial de manga (api.mangadex.org) con caché de baja latencia.',
      isDemo: false,
      isLocal: false,
      isExternalApi: true,
      limitsNotice: 'API Pública Oficial de MangaDex con caché local TTL activa.'
    });
    this.cachedSeries = [];
    this.queryCache = new Map(); // queryKey -> { timestamp, items }
    this.chapterFeedCache = new Map(); // mangaId -> chapters[]
    this.chapterPagesCache = new Map();
    this.activeAbortController = null;
  }

  /**
   * Realiza la petición GET JSON a la API de MangaDex con caché en memoria + medición de latencia.
   */
  async _fetchMangaDexJson(endpointPath, { useCache = true, signal = null } = {}) {
    const cleanPath = endpointPath.replace(/^\/+/, '');
    if (useCache && this.queryCache.has(cleanPath)) {
      const entry = this.queryCache.get(cleanPath);
      if (Date.now() - entry.timestamp < 5 * 60 * 1000) {
        this.cacheHits += 1;
        this.lastLatencyMs = 1;
        return entry.data;
      }
    }

    const proxyUrl = `/api/mangadex/${cleanPath}`;
    const directUrl = `https://api.mangadex.org/${cleanPath}`;

    const requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal
    };

    const t0 = performance.now();

    try {
      const response = await fetch(proxyUrl, requestOptions);
      if (response.ok) {
        const data = await response.json();
        this.lastLatencyMs = Math.max(1, Math.round(performance.now() - t0));
        if (useCache) {
          this.queryCache.set(cleanPath, { timestamp: Date.now(), data });
        }
        return data;
      }
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
    }

    const response = await fetch(directUrl, requestOptions);
    if (!response.ok) {
      throw new Error(`MangaDex API respondió con HTTP ${response.status}`);
    }
    const data = await response.json();
    this.lastLatencyMs = Math.max(1, Math.round(performance.now() - t0));
    if (useCache) {
      this.queryCache.set(cleanPath, { timestamp: Date.now(), data });
    }
    return data;
  }

  /**
   * Comprueba conectividad y metadatos de la documentación/API de MangaDex.
   */
  async checkApiDocsStatus() {
    try {
      const response = await fetch('https://api.mangadex.org/ping', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const text = await response.text();
      console.log('[MangaDex API Ping]', text);
      return true;
    } catch (err) {
      console.warn('[MangaDex API Ping Warning]', err);
      return false;
    }
  }

  /**
   * Busca mangas o carga los más populares en tiempo real desde MangaDex API.
   */
  async searchManga(query = '', options = {}) {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
    }
    this.activeAbortController = new AbortController();

    const limit = options.limit || 18;
    const langFilter = options.lang || 'all';
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    params.append('includes[]', 'cover_art');
    params.append('includes[]', 'author');
    params.append('includes[]', 'artist');
    params.append('contentRating[]', 'safe');
    params.append('contentRating[]', 'suggestive');
    params.append('hasAvailableChapters', 'true');

    if (langFilter === 'es') {
      params.append('availableTranslatedLanguage[]', 'es');
      params.append('availableTranslatedLanguage[]', 'es-la');
    } else if (langFilter === 'en') {
      params.append('availableTranslatedLanguage[]', 'en');
    }

    const cleanQ = query.trim();
    if (cleanQ) {
      params.append('title', cleanQ);
      params.append('order[relevance]', 'desc');
    } else {
      params.append('order[followedCount]', 'desc');
    }

    const data = await this._fetchMangaDexJson(`manga?${params.toString()}`, {
      useCache: true,
      signal: this.activeAbortController.signal
    });
    const mangaList = Array.isArray(data?.data) ? data.data : [];

    const mappedSeries = mangaList.map((item) => this._mapMangaDexItemToSeries(item));

    // Fusionar con series ya cargadas para no perder las que estén en Biblioteca
    const byId = new Map(this.cachedSeries.map((s) => [s.id, s]));
    for (const s of mappedSeries) {
      const existing = byId.get(s.id);
      if (existing && existing._chaptersLoaded) {
        s.chapters = existing.chapters;
        s.chaptersCount = existing.chapters.length;
        s._chaptersLoaded = true;
      }
      byId.set(s.id, s);
    }

    const currentIds = new Set(mappedSeries.map((s) => s.id));
    const others = Array.from(byId.values()).filter((s) => !currentIds.has(s.id));
    this.cachedSeries = [...mappedSeries, ...others];

    return mappedSeries;
  }

  _mapMangaDexItemToSeries(item) {
    const mangaId = item.id;
    const attr = item.attributes || {};
    const rels = Array.isArray(item.relationships) ? item.relationships : [];

    const titles = attr.title || {};
    const altTitles = Array.isArray(attr.altTitles) ? attr.altTitles : [];
    let bestTitle =
      titles.es ||
      titles['es-la'] ||
      titles.en ||
      titles['ja-ro'] ||
      Object.values(titles)[0] ||
      'Manga sin título';

    if (!titles.es && !titles['es-la']) {
      const esAlt = altTitles.find((t) => t.es || t['es-la']);
      if (esAlt) bestTitle = esAlt.es || esAlt['es-la'] || bestTitle;
    }

    const descs = attr.description || {};
    const rawSynopsis =
      descs.es ||
      descs['es-la'] ||
      descs.en ||
      Object.values(descs)[0] ||
      'Obra disponible en el catálogo oficial de MangaDex.';
    const cleanSynopsis = String(rawSynopsis)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_~`#>-]/g, '')
      .slice(0, 650);

    const authorRel = rels.find((r) => r.type === 'author');
    const artistRel = rels.find((r) => r.type === 'artist');
    const authorName =
      authorRel?.attributes?.name ||
      artistRel?.attributes?.name ||
      'Autor en MangaDex';

    // Portada optimizada (.256.jpg) para carga rápida en cuadrícula y proxy con caché
    const coverRel = rels.find((r) => r.type === 'cover_art');
    const coverFile = coverRel?.attributes?.fileName;
    const coverUrl = coverFile
      ? `/api/mangadex-cover/${mangaId}/${encodeURIComponent(coverFile)}.256.jpg`
      : generateCoverSvg({
          id: `md-${mangaId}`,
          title: bestTitle,
          author: authorName,
          genres: ['MangaDex']
        });

    // Estado
    const statusMap = {
      ongoing: 'En curso',
      completed: 'Completado',
      hiatus: 'Pendiente',
      cancelled: 'Completado'
    };
    const status = statusMap[attr.status] || 'En curso';

    // Géneros / Tags
    const tags = (attr.tags || [])
      .map((t) => t?.attributes?.name?.es || t?.attributes?.name?.en)
      .filter(Boolean)
      .slice(0, 5);
    if (!tags.includes('MangaDex')) {
      tags.unshift('MangaDex');
    }

    const releaseYear = Number(attr.year) || 2024;
    const seriesId = `mangadex-${mangaId}`;

    // Capítulo inicial placeholder hasta que se abra la ficha o el lector y se cargue el feed real
    const placeholderChapter = {
      id: `md-init-${mangaId}`,
      mangadexChapterId: null,
      number: 1,
      title: 'Cargar capítulos desde MangaDex API...',
      releaseDate: (attr.updatedAt || '2026-01-01').slice(0, 10),
      pagesCount: 12,
      lang: 'es/en',
      summary: 'Haz clic en la serie o en Leer para sincronizar la lista real de capítulos de MangaDex.'
    };

    return {
      id: seriesId,
      mangadexId: mangaId,
      title: bestTitle,
      author: authorName,
      status,
      genres: tags,
      releaseYear,
      isDemo: false,
      isMangaDex: true,
      sourceId: this.id,
      sourceName: 'MangaDex API Oficial',
      coverUrl,
       fallbackCoverUrl: coverFile
        ? `https://uploads.mangadex.org/covers/${mangaId}/${encodeURIComponent(coverFile)}.256.jpg`
        : '',
      synopsis: cleanSynopsis,
      chaptersCount: 1,
      _chaptersLoaded: false,
      chapters: [placeholderChapter]
    };
  }

  /**
   * Obtiene la lista real de capítulos de un manga en MangaDex priorizando Español (es, es-la) e Inglés (en).
   */
  async loadSeriesChapters(series) {
    if (!series || !series.mangadexId) return series?.chapters || [];
    if (series._chaptersLoaded && series.chapters.length > 0 && series.chapters[0].mangadexChapterId) {
      return series.chapters;
    }

    const mangaId = series.mangadexId;
    const params = new URLSearchParams();
    params.append('limit', '96');
    params.append('translatedLanguage[]', 'es');
    params.append('translatedLanguage[]', 'es-la');
    params.append('translatedLanguage[]', 'en');
    params.append('contentRating[]', 'safe');
    params.append('contentRating[]', 'suggestive');
    params.append('order[chapter]', 'asc');
    params.append('includes[]', 'scanlation_group');

    try {
      const data = await this._fetchMangaDexJson(`manga/${mangaId}/feed?${params.toString()}`);
      const rawChapters = Array.isArray(data?.data) ? data.data : [];

      // Filtrar capítulos con páginas alojadas en MangaDex (sin externalUrl vacío de páginas)
      const validChapters = rawChapters.filter(
        (ch) => (ch?.attributes?.pages || 0) > 0 && !ch?.attributes?.externalUrl
      );

      // Agrupar por número de capítulo priorizando Español (es / es-la) sobre Inglés (en)
      const chosenByNumber = new Map();
      for (const ch of validChapters) {
        const attr = ch.attributes || {};
        const chNumStr = attr.chapter || '1';
        const lang = attr.translatedLanguage || 'en';
        const existing = chosenByNumber.get(chNumStr);

        const isSpanish = lang === 'es' || lang === 'es-la';
        const existingIsSpanish =
          existing && (existing.attributes?.translatedLanguage === 'es' || existing.attributes?.translatedLanguage === 'es-la');

        if (!existing || (isSpanish && !existingIsSpanish)) {
          chosenByNumber.set(chNumStr, ch);
        }
      }

      const finalFeed = Array.from(chosenByNumber.values()).slice(0, 50);

      if (finalFeed.length > 0) {
        series.chapters = finalFeed.map((ch, idx) => {
          const attr = ch.attributes || {};
          const num = Number(attr.chapter) || idx + 1;
          const lang = (attr.translatedLanguage || 'en').toUpperCase();
          const groupRel = (ch.relationships || []).find((r) => r.type === 'scanlation_group');
          const groupName = groupRel?.attributes?.name || 'MangaDex Scan';
          const chTitle = attr.title
            ? `${attr.title} [${lang}]`
            : `Capítulo ${attr.chapter || idx + 1} [${lang}]`;

          return {
            id: `md-ch-${ch.id}`,
            mangadexChapterId: ch.id,
            number: num,
            title: chTitle,
            releaseDate: (attr.publishAt || attr.createdAt || '2026-01-01').slice(0, 10),
            pagesCount: Number(attr.pages) || 15,
            lang,
            summary: `Idioma: ${lang} • Grupo: ${groupName}`
          };
        });
        series.chaptersCount = series.chapters.length;
        series._chaptersLoaded = true;
        return series.chapters;
      }
    } catch (err) {
      console.warn('Aviso al obtener feed de capítulos en MangaDex:', err);
    }

    // Si el manga sólo tiene enlaces externos oficiales (ej. MangaPlus), crear ficha informativa legible
    series._chaptersLoaded = true;
    return series.chapters;
  }

  async getCatalog() {
    return this.cachedSeries;
  }

  /**
   * Obtiene las páginas reales de un capítulo desde el servidor MangaDex At-Home:
   * GET https://api.mangadex.org/at-home/server/{chapterId}
   */
  async getChapterPages(seriesId, chapterId) {
    const cacheKey = `${seriesId}::${chapterId}`;
    if (this.chapterPagesCache.has(cacheKey)) {
      return this.chapterPagesCache.get(cacheKey);
    }

    const series = this.cachedSeries.find((s) => s.id === seriesId);
    if (!series) throw new Error('Serie de MangaDex no encontrada en memoria.');

    if (!series._chaptersLoaded) {
      await this.loadSeriesChapters(series);
    }

    const chapter =
      series.chapters.find((c) => c.id === chapterId) || series.chapters[0];
    if (!chapter) throw new Error('Capítulo de MangaDex no encontrado.');

    if (chapter.mangadexChapterId) {
      try {
        const atHome = await this._fetchMangaDexJson(
          `at-home/server/${chapter.mangadexChapterId}`
        );
        const baseUrl = atHome?.baseUrl || 'https://uploads.mangadex.org';
        const hash = atHome?.chapter?.hash;
        const dataSaverFiles = atHome?.chapter?.dataSaver || [];
        const dataFiles = atHome?.chapter?.data || [];

        const useDataSaver = dataSaverFiles.length > 0;
        const files = useDataSaver ? dataSaverFiles : dataFiles;
        const qualityFolder = useDataSaver ? 'data-saver' : 'data';

        if (hash && files.length > 0) {
          const pages = files.map((fileName, idx) => {
            const rawImageUrl = `${baseUrl}/${qualityFolder}/${hash}/${fileName}`;
            const proxiedUrl = `/api/mangadex-page?url=${encodeURIComponent(rawImageUrl)}`;
            return {
              pageNumber: idx + 1,
              totalPages: files.length,
              imageUrl: proxiedUrl,
              directImageUrl: rawImageUrl,
              caption: `Página ${idx + 1} de ${files.length} • ${series.title} (${chapter.title})`
            };
          });
          chapter.pagesCount = pages.length;
          this.chapterPagesCache.set(cacheKey, pages);
          return pages;
        }
      } catch (err) {
        console.warn('Error en servidor At-Home de MangaDex, usando vista previa documental:', err);
      }
    }

    // Fallback visual en caso de capítulos licenciados externamente sin imágenes en At-Home
    const fallbackPages = [
      ArchiveParser._renderEpubSectionToSvgDataUrl(
        series.title,
        series.author,
        `Ficha MangaDex API • ${chapter.title}`,
        [
          `Título: ${series.title}`,
          `Autor: ${series.author}`,
          `Géneros: ${(series.genres || []).join(', ')}`,
          `Sinopsis: ${series.synopsis.slice(0, 260)}...`,
          `Nota: Este capítulo particular está alojado en una editorial externa o requiere recarga.`
        ],
        1,
        1
      )
    ];

    return fallbackPages.map((url, idx) => ({
      pageNumber: idx + 1,
      totalPages: fallbackPages.length,
      imageUrl: url,
      caption: `Ficha MangaDex • ${series.title}`
    }));
  }
}

/**
 * 2. Proveedor Oficial de Demostración (100% Offline, Arte y Guion Ficticios).
 */
export class DemoCatalogProvider extends BaseSourceProvider {
  constructor() {
    super({
      id: 'mangashelf-demo-source',
      name: 'Catálogo Original MangaShelf (Offline)',
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
 * 3. Proveedor Persistente de Archivos Locales del Usuario (.CBZ, .EPUB, .PDF, Imágenes).
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
 * 4. Proveedor API Pública: Internet Archive (archive.org) — Cómics de Dominio Público.
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
        'API pública gratuita sin clave. Sujeta a disponibilidad de archive.org.'
    });

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
 * 5. Proveedor API Pública: Gutendex (Project Gutenberg Open JSON API).
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
        'API pública gratuita y open source (gutendex.com).'
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

    this.mangadexProvider = new MangaDexProvider();
    this.demoProvider = new DemoCatalogProvider();
    this.localProvider = new LocalFilesProvider(idbService);
    this.iaProvider = new InternetArchiveProvider();
    this.gutendexProvider = new GutendexProvider();

    this.registerProvider(this.mangadexProvider);
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
    const mdList = await this.mangadexProvider.getCatalog();
    const demoList = await this.demoProvider.getCatalog();
    const iaList = await this.iaProvider.getCatalog();
    const gutList = await this.gutendexProvider.getCatalog();
    return [...localList, ...mdList, ...demoList, ...iaList, ...gutList];
  }

  async getSeriesById(seriesId) {
    const all = await this.getAllSeries();
    return all.find((s) => s.id === seriesId) || null;
  }

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

  async downloadChapterForOffline(seriesId, chapterId, onProgress = null) {
    const series = await this.getSeriesById(seriesId);
    if (!series) throw new Error('Serie no encontrada.');
    const provider = this.providers.get(series.sourceId) || this.demoProvider;
    const rawPages = await provider.getChapterPages(seriesId, chapterId);

    const offlinePages = [];
    for (let i = 0; i < rawPages.length; i++) {
      const p = rawPages[i];
      let finalUrl = p.imageUrl;

      if (/^(https?:\/\/|\/api\/)/i.test(finalUrl)) {
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
