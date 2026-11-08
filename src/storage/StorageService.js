/**
 * MangaShelf — Servicio de Almacenamiento Local (StorageService v2)
 * ---------------------------------------------------------------------------
 * Gestiona la persistencia en `localStorage` para:
 * - Series guardadas en Biblioteca (`libraryIds`)
 * - Series marcadas como Favoritas (`favoriteIds`)
 * - Etiquetas personalizadas por serie (`seriesTags` y `availableTags`)
 * - Progreso de lectura por capítulo (`chapterProgress`)
 * - Historial cronológico de lectura (`history`)
 * - Preferencias del lector (`readerSettings`: modo, dirección LTR/RTL, ajuste y zoom)
 * - Exportación y restauración segura de copia de seguridad en formato JSON
 */

const STORAGE_KEY = 'mangashelf_pwa_state_v1';

export class StorageService {
  constructor(initialCatalog = []) {
    this.initialCatalog = initialCatalog;
    this.state = this._loadOrInitialize();
  }

  _getDefaultState() {
    const libraryIds = this.initialCatalog
      .filter((s) => s.inLibraryByDefault)
      .map((s) => s.id);

    const favoriteIds = this.initialCatalog
      .filter((s) => s.isFavoriteByDefault)
      .map((s) => s.id);

    return {
      version: 2,
      initialized: true,
      libraryIds,
      favoriteIds,
      availableTags: [
        'Prioridad',
        'Para el viaje',
        'Dominio Público',
        'Mis Archivos',
        'Relectura'
      ],
      seriesTags: {
        'crónicas-de-neón-cero': ['Prioridad'],
        'forjadores-del-eclipse': ['Relectura'],
        'ia-little-nemo-1911': ['Dominio Público']
      },
      chapterProgress: {
        'neon-cap-1': {
          seriesId: 'crónicas-de-neón-cero',
          chapterId: 'neon-cap-1',
          currentPage: 6,
          totalPages: 6,
          completed: true,
          updatedAt: '2026-11-03T20:15:00.000Z'
        },
        'neon-cap-2': {
          seriesId: 'crónicas-de-neón-cero',
          chapterId: 'neon-cap-2',
          currentPage: 3,
          totalPages: 5,
          completed: false,
          updatedAt: '2026-11-04T07:45:00.000Z'
        },
        'eclipse-cap-1': {
          seriesId: 'forjadores-del-eclipse',
          chapterId: 'eclipse-cap-1',
          currentPage: 4,
          totalPages: 4,
          completed: true,
          updatedAt: '2026-11-02T19:10:00.000Z'
        }
      },
      history: [
        {
          id: 'hist-seed-1',
          seriesId: 'crónicas-de-neón-cero',
          chapterId: 'neon-cap-2',
          page: 3,
          totalPages: 5,
          timestamp: '2026-11-04T07:45:00.000Z'
        },
        {
          id: 'hist-seed-2',
          seriesId: 'crónicas-de-neón-cero',
          chapterId: 'neon-cap-1',
          page: 6,
          totalPages: 6,
          timestamp: '2026-11-03T20:15:00.000Z'
        },
        {
          id: 'hist-seed-3',
          seriesId: 'forjadores-del-eclipse',
          chapterId: 'eclipse-cap-1',
          page: 4,
          totalPages: 4,
          timestamp: '2026-11-02T19:10:00.000Z'
        }
      ],
      readerSettings: {
        fitMode: 'contain', // 'contain' | 'width'
        readingMode: 'paged', // 'paged' | 'webtoon'
        direction: 'ltr', // 'ltr' (Izquierda a Derecha) | 'rtl' (Derecha a Izquierda / Manga)
        zoom: 100 // 100 | 125 | 150 | 175 | 200
      }
    };
  }

  _loadOrInitialize() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const defaults = this._getDefaultState();
        this._save(defaults);
        return defaults;
      }
      const parsed = JSON.parse(raw);
      const defaults = this._getDefaultState();
      return {
        ...defaults,
        ...parsed,
        availableTags: Array.isArray(parsed.availableTags)
          ? parsed.availableTags
          : defaults.availableTags,
        seriesTags:
          parsed.seriesTags && typeof parsed.seriesTags === 'object'
            ? parsed.seriesTags
            : defaults.seriesTags,
        readerSettings: {
          ...defaults.readerSettings,
          ...(parsed.readerSettings || {})
        }
      };
    } catch (err) {
      console.warn('No se pudo leer localStorage, usando estado por defecto:', err);
      return this._getDefaultState();
    }
  }

  _save(nextState = this.state) {
    this.state = nextState;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (err) {
      console.warn('Error al guardar en localStorage:', err);
    }
  }

  // =========================================================================
  // Biblioteca y Favoritos
  // =========================================================================

  isInLibrary(seriesId) {
    return this.state.libraryIds.includes(seriesId);
  }

  toggleLibrary(seriesId) {
    const exists = this.isInLibrary(seriesId);
    if (exists) {
      this.state.libraryIds = this.state.libraryIds.filter((id) => id !== seriesId);
    } else {
      this.state.libraryIds.unshift(seriesId);
    }
    this._save();
    return !exists;
  }

  addToLibrary(seriesId) {
    if (!this.isInLibrary(seriesId)) {
      this.state.libraryIds.unshift(seriesId);
      this._save();
    }
  }

  isFavorite(seriesId) {
    return this.state.favoriteIds.includes(seriesId);
  }

  toggleFavorite(seriesId) {
    const exists = this.isFavorite(seriesId);
    if (exists) {
      this.state.favoriteIds = this.state.favoriteIds.filter((id) => id !== seriesId);
    } else {
      this.state.favoriteIds.unshift(seriesId);
      if (!this.isInLibrary(seriesId)) {
        this.state.libraryIds.unshift(seriesId);
      }
    }
    this._save();
    return !exists;
  }

  // =========================================================================
  // Etiquetas Personalizadas (Tags)
  // =========================================================================

  getAvailableTags() {
    return this.state.availableTags || [];
  }

  getSeriesTags(seriesId) {
    return this.state.seriesTags[seriesId] || [];
  }

  addCustomTagToCatalog(tagName) {
    const clean = String(tagName || '').trim().slice(0, 28);
    if (!clean) return null;
    if (!this.state.availableTags.includes(clean)) {
      this.state.availableTags.push(clean);
      this._save();
    }
    return clean;
  }

  toggleTagOnSeries(seriesId, tagName) {
    const clean = this.addCustomTagToCatalog(tagName);
    if (!clean) return false;

    const current = this.getSeriesTags(seriesId);
    const exists = current.includes(clean);
    if (exists) {
      this.state.seriesTags[seriesId] = current.filter((t) => t !== clean);
    } else {
      this.state.seriesTags[seriesId] = [...current, clean];
    }
    this._save();
    return !exists;
  }

  // =========================================================================
  // Progreso de Capítulos y Estadísticas
  // =========================================================================

  getChapterProgress(chapterId) {
    return this.state.chapterProgress[chapterId] || null;
  }

  saveReadingProgress(seriesId, chapterId, currentPage, totalPages) {
    const pageNum = Math.max(
      1,
      Math.min(Number(currentPage) || 1, Number(totalPages) || 1)
    );
    const prev = this.state.chapterProgress[chapterId];
    const completed =
      pageNum >= totalPages || (prev && prev.completed && pageNum === totalPages);
    const nowIso = new Date().toISOString();

    this.state.chapterProgress[chapterId] = {
      seriesId,
      chapterId,
      currentPage: pageNum,
      totalPages,
      completed,
      updatedAt: nowIso
    };

    const filteredHistory = this.state.history.filter(
      (item) => !(item.seriesId === seriesId && item.chapterId === chapterId)
    );
    filteredHistory.unshift({
      id: `hist-${Date.now()}`,
      seriesId,
      chapterId,
      page: pageNum,
      totalPages,
      timestamp: nowIso
    });
    this.state.history = filteredHistory.slice(0, 60);

    this._save();
    return this.state.chapterProgress[chapterId];
  }

  toggleChapterCompleted(seriesId, chapter) {
    const existing = this.getChapterProgress(chapter.id);
    const willComplete = !(existing && existing.completed);
    const nowIso = new Date().toISOString();

    if (willComplete) {
      this.state.chapterProgress[chapter.id] = {
        seriesId,
        chapterId: chapter.id,
        currentPage: chapter.pagesCount,
        totalPages: chapter.pagesCount,
        completed: true,
        updatedAt: nowIso
      };
    } else {
      delete this.state.chapterProgress[chapter.id];
    }
    this._save();
    return willComplete;
  }

  getSeriesProgressStats(series) {
    const chapters = series.chapters || [];
    const totalChapters = chapters.length;
    if (totalChapters === 0) {
      return {
        readChapters: 0,
        totalChapters: 0,
        percentage: 0,
        lastReadChapter: null,
        nextChapterToRead: null,
        resumePage: 1,
        hasStarted: false
      };
    }

    let readChapters = 0;
    let totalPagesAll = 0;
    let readPagesAll = 0;
    let lastReadChapter = null;
    let lastUpdatedTime = 0;

    for (const ch of chapters) {
      totalPagesAll += ch.pagesCount;
      const prog = this.getChapterProgress(ch.id);
      if (prog) {
        if (prog.completed) {
          readChapters += 1;
          readPagesAll += ch.pagesCount;
        } else {
          readPagesAll += prog.currentPage;
        }
        const t = new Date(prog.updatedAt || 0).getTime();
        if (t >= lastUpdatedTime) {
          lastUpdatedTime = t;
          lastReadChapter = { chapter: ch, progress: prog };
        }
      }
    }

    const percentage =
      totalPagesAll > 0 ? Math.round((readPagesAll / totalPagesAll) * 100) : 0;

    let nextChapterToRead = chapters[0];
    let resumePage = 1;

    if (lastReadChapter) {
      if (!lastReadChapter.progress.completed) {
        nextChapterToRead = lastReadChapter.chapter;
        resumePage = lastReadChapter.progress.currentPage;
      } else {
        const idx = chapters.findIndex((c) => c.id === lastReadChapter.chapter.id);
        if (idx >= 0 && idx + 1 < chapters.length) {
          nextChapterToRead = chapters[idx + 1];
          resumePage = 1;
        } else {
          nextChapterToRead = lastReadChapter.chapter;
          resumePage = 1;
        }
      }
    } else {
      const firstUnread = chapters.find((c) => {
        const p = this.getChapterProgress(c.id);
        return !p || !p.completed;
      });
      if (firstUnread) nextChapterToRead = firstUnread;
    }

    return {
      readChapters,
      totalChapters,
      percentage,
      lastReadChapter,
      nextChapterToRead,
      resumePage,
      hasStarted: readPagesAll > 0
    };
  }

  // =========================================================================
  // Historial y Preferencias del Lector
  // =========================================================================

  getHistory() {
    return this.state.history || [];
  }

  removeHistoryEntry(entryId) {
    this.state.history = this.state.history.filter((item) => item.id !== entryId);
    this._save();
  }

  clearHistory() {
    this.state.history = [];
    this._save();
  }

  getReaderSettings() {
    return (
      this.state.readerSettings || {
        fitMode: 'contain',
        readingMode: 'paged',
        direction: 'ltr',
        zoom: 100
      }
    );
  }

  updateReaderSettings(partial) {
    this.state.readerSettings = {
      ...this.getReaderSettings(),
      ...partial
    };
    this._save();
    return this.state.readerSettings;
  }

  // =========================================================================
  // Exportación y Restauración Segura de Copia de Seguridad (JSON)
  // =========================================================================

  exportBackupJson() {
    const payload = {
      app: 'MangaShelf',
      backupVersion: 2,
      exportedAt: new Date().toISOString(),
      state: this.state
    };
    return JSON.stringify(payload, null, 2);
  }

  importBackupJson(jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('El archivo seleccionado no es un documento JSON válido.');
    }

    const incomingState = parsed.state || parsed;
    if (
      !incomingState ||
      !Array.isArray(incomingState.libraryIds) ||
      !Array.isArray(incomingState.favoriteIds) ||
      typeof incomingState.chapterProgress !== 'object'
    ) {
      throw new Error(
        'El archivo JSON no tiene la estructura de copia de seguridad de MangaShelf.'
      );
    }

    const defaults = this._getDefaultState();
    const mergedState = {
      ...defaults,
      ...incomingState,
      libraryIds: incomingState.libraryIds.map(String),
      favoriteIds: incomingState.favoriteIds.map(String),
      availableTags: Array.isArray(incomingState.availableTags)
        ? incomingState.availableTags.map(String)
        : defaults.availableTags,
      seriesTags:
        incomingState.seriesTags && typeof incomingState.seriesTags === 'object'
          ? incomingState.seriesTags
          : defaults.seriesTags,
      readerSettings: {
        ...defaults.readerSettings,
        ...(incomingState.readerSettings || {})
      }
    };

    this._save(mergedState);
    return mergedState;
  }

  resetToDemoDefaults() {
    const defaults = this._getDefaultState();
    this._save(defaults);
    return defaults;
  }
}
