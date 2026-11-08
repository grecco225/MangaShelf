/**
 * MangaShelf — Controlador Principal de Producción (PWA v2)
 * ---------------------------------------------------------------------------
 * Conecta:
 * - Biblioteca personal con búsqueda, filtros de estado, géneros, favoritos y etiquetas.
 * - Importador nativo de archivos locales (.CBZ, .ZIP, .EPUB, .PDF e imágenes)
 *   persistidos en IndexedDB (`MangaShelfBinaryDB`).
 * - Integración con APIs públicas legales de Dominio Público (Internet Archive
 *   y Project Gutenberg / Gutendex) con fallback automático sin conexión.
 * - Descarga real de capítulos en IndexedDB para lectura 100% offline.
 * - Lector móvil configurable (Paginado, Vertical/Cascada, Dirección LTR/RTL, Zoom).
 * - Exportación y restauración segura de copia de seguridad en JSON.
 */

import { SourceRegistry } from './providers/SourceProvider.js';
import { StorageService } from './storage/StorageService.js';
import { IndexedDbService } from './storage/IndexedDbService.js';

class MangaShelfApp {
  constructor() {
    this.idb = new IndexedDbService();
    this.registry = new SourceRegistry(this.idb);
    this.allSeries = [];
    this.storage = null;
    this.offlineChapterKeys = new Set();

    // Estado de navegación y filtros
    this.currentTab = 'library'; // 'library' | 'explore' | 'updates' | 'history'
    this.selectedSeriesId = null;
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.genreFilter = 'all';
    this.tagFilter = 'all';
    this.onlyFavorites = false;
    this.updatesShowAllCatalog = false;

    // Estado de consulta a APIs públicas en Explorar
    this.apiStatusText = '';
    this.apiStatusError = false;
    this.apiLoading = false;

    // Estado del lector activo
    this.readerState = {
      isOpen: false,
      series: null,
      chapter: null,
      pages: [],
      currentPage: 1,
      hudVisible: true
    };

    this.deferredInstallPrompt = null;
  }

  async init() {
    try {
      await this.registry.initializeLocalData();
      this.allSeries = await this.registry.getAllSeries();
      this.storage = new StorageService(this.allSeries);
      this.offlineChapterKeys = await this.idb.getAllOfflineChapterKeys();

      this._populateFilterSelects();
      this._bindNavigationEvents();
      this._bindFilterEvents();
      this._bindReaderEvents();
      this._bindModalsAndActions();
      this._setupNetworkMonitoring();
      this._setupPwaInstallAndServiceWorker();
      await this._updateStorageEstimateUI();

      const initialHash = window.location.hash.replace('#', '');
      if (['library', 'explore', 'updates', 'history'].includes(initialHash)) {
        this.currentTab = initialHash;
      }

      this.render();
    } catch (err) {
      console.error('Error al inicializar MangaShelf:', err);
      this.showToast('Error al inicializar la aplicación.', true);
    }
  }

  // =========================================================================
  // Utilidades
  // =========================================================================

  _normalize(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  _escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  _formatRelativeOrDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: isoString.includes('T') ? '2-digit' : undefined,
      minute: isoString.includes('T') ? '2-digit' : undefined
    });
  }

  showToast(message, isError = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg${isError ? ' error' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 3200);
  }

  async _updateStorageEstimateUI() {
    const el = document.getElementById('storage-usage-text');
    const est = await this.idb.getStorageUsageEstimate();
    if (el && est) {
      el.textContent = `Almacenamiento local en uso: ${est.usageMB} MB • Descargas offline: ${this.offlineChapterKeys.size} cap(s).`;
    }
  }

  _isChapterDownloaded(seriesId, chapterId) {
    return this.offlineChapterKeys.has(`${seriesId}::${chapterId}`);
  }

  // =========================================================================
  // Red (En línea / Sin conexión) y PWA
  // =========================================================================

  _setupNetworkMonitoring() {
    const badge = document.getElementById('network-status');
    const text = document.getElementById('network-status-text');
    const banner = document.getElementById('offline-banner');

    const updateStatus = (notify = false) => {
      const online = navigator.onLine;
      if (badge && text) {
        badge.className = `network-badge ${online ? 'online' : 'offline'}`;
        text.textContent = online ? 'En línea' : 'Sin conexión';
      }
      if (banner) {
        banner.classList.toggle('hidden', online);
      }
      if (notify) {
        this.showToast(
          online
            ? 'Conexión restablecida. Estás en línea.'
            : 'Sin conexión: operando en modo offline con tus datos locales.'
        );
      }
    };

    window.addEventListener('online', () => updateStatus(true));
    window.addEventListener('offline', () => updateStatus(true));
    updateStatus(false);
  }

  _isAppInstalled() {
    const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
    const isMinimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
    const isIosStandalone = window.navigator.standalone === true;
    return isStandaloneMedia || isMinimalUi || isIosStandalone;
  }

  _setupPwaInstallAndServiceWorker() {
    const installBtn = document.getElementById('install-pwa-btn');

    const syncInstallButtonVisibility = () => {
      if (!installBtn) return;
      if (this._isAppInstalled()) {
        installBtn.classList.add('hidden');
      } else {
        installBtn.classList.remove('hidden');
      }
    };

    syncInstallButtonVisibility();

    window
      .matchMedia('(display-mode: standalone)')
      .addEventListener('change', syncInstallButtonVisibility);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      syncInstallButtonVisibility();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      if (installBtn) installBtn.classList.add('hidden');
      this.showToast('¡MangaShelf se ha instalado correctamente en tu dispositivo!');
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (this.deferredInstallPrompt) {
          this.deferredInstallPrompt.prompt();
          const { outcome } = await this.deferredInstallPrompt.userChoice;
          if (outcome === 'accepted') {
            this.deferredInstallPrompt = null;
            installBtn.classList.add('hidden');
          }
        } else {
          document.getElementById('install-help-modal')?.classList.remove('hidden');
        }
      });
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then(() => console.log('Service Worker MangaShelf v2 activo.'))
          .catch((err) => console.warn('Aviso Service Worker:', err));
      });
    }
  }

  // =========================================================================
  // Selectores de Género, Etiquetas y Filtros
  // =========================================================================

  _populateFilterSelects() {
    const genreSelect = document.getElementById('genre-select');
    if (genreSelect) {
      const genresSet = new Set();
      for (const s of this.allSeries) {
        for (const g of s.genres || []) genresSet.add(g);
      }
      const sortedGenres = Array.from(genresSet).sort((a, b) => a.localeCompare(b, 'es'));
      genreSelect.innerHTML =
        '<option value="all">Todos los géneros</option>' +
        sortedGenres
          .map(
            (g) =>
              `<option value="${this._escapeHtml(g)}" ${
                this.genreFilter === g ? 'selected' : ''
              }>${this._escapeHtml(g)}</option>`
          )
          .join('');
    }

    const tagSelect = document.getElementById('tag-select');
    if (tagSelect && this.storage) {
      const tags = this.storage.getAvailableTags();
      tagSelect.innerHTML =
        '<option value="all">Todas las etiquetas</option>' +
        tags
          .map(
            (t) =>
              `<option value="${this._escapeHtml(t)}" ${
                this.tagFilter === t ? 'selected' : ''
              }>🏷 ${this._escapeHtml(t)}</option>`
          )
          .join('');
    }
  }

  _bindNavigationEvents() {
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-nav');
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    this.selectedSeriesId = null;
    window.history.replaceState(null, '', `#${tabName}`);
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openSeriesDetail(seriesId) {
    this.selectedSeriesId = seriesId;
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  _bindFilterEvents() {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    const genreSelect = document.getElementById('genre-select');
    const tagSelect = document.getElementById('tag-select');
    const favBtn = document.getElementById('favorites-filter-btn');
    const statusPills = document.querySelectorAll('.status-pill');

    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      clearBtn?.classList.toggle('hidden', !this.searchQuery);
      this.renderMainContent();
    });

    clearBtn?.addEventListener('click', () => {
      this.searchQuery = '';
      if (searchInput) searchInput.value = '';
      clearBtn.classList.add('hidden');
      this.renderMainContent();
    });

    genreSelect?.addEventListener('change', (e) => {
      this.genreFilter = e.target.value;
      this.renderMainContent();
    });

    tagSelect?.addEventListener('change', (e) => {
      this.tagFilter = e.target.value;
      this.renderMainContent();
    });

    favBtn?.addEventListener('click', () => {
      this.onlyFavorites = !this.onlyFavorites;
      favBtn.classList.toggle('active', this.onlyFavorites);
      favBtn.setAttribute('aria-pressed', String(this.onlyFavorites));
      this.renderMainContent();
    });

    statusPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        statusPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.statusFilter = pill.getAttribute('data-status') || 'all';
        this.renderMainContent();
      });
    });
  }

  _resetFilters() {
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.genreFilter = 'all';
    this.tagFilter = 'all';
    this.onlyFavorites = false;

    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    const genreSelect = document.getElementById('genre-select');
    const tagSelect = document.getElementById('tag-select');
    const favBtn = document.getElementById('favorites-filter-btn');
    const statusPills = document.querySelectorAll('.status-pill');

    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    if (genreSelect) genreSelect.value = 'all';
    if (tagSelect) tagSelect.value = 'all';
    if (favBtn) {
      favBtn.classList.remove('active');
      favBtn.setAttribute('aria-pressed', 'false');
    }
    statusPills.forEach((p) => {
      p.classList.toggle('active', p.getAttribute('data-status') === 'all');
    });

    this.renderMainContent();
  }

  _filterSeriesList(seriesList) {
    const q = this._normalize(this.searchQuery);

    return seriesList.filter((series) => {
      if (this.statusFilter !== 'all' && series.status !== this.statusFilter) {
        return false;
      }
      if (this.genreFilter !== 'all' && !(series.genres || []).includes(this.genreFilter)) {
        return false;
      }
      const seriesTags = this.storage.getSeriesTags(series.id);
      if (this.tagFilter !== 'all' && !seriesTags.includes(this.tagFilter)) {
        return false;
      }
      if (this.onlyFavorites && !this.storage.isFavorite(series.id)) {
        return false;
      }
      if (q) {
        const titleMatch = this._normalize(series.title).includes(q);
        const authorMatch = this._normalize(series.author).includes(q);
        const genreMatch = (series.genres || []).some((g) => this._normalize(g).includes(q));
        const tagMatch = seriesTags.some((t) => this._normalize(t).includes(q));
        if (!titleMatch && !authorMatch && !genreMatch && !tagMatch) {
          return false;
        }
      }
      return true;
    });
  }

  // =========================================================================
  // Renderizado Principal
  // =========================================================================

  render() {
    this._populateFilterSelects();
    this._updateNavBadgesAndActiveStates();
    this._updateHeaderAndFilterVisibility();
    this.renderMainContent();
  }

  _updateNavBadgesAndActiveStates() {
    const libraryCount = this.allSeries.filter((s) => this.storage.isInLibrary(s.id)).length;
    const exploreCount = this.allSeries.length;

    let unreadChaptersInLib = 0;
    this.allSeries
      .filter((s) => this.storage.isInLibrary(s.id))
      .forEach((s) => {
        s.chapters.forEach((ch) => {
          const p = this.storage.getChapterProgress(ch.id);
          if (!p || !p.completed) unreadChaptersInLib += 1;
        });
      });

    const libBadge = document.getElementById('sidebar-library-count');
    const mobLibBadge = document.getElementById('mobile-library-count');
    const expBadge = document.getElementById('sidebar-explore-count');
    const updBadge = document.getElementById('sidebar-updates-count');

    if (libBadge) libBadge.textContent = String(libraryCount);
    if (mobLibBadge) mobLibBadge.textContent = String(libraryCount);
    if (expBadge) expBadge.textContent = String(exploreCount);
    if (updBadge) updBadge.textContent = String(unreadChaptersInLib);

    document.querySelectorAll('[data-nav]').forEach((btn) => {
      const isMatch = btn.getAttribute('data-nav') === this.currentTab && !this.selectedSeriesId;
      btn.classList.toggle('active', isMatch);
    });
  }

  _updateHeaderAndFilterVisibility() {
    const titleEl = document.getElementById('screen-title');
    const subtitleEl = document.getElementById('screen-subtitle');
    const filtersSection = document.getElementById('filters-section');

    if (this.selectedSeriesId) {
      const series = this.allSeries.find((s) => s.id === this.selectedSeriesId);
      if (titleEl) titleEl.textContent = series ? series.title : 'Ficha de Serie';
      if (subtitleEl) {
        subtitleEl.textContent = 'Ficha completa, etiquetas, descarga offline y capítulos';
      }
      filtersSection?.classList.add('hidden');
      return;
    }

    const showFilters = this.currentTab === 'library' || this.currentTab === 'explore';
    filtersSection?.classList.toggle('hidden', !showFilters);

    const headers = {
      library: {
        title: 'Biblioteca Personal',
        subtitle: 'Tus series, archivos CBZ/EPUB/PDF importados, favoritos y etiquetas'
      },
      explore: {
        title: 'Explorar y Fuentes Legales',
        subtitle: 'Catálogo de demostración y conexión a repositorios abiertos de Dominio Público'
      },
      updates: {
        title: 'Capítulos y Descargas Offline',
        subtitle: 'Gestiona la lectura sin conexión y revisa los últimos capítulos'
      },
      history: {
        title: 'Historial de Lectura',
        subtitle: 'Retoma exactamente la página donde dejaste tu última sesión'
      }
    };

    const meta = headers[this.currentTab] || headers.library;
    if (titleEl) titleEl.textContent = meta.title;
    if (subtitleEl) subtitleEl.textContent = meta.subtitle;
  }

  renderMainContent() {
    const container = document.getElementById('main-content');
    if (!container) return;

    if (this.selectedSeriesId) {
      this._renderSeriesDetailView(container);
      return;
    }

    switch (this.currentTab) {
      case 'library':
        this._renderLibraryView(container);
        break;
      case 'explore':
        this._renderExploreView(container);
        break;
      case 'updates':
        this._renderUpdatesView(container);
        break;
      case 'history':
        this._renderHistoryView(container);
        break;
      default:
        this._renderLibraryView(container);
    }
  }

  // =========================================================================
  // Pantalla 1: Biblioteca Personal
  // =========================================================================

  _renderLibraryView(container) {
    const librarySeries = this.allSeries.filter((s) => this.storage.isInLibrary(s.id));
    const filtered = this._filterSeriesList(librarySeries);

    const favCount = librarySeries.filter((s) => this.storage.isFavorite(s.id)).length;
    const importedCount = this.allSeries.filter((s) => s.isLocalFile).length;
    let totalReadChapters = 0;
    this.allSeries.forEach((s) => {
      totalReadChapters += this.storage.getSeriesProgressStats(s).readChapters;
    });

    const statsHtml = `
      <div class="stats-strip">
        <div class="stat-card">
          <span class="stat-value">${librarySeries.length}</span>
          <span class="stat-label">En tu Biblioteca</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${favCount}</span>
          <span class="stat-label">Favoritas ♥</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${importedCount}</span>
          <span class="stat-label">Archivos Locales (CBZ/EPUB/PDF)</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">${this.offlineChapterKeys.size}</span>
          <span class="stat-label">Capítulos Offline (${totalReadChapters} leídos)</span>
        </div>
      </div>
    `;

    if (librarySeries.length === 0) {
      container.innerHTML = `
        ${statsHtml}
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <h3>Tu Biblioteca está vacía</h3>
          <p>Puedes importar tus propios archivos (.CBZ, .EPUB, .PDF o imágenes), explorar obras de Dominio Público o restaurar la biblioteca de muestra.</p>
          <div class="detail-actions">
            <button type="button" class="btn-primary" id="empty-import-btn">📥 Importar Archivo Local</button>
            <button type="button" class="btn-secondary" id="empty-go-explore-btn">Ir a Explorar Fuentes</button>
            <button type="button" class="btn-subtle" id="empty-restore-demo-btn">Restaurar Demo</button>
          </div>
        </div>
      `;
      container.querySelector('#empty-import-btn')?.addEventListener('click', () => {
        document.getElementById('local-import-modal')?.classList.remove('hidden');
      });
      container
        .querySelector('#empty-go-explore-btn')
        ?.addEventListener('click', () => this.switchTab('explore'));
      container
        .querySelector('#empty-restore-demo-btn')
        ?.addEventListener('click', () => this._handleResetDemo());
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        ${statsHtml}
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>Ninguna serie coincide con los filtros</h3>
          <p>Prueba a limpiar la búsqueda, el filtro de estado o la etiqueta seleccionada.</p>
          <button type="button" class="btn-primary" id="reset-filters-btn">Limpiar búsqueda y filtros</button>
        </div>
      `;
      container
        .querySelector('#reset-filters-btn')
        ?.addEventListener('click', () => this._resetFilters());
      return;
    }

    container.innerHTML = `
      ${statsHtml}
      <div class="series-grid">
        ${filtered.map((s) => this._buildSeriesCardHtml(s)).join('')}
      </div>
    `;

    this._attachSeriesCardListeners(container);
  }

  // =========================================================================
  // Pantalla 2: Explorar y Fuentes Abiertas (Dominio Público + Local)
  // =========================================================================

  _renderExploreView(container) {
    const filtered = this._filterSeriesList(this.allSeries);

    const apiPanelHtml = `
      <div class="api-sources-panel">
        <div class="api-sources-header">
          <div>
            <h3>Fuentes Autorizadas, Dominio Público y Archivos del Usuario</h3>
            <p class="chapter-meta">
              Consulta en vivo las APIs públicas gratuitas de <strong>Internet Archive (archive.org)</strong> y <strong>Project Gutenberg (gutendex.com)</strong> sin claves privadas, o importa tus archivos <code>.CBZ</code>, <code>.EPUB</code> y <code>.PDF</code>. Si estás sin conexión, el catálogo local sigue disponible.
            </p>
          </div>
          <button type="button" class="btn-primary" id="explore-import-local-btn">
            📥 Importar CBZ / EPUB / PDF
          </button>
        </div>

        <div class="api-controls-row">
          <input
            type="search"
            id="public-api-query"
            class="api-query-input"
            placeholder="Término para buscar en Dominio Público (ej. nemo, adventure, sci-fi, classic)..."
            value="comic"
          />
          <button type="button" class="btn-secondary" id="query-ia-api-btn" ${
            this.apiLoading ? 'disabled' : ''
          }>
            🌐 Buscar en Archive.org API
          </button>
          <button type="button" class="btn-secondary" id="query-gutendex-api-btn" ${
            this.apiLoading ? 'disabled' : ''
          }>
            📖 Buscar en Project Gutenberg API
          </button>
        </div>

        ${
          this.apiStatusText
            ? `<div class="api-status-msg ${this.apiStatusError ? 'error' : ''}">${this._escapeHtml(
                this.apiStatusText
              )}</div>`
            : ''
        }
      </div>
    `;

    if (filtered.length === 0) {
      container.innerHTML = `
        ${apiPanelHtml}
        <div class="empty-state">
          <div class="empty-icon">🧭</div>
          <h3>No se encontraron obras con esos filtros</h3>
          <p>Limpia los filtros de la barra superior o realiza una búsqueda en las APIs de Dominio Público.</p>
          <button type="button" class="btn-primary" id="explore-reset-filters-btn">Mostrar todas las obras</button>
        </div>
      `;
      container
        .querySelector('#explore-reset-filters-btn')
        ?.addEventListener('click', () => this._resetFilters());
    } else {
      container.innerHTML = `
        ${apiPanelHtml}
        <div class="series-grid">
          ${filtered.map((s) => this._buildSeriesCardHtml(s)).join('')}
        </div>
      `;
      this._attachSeriesCardListeners(container);
    }

    container.querySelector('#explore-import-local-btn')?.addEventListener('click', () => {
      document.getElementById('local-import-modal')?.classList.remove('hidden');
    });

    // Conectar búsqueda en vivo contra Internet Archive Public Domain API
    container.querySelector('#query-ia-api-btn')?.addEventListener('click', async () => {
      const qInput = container.querySelector('#public-api-query');
      const term = qInput?.value?.trim() || 'comic';
      this.apiLoading = true;
      this.apiStatusError = false;
      this.apiStatusText = `Consultando API pública de Internet Archive para «${term}»...`;
      this.renderMainContent();

      try {
        await this.registry.iaProvider.searchPublicDomain(term);
        this.allSeries = await this.registry.getAllSeries();
        this.apiStatusText = `✓ Catálogo actualizado desde Archive.org API para «${term}».`;
        this.showToast('Resultados de Dominio Público cargados desde Archive.org');
      } catch (err) {
        this.apiStatusError = true;
        this.apiStatusText = err.message;
        this.showToast('Usando catálogo local de respaldo (Archive.org no disponible).', true);
      } finally {
        this.apiLoading = false;
        this.render();
      }
    });

    // Conectar búsqueda en vivo contra Project Gutenberg (Gutendex API)
    container.querySelector('#query-gutendex-api-btn')?.addEventListener('click', async () => {
      const qInput = container.querySelector('#public-api-query');
      const term = qInput?.value?.trim() || 'adventure';
      this.apiLoading = true;
      this.apiStatusError = false;
      this.apiStatusText = `Consultando API abierta Gutendex (Project Gutenberg) para «${term}»...`;
      this.renderMainContent();

      try {
        const found = await this.registry.gutendexProvider.fetchPublicDomainBooks(term);
        this.allSeries = await this.registry.getAllSeries();
        this.apiStatusText = `✓ Se integraron ${found.length} obras de Dominio Público desde Project Gutenberg.`;
        this.showToast('Obras de Project Gutenberg añadidas al catálogo.');
      } catch (err) {
        this.apiStatusError = true;
        this.apiStatusText = err.message;
        this.showToast('No se pudo conectar a Gutendex. Catálogo local activo.', true);
      } finally {
        this.apiLoading = false;
        this.render();
      }
    });
  }

  // =========================================================================
  // Construcción de Tarjetas de Serie
  // =========================================================================

  _buildSeriesCardHtml(series) {
    const inLib = this.storage.isInLibrary(series.id);
    const isFav = this.storage.isFavorite(series.id);
    const stats = this.storage.getSeriesProgressStats(series);
    const tags = this.storage.getSeriesTags(series.id);

    const statusClass =
      series.status === 'En curso'
        ? 'en-curso'
        : series.status === 'Completado'
        ? 'completado'
        : 'pendiente';

    const nextChap = stats.nextChapterToRead;
    const readButtonLabel = stats.hasStarted
      ? `Continuar Cap. ${nextChap.number}`
      : `Leer Cap. ${nextChap ? nextChap.number : 1}`;

    let originBadge = 'DEMO';
    if (series.isLocalFile) {
      originBadge = series.fileFormat || 'LOCAL';
    } else if (series.isPublicDomain) {
      originBadge = 'DOMINIO PÚBLICO';
    }

    const hasOfflineChap = series.chapters.some(
      (c) => this._isChapterDownloaded(series.id, c.id) || series.isLocalFile
    );

    return `
      <article class="series-card" data-series-id="${this._escapeHtml(series.id)}">
        <div class="card-cover-wrap" data-action="open-detail">
          <img
            src="${series.coverUrl}"
            alt="Portada de ${this._escapeHtml(series.title)}"
            class="card-cover-img"
            loading="lazy"
          />
          <div class="card-Quick-actions">
            <button
              type="button"
              class="card-icon-btn ${isFav ? 'fav-active' : ''}"
              data-action="toggle-fav"
              title="${isFav ? 'Quitar de favoritos' : 'Marcar como favorito'}"
              aria-label="Favorito"
            >
              ${isFav ? '♥' : '♡'}
            </button>
            <button
              type="button"
              class="card-icon-btn ${inLib ? 'lib-active' : ''}"
              data-action="toggle-lib"
              title="${inLib ? 'Quitar de la biblioteca' : 'Añadir a la biblioteca'}"
              aria-label="Biblioteca"
            >
              ${inLib ? '✓' : '+'}
            </button>
          </div>
          <span class="card-chapters-pill">${series.chapters.length} cap${
      series.chapters.length === 1 ? '.' : 's.'
    }${hasOfflineChap ? ' • ✓ Offline' : ''}</span>
        </div>

        <div class="card-body">
          <div class="card-status-row">
            <span class="status-tag ${statusClass}">${this._escapeHtml(series.status)}</span>
            <span class="demo-pill">${this._escapeHtml(originBadge)}</span>
          </div>

          <h3 class="card-title" data-action="open-detail">${this._escapeHtml(series.title)}</h3>
          <p class="card-author">${this._escapeHtml(series.author)}</p>

          <div class="card-genres">
            ${(series.genres || [])
              .slice(0, 2)
              .map((g) => `<span class="genre-chip">${this._escapeHtml(g)}</span>`)
              .join('')}
            ${tags
              .slice(0, 2)
              .map((t) => `<span class="tag-chip">🏷 ${this._escapeHtml(t)}</span>`)
              .join('')}
          </div>

          <div class="card-progress-box">
            <div class="progress-meta">
              <span>Progreso: ${stats.readChapters}/${stats.totalChapters} caps.</span>
              <span>${stats.percentage}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${stats.percentage}%"></div>
            </div>
          </div>

          <div class="card-actions-row">
            <button
              type="button"
              class="btn-card-read"
              data-action="quick-read"
              data-chapter-id="${nextChap ? this._escapeHtml(nextChap.id) : ''}"
              data-resume-page="${stats.resumePage || 1}"
            >
              ▶ ${readButtonLabel}
            </button>
            <button
              type="button"
              class="btn-card-lib ${inLib ? 'in-lib' : ''}"
              data-action="toggle-lib"
            >
              ${inLib ? 'En Biblio.' : '+ Biblio.'}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  _attachSeriesCardListeners(container) {
    container.querySelectorAll('.series-card').forEach((card) => {
      const seriesId = card.getAttribute('data-series-id');
      if (!seriesId) return;

      card.querySelectorAll('[data-action="open-detail"]').forEach((el) => {
        el.addEventListener('click', () => this.openSeriesDetail(seriesId));
      });

      card.querySelectorAll('[data-action="toggle-fav"]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const series = this.allSeries.find((s) => s.id === seriesId);
          const nowFav = this.storage.toggleFavorite(seriesId);
          this.showToast(
            nowFav
              ? `«${series?.title}» añadida a Favoritos ♥`
              : `«${series?.title}» quitada de Favoritos.`
          );
          this.render();
        });
      });

      card.querySelectorAll('[data-action="toggle-lib"]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const series = this.allSeries.find((s) => s.id === seriesId);
          const nowInLib = this.storage.toggleLibrary(seriesId);
          this.showToast(
            nowInLib
              ? `«${series?.title}» añadida a tu Biblioteca.`
              : `«${series?.title}» eliminada de tu Biblioteca.`
          );
          this.render();
        });
      });

      const quickReadBtn = card.querySelector('[data-action="quick-read"]');
      if (quickReadBtn) {
        quickReadBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const chapterId = quickReadBtn.getAttribute('data-chapter-id');
          const resumePage = Number(quickReadBtn.getAttribute('data-resume-page')) || 1;
          if (chapterId) {
            this.openReader(seriesId, chapterId, resumePage);
          }
        });
      }
    });
  }

  // =========================================================================
  // Ficha Detallada de Serie (con Etiquetas y Descarga Offline)
  // =========================================================================

  _renderSeriesDetailView(container) {
    const series = this.allSeries.find((s) => s.id === this.selectedSeriesId);
    if (!series) {
      this.selectedSeriesId = null;
      this.renderMainContent();
      return;
    }

    const inLib = this.storage.isInLibrary(series.id);
    const isFav = this.storage.isFavorite(series.id);
    const stats = this.storage.getSeriesProgressStats(series);
    const activeTags = this.storage.getSeriesTags(series.id);
    const allTags = this.storage.getAvailableTags();

    const statusClass =
      series.status === 'En curso'
        ? 'en-curso'
        : series.status === 'Completado'
        ? 'completado'
        : 'pendiente';

    const nextChap = stats.nextChapterToRead;
    const primaryReadText = stats.hasStarted
      ? `Continuar Cap. ${nextChap.number} (Pág. ${stats.resumePage})`
      : `Empezar a leer (Cap. 1)`;

    container.innerHTML = `
      <div class="detail-container">
        <button type="button" class="btn-back" id="detail-back-btn">
          ◀ Volver a ${this.currentTab === 'explore' ? 'Explorar' : 'Biblioteca'}
        </button>

        <section class="detail-hero">
          <img
            src="${series.coverUrl}"
            alt="Portada de ${this._escapeHtml(series.title)}"
            class="detail-cover"
          />

          <div class="detail-info">
            <div class="detail-badges">
              <span class="status-tag ${statusClass}">${this._escapeHtml(series.status)}</span>
              <span class="demo-pill">${
                series.isLocalFile
                  ? `ARCHIVO LOCAL (${this._escapeHtml(series.fileFormat)})`
                  : series.isPublicDomain
                  ? 'DOMINIO PÚBLICO AUTORIZADO'
                  : 'CONTENIDO DEMO'
              }</span>
              <span class="genre-chip">Año ${series.releaseYear}</span>
            </div>

            <h2 class="detail-title">${this._escapeHtml(series.title)}</h2>
            <p class="detail-author">Autor/a: <strong>${this._escapeHtml(
              series.author
            )}</strong> • Origen: ${this._escapeHtml(series.sourceName || 'Local')}</p>

            <div class="card-genres">
              ${(series.genres || [])
                .map((g) => `<span class="genre-chip">${this._escapeHtml(g)}</span>`)
                .join('')}
            </div>

            <div class="detail-synopsis">
              ${this._escapeHtml(series.synopsis)}
            </div>

            <!-- Gestor de Etiquetas Personalizadas -->
            <div class="tags-manager-box">
              <span class="filter-label">Etiquetas de organización (toca para asignar o quitar):</span>
              <div class="tags-manager-row">
                ${allTags
                  .map((tag) => {
                    const isAssigned = activeTags.includes(tag);
                    return `<button type="button" class="tag-toggle-btn ${
                      isAssigned ? 'active' : ''
                    }" data-tag="${this._escapeHtml(tag)}">🏷 ${this._escapeHtml(tag)}</button>`;
                  })
                  .join('')}
                <div class="new-tag-inline">
                  <input type="text" id="new-custom-tag-input" placeholder="+ Nueva etiqueta..." maxlength="24" />
                  <button type="button" class="btn-subtle" id="add-custom-tag-btn">Añadir</button>
                </div>
              </div>
            </div>

            <div class="card-progress-box">
              <div class="progress-meta">
                <span>Progreso general: ${stats.readChapters} de ${
      stats.totalChapters
    } capítulos completados</span>
                <span>${stats.percentage}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${stats.percentage}%"></div>
              </div>
            </div>

            <div class="detail-actions">
              <button type="button" class="btn-primary" id="detail-read-btn">
                ▶ ${primaryReadText}
              </button>
              <button
                type="button"
                class="btn-secondary ${inLib ? 'active-lib' : ''}"
                id="detail-toggle-lib-btn"
              >
                ${inLib ? '✓ En tu Biblioteca' : '+ Añadir a Biblioteca'}
              </button>
              <button
                type="button"
                class="btn-secondary ${isFav ? 'active-fav' : ''}"
                id="detail-toggle-fav-btn"
              >
                ${isFav ? '♥ Favorita' : '♡ Favorito'}
              </button>
              ${
                series.isLocalFile
                  ? `<button type="button" class="btn-subtle" id="detail-delete-local-btn" title="Eliminar este archivo importado de IndexedDB">🗑 Eliminar archivo importado</button>`
                  : ''
              }
            </div>
          </div>
        </section>

        <section class="chapters-section">
          <div class="chapters-header">
            <h3>Capítulos (${series.chapters.length})</h3>
            <span class="chapter-meta">Puedes descargar cualquier capítulo para leerlo sin conexión</span>
          </div>

          <div class="chapters-list">
            ${series.chapters
              .map((ch) => {
                const prog = this.storage.getChapterProgress(ch.id);
                const isOffline =
                  series.isLocalFile || this._isChapterDownloaded(series.id, ch.id);

                let badgeText = `${ch.pagesCount} págs • Sin leer`;
                let badgeClass = '';
                let startPage = 1;

                if (prog) {
                  if (prog.completed) {
                    badgeText = `✓ Completado (${ch.pagesCount}/${ch.pagesCount})`;
                    badgeClass = 'done';
                    startPage = 1;
                  } else {
                    badgeText = `En lectura: Pág. ${prog.currentPage}/${ch.pagesCount}`;
                    badgeClass = 'reading';
                    startPage = prog.currentPage;
                  }
                }

                return `
                  <div class="chapter-item ${
                    prog?.completed ? 'completed' : ''
                  }" data-chapter-id="${this._escapeHtml(ch.id)}">
                    <div class="chapter-main-info" data-action="read-chapter" data-start-page="${startPage}">
                      <div class="chapter-title-row">
                        <span class="chapter-num">Capítulo ${ch.number}</span>
                        <span class="chapter-name">${this._escapeHtml(ch.title)}</span>
                        ${
                          isOffline
                            ? '<span class="chapter-offline-badge">✓ Disponible Offline</span>'
                            : ''
                        }
                      </div>
                      <p class="chapter-meta">${this._escapeHtml(
                        ch.summary || ''
                      )} • Fecha: ${this._formatRelativeOrDate(ch.releaseDate)}</p>
                    </div>

                    <div class="chapter-right-actions">
                      <span class="chapter-progress-badge ${badgeClass}">${badgeText}</span>

                      ${
                        !series.isLocalFile
                          ? `<button type="button" class="btn-subtle" data-action="toggle-offline">
                              ${isOffline ? '🗑 Borrar Offline' : '⬇ Guardar Offline'}
                            </button>`
                          : ''
                      }

                      <button
                        type="button"
                        class="btn-subtle"
                        data-action="toggle-chapter-done"
                      >
                        ${prog?.completed ? 'Desmarcar' : '✓ Leído'}
                      </button>

                      <button
                        type="button"
                        class="btn-primary"
                        data-action="read-chapter"
                        data-start-page="${startPage}"
                      >
                        ${prog && !prog.completed ? 'Continuar' : 'Leer'}
                      </button>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </div>
        </section>
      </div>
    `;

    // Eventos de la ficha
    container.querySelector('#detail-back-btn')?.addEventListener('click', () => {
      this.selectedSeriesId = null;
      this.render();
    });

    container.querySelector('#detail-read-btn')?.addEventListener('click', () => {
      if (nextChap) {
        this.openReader(series.id, nextChap.id, stats.resumePage || 1);
      }
    });

    container.querySelector('#detail-toggle-lib-btn')?.addEventListener('click', () => {
      const added = this.storage.toggleLibrary(series.id);
      this.showToast(
        added
          ? `«${series.title}» añadida a tu Biblioteca.`
          : `«${series.title}» quitada de tu Biblioteca.`
      );
      this.render();
    });

    container.querySelector('#detail-toggle-fav-btn')?.addEventListener('click', () => {
      const fav = this.storage.toggleFavorite(series.id);
      this.showToast(
        fav
          ? `«${series.title}» marcada como Favorita ♥`
          : `«${series.title}» quitada de Favoritos.`
      );
      this.render();
    });

    container.querySelector('#detail-delete-local-btn')?.addEventListener('click', async () => {
      await this.registry.localProvider.removeImportedSeries(series.id);
      if (this.storage.isInLibrary(series.id)) {
        this.storage.toggleLibrary(series.id);
      }
      this.allSeries = await this.registry.getAllSeries();
      this.selectedSeriesId = null;
      await this._updateStorageEstimateUI();
      this.showToast(`Archivo «${series.title}» eliminado del almacenamiento local.`);
      this.render();
    });

    // Etiquetas
    container.querySelectorAll('.tag-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag');
        if (!tag) return;
        const assigned = this.storage.toggleTagOnSeries(series.id, tag);
        this.showToast(
          assigned
            ? `Etiqueta «${tag}» asignada a ${series.title}`
            : `Etiqueta «${tag}» quitada`
        );
        this.render();
      });
    });

    const addCustomTag = () => {
      const input = container.querySelector('#new-custom-tag-input');
      const val = input?.value?.trim();
      if (!val) return;
      this.storage.toggleTagOnSeries(series.id, val);
      this.showToast(`Etiqueta «${val}» creada y asignada.`);
      this.render();
    };

    container.querySelector('#add-custom-tag-btn')?.addEventListener('click', addCustomTag);
    container.querySelector('#new-custom-tag-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomTag();
      }
    });

    // Capítulos y descarga offline
    container.querySelectorAll('.chapter-item').forEach((row) => {
      const chapterId = row.getAttribute('data-chapter-id');
      const chapterObj = series.chapters.find((c) => c.id === chapterId);
      if (!chapterObj) return;

      row.querySelectorAll('[data-action="read-chapter"]').forEach((el) => {
        el.addEventListener('click', () => {
          const startPage = Number(el.getAttribute('data-start-page')) || 1;
          this.openReader(series.id, chapterObj.id, startPage);
        });
      });

      row.querySelector('[data-action="toggle-chapter-done"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const marked = this.storage.toggleChapterCompleted(series.id, chapterObj);
        this.showToast(
          marked
            ? `Capítulo ${chapterObj.number} marcado como completado.`
            : `Progreso del Capítulo ${chapterObj.number} reiniciado.`
        );
        this.render();
      });

      const offlineBtn = row.querySelector('[data-action="toggle-offline"]');
      if (offlineBtn) {
        offlineBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const alreadyOffline = this._isChapterDownloaded(series.id, chapterObj.id);
          if (alreadyOffline) {
            await this.idb.removeOfflineChapter(series.id, chapterObj.id);
            this.offlineChapterKeys = await this.idb.getAllOfflineChapterKeys();
            await this._updateStorageEstimateUI();
            this.showToast(`Copia offline del Cap. ${chapterObj.number} eliminada.`);
            this.render();
          } else {
            offlineBtn.disabled = true;
            offlineBtn.textContent = '⏳ Guardando...';
            try {
              await this.registry.downloadChapterForOffline(
                series.id,
                chapterObj.id,
                (done, total) => {
                  offlineBtn.textContent = `⏳ ${done}/${total}`;
                }
              );
              this.offlineChapterKeys = await this.idb.getAllOfflineChapterKeys();
              await this._updateStorageEstimateUI();
              this.showToast(
                `¡Cap. ${chapterObj.number} guardado en IndexedDB para lectura sin conexión!`
              );
            } catch (err) {
              this.showToast(`Error al descargar capítulo: ${err.message}`, true);
            } finally {
              this.render();
            }
          }
        });
      }
    });
  }

  // =========================================================================
  // Pantalla 3: Capítulos y Descargas Offline
  // =========================================================================

  _renderUpdatesView(container) {
    const sourceSeries = this.updatesShowAllCatalog
      ? this.allSeries
      : this.allSeries.filter((s) => this.storage.isInLibrary(s.id));

    const updatesFeed = [];
    for (const series of sourceSeries) {
      for (const ch of series.chapters) {
        updatesFeed.push({
          series,
          chapter: ch,
          date: ch.releaseDate
        });
      }
    }

    updatesFeed.sort((a, b) => b.date.localeCompare(a.date));

    const headerBar = `
      <div class="architecture-banner">
        <div>
          <h3>Capítulos Recientes y Gestión Offline (${this.offlineChapterKeys.size} descargados)</h3>
          <p>Descarga capítulos en tu dispositivo para leerlos sin conexión en cualquier lugar.</p>
        </div>
        <button type="button" class="btn-secondary" id="toggle-updates-scope-btn">
          ${this.updatesShowAllCatalog ? 'Ver solo mi Biblioteca' : 'Ver todas las fuentes'}
        </button>
      </div>
    `;

    if (updatesFeed.length === 0) {
      container.innerHTML = `
        ${headerBar}
        <div class="empty-state">
          <div class="empty-icon">🔔</div>
          <h3>No hay capítulos en esta vista</h3>
          <p>Añade series a tu biblioteca o cambia a la vista de todas las fuentes.</p>
        </div>
      `;
    } else {
      container.innerHTML = `
        ${headerBar}
        <div class="feed-list">
          ${updatesFeed
            .map(({ series, chapter }) => {
              const prog = this.storage.getChapterProgress(chapter.id);
              const isOffline =
                series.isLocalFile || this._isChapterDownloaded(series.id, chapter.id);
              const badge = prog?.completed
                ? '<span class="chapter-progress-badge done">✓ Leído</span>'
                : prog
                ? `<span class="chapter-progress-badge reading">Pág. ${prog.currentPage}/${chapter.pagesCount}</span>`
                : '<span class="chapter-progress-badge">Nuevo</span>';

              return `
                <article class="feed-card" data-series-id="${this._escapeHtml(
                  series.id
                )}" data-chapter-id="${this._escapeHtml(chapter.id)}">
                  <img
                    src="${series.coverUrl}"
                    alt="${this._escapeHtml(series.title)}"
                    class="feed-thumb"
                    data-action="open-series"
                  />
                  <div class="feed-info">
                    <span class="feed-series-title" data-action="open-series">${this._escapeHtml(
                      series.title
                    )}</span>
                    <span class="feed-chapter-title">Capítulo ${chapter.number}: ${this._escapeHtml(
                chapter.title
              )} (${chapter.pagesCount} págs.)</span>
                    <span class="feed-time">Fecha: ${this._formatRelativeOrDate(
                      chapter.releaseDate
                    )} ${isOffline ? '• <strong>✓ Disponible Offline</strong>' : ''}</span>
                  </div>
                  <div class="feed-actions">
                    ${badge}
                    ${
                      !series.isLocalFile
                        ? `<button type="button" class="btn-subtle" data-action="download-offline">
                            ${isOffline ? '✓ Offline' : '⬇ Offline'}
                          </button>`
                        : '<span class="chapter-offline-badge">Archivo Local</span>'
                    }
                    <button type="button" class="btn-primary" data-action="open-reader">
                      Leer
                    </button>
                  </div>
                </article>
              `;
            })
            .join('')}
        </div>
      `;
    }

    container.querySelector('#toggle-updates-scope-btn')?.addEventListener('click', () => {
      this.updatesShowAllCatalog = !this.updatesShowAllCatalog;
      this.renderMainContent();
    });

    container.querySelectorAll('.feed-card').forEach((card) => {
      const seriesId = card.getAttribute('data-series-id');
      const chapterId = card.getAttribute('data-chapter-id');
      if (!seriesId || !chapterId) return;

      card.querySelectorAll('[data-action="open-series"]').forEach((el) => {
        el.addEventListener('click', () => this.openSeriesDetail(seriesId));
      });

      card.querySelector('[data-action="open-reader"]')?.addEventListener('click', () => {
        const prog = this.storage.getChapterProgress(chapterId);
        const startPage = prog && !prog.completed ? prog.currentPage : 1;
        this.openReader(seriesId, chapterId, startPage);
      });

      const dlBtn = card.querySelector('[data-action="download-offline"]');
      if (dlBtn) {
        dlBtn.addEventListener('click', async () => {
          const isOffline = this._isChapterDownloaded(seriesId, chapterId);
          if (isOffline) {
            await this.idb.removeOfflineChapter(seriesId, chapterId);
            this.offlineChapterKeys = await this.idb.getAllOfflineChapterKeys();
            await this._updateStorageEstimateUI();
            this.showToast('Copia offline eliminada.');
            this.renderMainContent();
          } else {
            dlBtn.disabled = true;
            dlBtn.textContent = '⏳...';
            try {
              await this.registry.downloadChapterForOffline(seriesId, chapterId);
              this.offlineChapterKeys = await this.idb.getAllOfflineChapterKeys();
              await this._updateStorageEstimateUI();
              this.showToast('Capítulo guardado para lectura sin conexión.');
            } catch (err) {
              this.showToast(err.message, true);
            } finally {
              this.renderMainContent();
            }
          }
        });
      }
    });
  }

  // =========================================================================
  // Pantalla 4: Historial de Lectura
  // =========================================================================

  _renderHistoryView(container) {
    const historyEntries = this.storage.getHistory();

    if (historyEntries.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🕒</div>
          <h3>Sin historial de lectura todavía</h3>
          <p>Cuando abras cualquier capítulo en el lector, MangaShelf guardará automáticamente la fecha y la página exacta en tu dispositivo.</p>
          <button type="button" class="btn-primary" id="history-go-lib-btn">Ir a mi Biblioteca</button>
        </div>
      `;
      container
        .querySelector('#history-go-lib-btn')
        ?.addEventListener('click', () => this.switchTab('library'));
      return;
    }

    container.innerHTML = `
      <div class="architecture-banner">
        <div>
          <h3>Actividad Guardada en este Dispositivo</h3>
          <p>Tu historial y progreso se conservan al cerrar o recargar la app, y pueden exportarse en JSON.</p>
        </div>
        <button type="button" class="btn-secondary" id="clear-all-history-btn">
          🗑 Limpiar Historial
        </button>
      </div>

      <div class="feed-list">
        ${historyEntries
          .map((entry) => {
            const series = this.allSeries.find((s) => s.id === entry.seriesId);
            if (!series) return '';
            const chapter =
              series.chapters.find((c) => c.id === entry.chapterId) || series.chapters[0];
            if (!chapter) return '';

            return `
              <article class="feed-card" data-entry-id="${this._escapeHtml(
                entry.id
              )}" data-series-id="${this._escapeHtml(
              series.id
            )}" data-chapter-id="${this._escapeHtml(chapter.id)}" data-page="${entry.page}">
                <img
                  src="${series.coverUrl}"
                  alt="${this._escapeHtml(series.title)}"
                  class="feed-thumb"
                  data-action="open-series"
                />
                <div class="feed-info">
                  <span class="feed-series-title" data-action="open-series">${this._escapeHtml(
                    series.title
                  )}</span>
                  <span class="feed-chapter-title">Cap. ${chapter.number}: ${this._escapeHtml(
              chapter.title
            )} • <strong>Página ${entry.page} de ${entry.totalPages}</strong></span>
                  <span class="feed-time">Leído: ${this._formatRelativeOrDate(
                    entry.timestamp
                  )}</span>
                </div>
                <div class="feed-actions">
                  <button type="button" class="btn-primary" data-action="resume-reading">
                    ▶ Reanudar (Pág. ${entry.page})
                  </button>
                  <button
                    type="button"
                    class="btn-subtle"
                    data-action="delete-entry"
                    title="Borrar esta entrada del historial"
                  >
                    ✕
                  </button>
                </div>
              </article>
            `;
          })
          .join('')}
      </div>
    `;

    container.querySelector('#clear-all-history-btn')?.addEventListener('click', () => {
      this.storage.clearHistory();
      this.showToast('Historial de lectura vaciado.');
      this.renderMainContent();
    });

    container.querySelectorAll('.feed-card').forEach((card) => {
      const entryId = card.getAttribute('data-entry-id');
      const seriesId = card.getAttribute('data-series-id');
      const chapterId = card.getAttribute('data-chapter-id');
      const page = Number(card.getAttribute('data-page')) || 1;

      card.querySelectorAll('[data-action="open-series"]').forEach((el) => {
        el.addEventListener('click', () => this.openSeriesDetail(seriesId));
      });

      card.querySelector('[data-action="resume-reading"]')?.addEventListener('click', () => {
        this.openReader(seriesId, chapterId, page);
      });

      card.querySelector('[data-action="delete-entry"]')?.addEventListener('click', () => {
        if (entryId) {
          this.storage.removeHistoryEntry(entryId);
          this.showToast('Entrada eliminada del historial.');
          this.renderMainContent();
        }
      });
    });
  }

  // =========================================================================
  // Lector Móvil Avanzado (Paginado, Cascada, LTR/RTL, Zoom, PDF)
  // =========================================================================

  async openReader(seriesId, chapterId, initialPage = 1) {
    try {
      const series = this.allSeries.find((s) => s.id === seriesId);
      if (!series) throw new Error('Serie no encontrada');
      const chapter =
        series.chapters.find((c) => c.id === chapterId) || series.chapters[0];
      if (!chapter) throw new Error('Capítulo no encontrado');

      const pages = await this.registry.getChapterPages(seriesId, chapter.id);
      const startPage = Math.max(1, Math.min(initialPage, pages.length));

      this.readerState = {
        isOpen: true,
        series,
        chapter,
        pages,
        currentPage: startPage,
        hudVisible: true
      };

      const overlay = document.getElementById('reader-overlay');
      overlay?.classList.remove('hidden', 'hud-hidden');
      document.body.style.overflow = 'hidden';

      // Mostrar enlace PDF si es un documento PDF local
      const pdfBar = document.getElementById('reader-pdf-bar');
      const pdfLink = document.getElementById('reader-open-pdf-link');
      const pdfDataUrl = chapter.pdfDataUrl || series.pdfDataUrl;
      if (pdfBar && pdfLink && pdfDataUrl) {
        pdfBar.classList.remove('hidden');
        pdfLink.href = pdfDataUrl;
        pdfLink.download = `${series.title}.pdf`;
      } else if (pdfBar) {
        pdfBar.classList.add('hidden');
      }

      this._applyReaderSettingsUI();
      this._renderReaderPage();
    } catch (err) {
      console.error(err);
      this.showToast('No se pudo abrir el capítulo solicitado.', true);
    }
  }

  closeReader() {
    this.readerState.isOpen = false;
    const overlay = document.getElementById('reader-overlay');
    overlay?.classList.add('hidden');
    document.body.style.overflow = '';
    this.render();
  }

  _applyReaderSettingsUI() {
    const settings = this.storage.getReaderSettings();
    const overlay = document.getElementById('reader-overlay');
    const modeBtn = document.getElementById('reader-mode-btn');
    const dirBtn = document.getElementById('reader-dir-btn');
    const fitBtn = document.getElementById('reader-fit-btn');
    const zoomLabel = document.getElementById('reader-zoom-label');
    const sliderEl = document.getElementById('reader-page-slider');
    const footerStatus = document.getElementById('reader-footer-status');
    const pagedContainer = document.getElementById('reader-paged-container');
    const webtoonContainer = document.getElementById('reader-webtoon-container');
    const pageImg = document.getElementById('reader-page-img');

    const zoomVal = Number(settings.zoom) || 100;
    const isRtl = settings.direction === 'rtl';

    if (overlay) {
      overlay.classList.toggle('fit-width', settings.fitMode === 'width' || zoomVal > 100);
    }
    if (modeBtn) {
      modeBtn.textContent =
        settings.readingMode === 'webtoon' ? 'Vista: Vertical' : 'Vista: Páginas';
    }
    if (dirBtn) {
      dirBtn.textContent = isRtl ? 'Dir: Der ← Izq (Manga)' : 'Dir: Izq → Der';
    }
    if (fitBtn) {
      fitBtn.textContent = settings.fitMode === 'width' ? 'Ajuste: Ancho' : 'Ajuste: Alto';
    }
    if (zoomLabel) {
      zoomLabel.textContent = `${zoomVal}%`;
    }
    if (sliderEl) {
      sliderEl.style.direction = isRtl ? 'rtl' : 'ltr';
    }
    if (footerStatus) {
      footerStatus.textContent = `Dirección: ${
        isRtl ? 'Derecha a Izquierda (Manga)' : 'Izquierda a Derecha'
      } • Zoom ${zoomVal}%`;
    }
    if (pageImg) {
      pageImg.style.transform = zoomVal !== 100 ? `scale(${zoomVal / 100})` : '';
      pageImg.style.transformOrigin = 'top center';
    }

    if (settings.readingMode === 'webtoon') {
      pagedContainer?.classList.add('hidden');
      webtoonContainer?.classList.remove('hidden');
      if (webtoonContainer && this.readerState.pages.length > 0) {
        webtoonContainer.innerHTML = this.readerState.pages
          .map(
            (p) =>
              `<img src="${p.imageUrl}" alt="${this._escapeHtml(
                p.caption
              )}" class="webtoon-page-img" style="width: min(100%, ${Math.round(
                760 * (zoomVal / 100)
              )}px)" data-page-num="${p.pageNumber}" />`
          )
          .join('');
      }
    } else {
      pagedContainer?.classList.remove('hidden');
      webtoonContainer?.classList.add('hidden');
    }
  }

  _renderReaderPage() {
    if (!this.readerState.isOpen) return;
    const { series, chapter, pages, currentPage } = this.readerState;
    const totalPages = pages.length;
    const pageObj = pages[currentPage - 1];

    this.storage.saveReadingProgress(series.id, chapter.id, currentPage, totalPages);

    const seriesTitleEl = document.getElementById('reader-series-title');
    const chapterTitleEl = document.getElementById('reader-chapter-title');
    const pageIndicatorEl = document.getElementById('reader-page-indicator');
    const savedIndicatorEl = document.getElementById('reader-saved-indicator');
    const sliderEl = document.getElementById('reader-page-slider');
    const imgEl = document.getElementById('reader-page-img');
    const prevBtn = document.getElementById('reader-prev-btn');
    const nextBtn = document.getElementById('reader-next-btn');
    const prevChapBtn = document.getElementById('reader-prev-chapter-btn');
    const nextChapBtn = document.getElementById('reader-next-chapter-btn');

    if (seriesTitleEl) seriesTitleEl.textContent = series.title;
    if (chapterTitleEl) {
      chapterTitleEl.textContent = `Cap. ${chapter.number}: ${chapter.title}`;
    }
    if (pageIndicatorEl) {
      pageIndicatorEl.textContent = `Página ${currentPage} de ${totalPages}`;
    }
    if (savedIndicatorEl) {
      savedIndicatorEl.textContent =
        currentPage === totalPages ? '✓ Capítulo completado' : '✓ Progreso guardado';
    }
    if (sliderEl) {
      sliderEl.max = String(totalPages);
      sliderEl.value = String(currentPage);
    }
    if (imgEl && pageObj) {
      imgEl.src = pageObj.imageUrl;
      imgEl.alt = pageObj.caption;
    }

    const chapIndex = series.chapters.findIndex((c) => c.id === chapter.id);
    const hasPrevChapter = chapIndex > 0;
    const hasNextChapter = chapIndex >= 0 && chapIndex + 1 < series.chapters.length;

    if (prevBtn) {
      prevBtn.disabled = currentPage <= 1 && !hasPrevChapter;
      prevBtn.textContent =
        currentPage <= 1 && hasPrevChapter ? '⏮ Cap. Anterior' : '◀ Anterior';
    }

    if (nextBtn) {
      nextBtn.disabled = currentPage >= totalPages && !hasNextChapter;
      nextBtn.textContent =
        currentPage >= totalPages
          ? hasNextChapter
            ? 'Siguiente Cap. ⏭'
            : '✓ Fin de Serie'
          : 'Siguiente ▶';
    }

    if (prevChapBtn) prevChapBtn.disabled = !hasPrevChapter;
    if (nextChapBtn) nextChapBtn.disabled = !hasNextChapter;
  }

  goToPage(targetPage) {
    if (!this.readerState.isOpen) return;
    const { series, chapter, pages } = this.readerState;
    const total = pages.length;

    if (targetPage < 1) {
      const idx = series.chapters.findIndex((c) => c.id === chapter.id);
      if (idx > 0) {
        const prevChap = series.chapters[idx - 1];
        this.openReader(series.id, prevChap.id, prevChap.pagesCount);
        this.showToast(`Cambiando al Capítulo ${prevChap.number}`);
      }
      return;
    }

    if (targetPage > total) {
      const idx = series.chapters.findIndex((c) => c.id === chapter.id);
      if (idx >= 0 && idx + 1 < series.chapters.length) {
        const nextChap = series.chapters[idx + 1];
        this.openReader(series.id, nextChap.id, 1);
        this.showToast(`Abriendo Capítulo ${nextChap.number}: ${nextChap.title}`);
      } else {
        this.showToast('¡Has completado el último capítulo de esta obra!');
      }
      return;
    }

    this.readerState.currentPage = targetPage;
    this._renderReaderPage();

    const settings = this.storage.getReaderSettings();
    if (settings.readingMode === 'webtoon') {
      const targetImg = document.querySelector(
        `#reader-webtoon-container [data-page-num="${targetPage}"]`
      );
      targetImg?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  _bindReaderEvents() {
    document.getElementById('reader-close-btn')?.addEventListener('click', () => {
      this.closeReader();
    });

    document.getElementById('reader-prev-btn')?.addEventListener('click', () => {
      this.goToPage(this.readerState.currentPage - 1);
    });

    document.getElementById('reader-next-btn')?.addEventListener('click', () => {
      this.goToPage(this.readerState.currentPage + 1);
    });

    // Zonas táctiles izquierda y derecha respetan la dirección de lectura (LTR vs RTL)
    document.getElementById('tap-left-zone')?.addEventListener('click', () => {
      const isRtl = this.storage.getReaderSettings().direction === 'rtl';
      this.goToPage(this.readerState.currentPage + (isRtl ? 1 : -1));
    });

    document.getElementById('tap-right-zone')?.addEventListener('click', () => {
      const isRtl = this.storage.getReaderSettings().direction === 'rtl';
      this.goToPage(this.readerState.currentPage + (isRtl ? -1 : 1));
    });

    document.getElementById('tap-hud-zone')?.addEventListener('click', () => {
      this.readerState.hudVisible = !this.readerState.hudVisible;
      document
        .getElementById('reader-overlay')
        ?.classList.toggle('hud-hidden', !this.readerState.hudVisible);
    });

    document.getElementById('reader-page-slider')?.addEventListener('input', (e) => {
      const val = Number(e.target.value) || 1;
      this.goToPage(val);
    });

    document.getElementById('reader-prev-chapter-btn')?.addEventListener('click', () => {
      const { series, chapter } = this.readerState;
      if (!series || !chapter) return;
      const idx = series.chapters.findIndex((c) => c.id === chapter.id);
      if (idx > 0) {
        const prev = series.chapters[idx - 1];
        this.openReader(series.id, prev.id, 1);
      }
    });

    document.getElementById('reader-next-chapter-btn')?.addEventListener('click', () => {
      const { series, chapter } = this.readerState;
      if (!series || !chapter) return;
      const idx = series.chapters.findIndex((c) => c.id === chapter.id);
      if (idx >= 0 && idx + 1 < series.chapters.length) {
        const next = series.chapters[idx + 1];
        this.openReader(series.id, next.id, 1);
      }
    });

    // Dirección LTR / RTL
    document.getElementById('reader-dir-btn')?.addEventListener('click', () => {
      const current = this.storage.getReaderSettings().direction;
      const nextDir = current === 'rtl' ? 'ltr' : 'rtl';
      this.storage.updateReaderSettings({ direction: nextDir });
      this._applyReaderSettingsUI();
      this.showToast(
        nextDir === 'rtl'
          ? 'Dirección Manga (Derecha a Izquierda) activada'
          : 'Dirección Occidental (Izquierda a Derecha) activada'
      );
    });

    // Modo Paginado / Desplazamiento Vertical
    document.getElementById('reader-mode-btn')?.addEventListener('click', () => {
      const current = this.storage.getReaderSettings().readingMode;
      const nextMode = current === 'paged' ? 'webtoon' : 'paged';
      this.storage.updateReaderSettings({ readingMode: nextMode });
      this._applyReaderSettingsUI();
      this.showToast(
        nextMode === 'webtoon'
          ? 'Desplazamiento vertical activado'
          : 'Vista de páginas individuales activada'
      );
    });

    // Ajuste Alto / Ancho
    document.getElementById('reader-fit-btn')?.addEventListener('click', () => {
      const current = this.storage.getReaderSettings().fitMode;
      const nextFit = current === 'contain' ? 'width' : 'contain';
      this.storage.updateReaderSettings({ fitMode: nextFit });
      this._applyReaderSettingsUI();
    });

    // Controles de Zoom (- / +)
    document.getElementById('reader-zoom-in-btn')?.addEventListener('click', () => {
      const current = Number(this.storage.getReaderSettings().zoom) || 100;
      const nextZoom = Math.min(225, current + 25);
      this.storage.updateReaderSettings({ zoom: nextZoom });
      this._applyReaderSettingsUI();
    });

    document.getElementById('reader-zoom-out-btn')?.addEventListener('click', () => {
      const current = Number(this.storage.getReaderSettings().zoom) || 100;
      const nextZoom = Math.max(75, current - 25);
      this.storage.updateReaderSettings({ zoom: nextZoom });
      this._applyReaderSettingsUI();
    });

    // Gestos Swipe en Android respetando LTR / RTL
    const viewport = document.getElementById('reader-paged-container');
    let touchStartX = 0;
    let touchStartY = 0;

    viewport?.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );

    viewport?.addEventListener(
      'touchend',
      (e) => {
        if (e.changedTouches.length === 1) {
          const dx = e.changedTouches[0].clientX - touchStartX;
          const dy = e.changedTouches[0].clientY - touchStartY;
          if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            const isRtl = this.storage.getReaderSettings().direction === 'rtl';
            if (dx < 0) {
              this.goToPage(this.readerState.currentPage + (isRtl ? -1 : 1));
            } else {
              this.goToPage(this.readerState.currentPage + (isRtl ? 1 : -1));
            }
          }
        }
      },
      { passive: true }
    );

    // Teclado en escritorio respetando LTR / RTL
    window.addEventListener('keydown', (e) => {
      if (!this.readerState.isOpen) return;
      const isRtl = this.storage.getReaderSettings().direction === 'rtl';
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.goToPage(this.readerState.currentPage + (isRtl ? -1 : 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.goToPage(this.readerState.currentPage + (isRtl ? 1 : -1));
      } else if (e.key === ' ') {
        e.preventDefault();
        this.goToPage(this.readerState.currentPage + 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closeReader();
      }
    });
  }

  // =========================================================================
  // Modales: Importación Local (CBZ, EPUB, PDF, Imágenes) y Backups JSON
  // =========================================================================

  _bindModalsAndActions() {
    const localModal = document.getElementById('local-import-modal');
    const backupModal = document.getElementById('backup-modal');
    const installModal = document.getElementById('install-help-modal');
    const loadingBox = document.getElementById('import-loading-status');

    const openImportModal = () => localModal?.classList.remove('hidden');
    const closeImportModal = () => {
      localModal?.classList.add('hidden');
      loadingBox?.classList.add('hidden');
    };

    document.getElementById('open-local-modal-btn')?.addEventListener('click', openImportModal);
    document.getElementById('header-import-btn')?.addEventListener('click', openImportModal);
    document.getElementById('close-local-modal-btn')?.addEventListener('click', closeImportModal);
    document.getElementById('cancel-local-modal-btn')?.addEventListener('click', closeImportModal);

    const openBackupModal = () => backupModal?.classList.remove('hidden');
    const closeBackupModal = () => backupModal?.classList.add('hidden');

    document.getElementById('open-backup-modal-btn')?.addEventListener('click', openBackupModal);
    document.getElementById('header-backup-btn')?.addEventListener('click', openBackupModal);
    document.getElementById('close-backup-modal-btn')?.addEventListener('click', closeBackupModal);
    document.getElementById('ok-backup-modal-btn')?.addEventListener('click', closeBackupModal);

    document.getElementById('close-install-modal-btn')?.addEventListener('click', () => {
      installModal?.classList.add('hidden');
    });
    document.getElementById('ok-install-modal-btn')?.addEventListener('click', () => {
      installModal?.classList.add('hidden');
    });

    // Botones de prueba rápida con los archivos .CBZ y .EPUB reales incluidos
    document.getElementById('load-sample-cbz-btn')?.addEventListener('click', async () => {
      await this._importSampleArchive('./samples/demo-comic-espacial.cbz', 'demo-comic-espacial.cbz');
    });

    document.getElementById('load-sample-epub-btn')?.addEventListener('click', async () => {
      await this._importSampleArchive('./samples/demo-leyenda-astral.epub', 'demo-leyenda-astral.epub');
    });

    // Formulario de importación de archivos del dispositivo
    const localForm = document.getElementById('local-import-form');
    localForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const titleInput = document.getElementById('local-series-title');
      const authorInput = document.getElementById('local-series-author');
      const filesInput = document.getElementById('local-series-files');

      if (!filesInput?.files || filesInput.files.length === 0) {
        this.showToast('Selecciona un archivo compatible.', true);
        return;
      }

      if (loadingBox) {
        loadingBox.textContent = 'Validando y extrayendo páginas localmente...';
        loadingBox.classList.remove('hidden');
      }

      try {
        const created = await this.registry.localProvider.importFiles(
          filesInput.files,
          titleInput?.value?.trim() || '',
          authorInput?.value?.trim() || ''
        );
        this.allSeries = await this.registry.getAllSeries();
        this.storage.addToLibrary(created.id);
        this.storage.toggleTagOnSeries(created.id, 'Mis Archivos');
        await this._updateStorageEstimateUI();

        localForm.reset();
        closeImportModal();
        this.showToast(`«${created.title}» (${created.fileFormat}) importado y guardado en IndexedDB.`);
        this.openSeriesDetail(created.id);
      } catch (err) {
        if (loadingBox) loadingBox.classList.add('hidden');
        this.showToast(err.message || 'Error al importar el archivo.', true);
      }
    });

    // Exportar copia de seguridad JSON
    document.getElementById('export-json-btn')?.addEventListener('click', () => {
      try {
        const jsonStr = this.storage.exportBackupJson();
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mangashelf-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        this.showToast('Copia de seguridad (.JSON) descargada correctamente.');
      } catch (err) {
        this.showToast('No se pudo exportar la copia de seguridad.', true);
      }
    });

    // Restaurar copia de seguridad JSON
    document.getElementById('import-backup-file')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        this.storage.importBackupJson(text);
        e.target.value = '';
        closeBackupModal();
        this.render();
        this.showToast('¡Biblioteca, etiquetas y progreso restaurados con éxito!');
      } catch (err) {
        this.showToast(err.message || 'Archivo de respaldo inválido.', true);
      }
    });

    document.getElementById('reset-demo-data-btn')?.addEventListener('click', () => {
      closeBackupModal();
      this._handleResetDemo();
    });
  }

  async _importSampleArchive(url, filename) {
    const loadingBox = document.getElementById('import-loading-status');
    const localModal = document.getElementById('local-import-modal');
    if (loadingBox) {
      loadingBox.textContent = `Descargando y descomprimiendo ${filename}...`;
      loadingBox.classList.remove('hidden');
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`No se encontró ${filename}`);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type });

      const created = await this.registry.localProvider.importFiles([file]);
      this.allSeries = await this.registry.getAllSeries();
      this.storage.addToLibrary(created.id);
      this.storage.toggleTagOnSeries(created.id, 'Mis Archivos');
      await this._updateStorageEstimateUI();

      localModal?.classList.add('hidden');
      loadingBox?.classList.add('hidden');
      this.showToast(`Archivo real «${filename}» descomprimido y guardado en tu Biblioteca.`);
      this.openSeriesDetail(created.id);
    } catch (err) {
      loadingBox?.classList.add('hidden');
      this.showToast(`Error al cargar archivo de muestra: ${err.message}`, true);
    }
  }

  _handleResetDemo() {
    this.storage.resetToDemoDefaults();
    this._resetFilters();
    this.selectedSeriesId = null;
    this.render();
    this.showToast('Datos de demostración restaurados.');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new MangaShelfApp();
  app.init();
});
