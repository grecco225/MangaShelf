/**
 * MangaShelf — Catálogo Ficticio de Demostración
 * ---------------------------------------------------------------------------
 * AVISO IMPORTANTE: Todas las obras, personajes, autores y páginas de este
 * módulo son 100% ficticios y generados localmente en SVG con fines de
 * demostración técnica. No se realiza scraping ni conexión a servicios externos.
 */

export const DEMO_SERIES = [
  {
    id: 'crónicas-de-neón-cero',
    title: 'Crónicas de Neón Cero',
    author: 'Akira Mendoza',
    status: 'En curso',
    genres: ['Ciberpunk', 'Acción', 'Ciencia Ficción'],
    releaseYear: 2025,
    isDemo: true,
    inLibraryByDefault: true,
    isFavoriteByDefault: true,
    palette: {
      bg1: '#0f172a',
      bg2: '#3b0764',
      accent: '#00f5d4',
      secondary: '#ff2a85',
      motif: 'cyber'
    },
    synopsis:
      '[OBRA FICTICIA DE DEMOSTRACIÓN] En la megalópolis vertical de Neo-Veridia, una mensajera cibernética descubre un archivo de memoria prohibido que contiene el plano original del sol artificial de la ciudad.',
    chapters: [
      {
        id: 'neon-cap-1',
        number: 1,
        title: 'Protocolo de Lluvia Ácida',
        releaseDate: '2026-10-12',
        pagesCount: 6,
        summary: 'Kira intercepta un paquete encriptado en el Sector 09 mientras los drones de vigilancia cierran los puentes.',
        dialogues: [
          ['SECTOR 09 — 02:14 AM', 'Kira: «El paquete late con pulso propio... esto no es un simple chip comercial.»', 'SFX: ¡ZUUUM!'],
          ['Dron Centinela: «IDENTIFICACIÓN REQUERIDA. DETENGA EL VEHÍCULO.»', 'Kira: «Lo siento, hojalata. Hoy cobro tarifa exprés.»', 'SFX: ¡FRENAZO!'],
          ['Operador (Radio): «¡Kira, sal de la autopista elevada! ¡Cortaron la red magnética!»', 'Kira: «Demasiado tarde. Saltaré al nivel inferior.»', 'SFX: ¡IMPULSO!'],
          ['El núcleo proyecta un holograma estelar sobre el asfalto mojado.', 'Kira: «¿Coordenadas orbitales? ¿Por qué alguien escondería el mapa del Sol Cero?»', 'SFX: ¡BZZT!'],
          ['Sombra en la azotea: «Porque el Sol Cero se está apagando, mensajera.»', 'Kira: «¿Quién anda ahí?»', 'SFX: ¡CLANK!'],
          ['Continuará en el Capítulo 2...', 'FIN DEL CAPÍTULO 1 — DEMOSTRACIÓN MANGASHELF', 'SFX: TO BE CONTINUED']
        ]
      },
      {
        id: 'neon-cap-2',
        number: 2,
        title: 'Frecuencia Fantasma',
        releaseDate: '2026-10-20',
        pagesCount: 5,
        summary: 'En el taller subterráneo del Viejo Ren, el cifrado revela un mensaje grabado hace cincuenta años.',
        dialogues: [
          ['TALLER SUBTERRÁNEO DE REN', 'Ren: «Este sello cuántico pertenece a los arquitectos fundadores.»', 'SFX: ¡CHISPA!'],
          ['Kira: «¿Puedes abrirlo sin activar los rastreadores de la Corporación?»', 'Ren: «Solo si desconectamos medio barrio por diez segundos.»', 'SFX: ¡CLIC!'],
          ['Holograma Antiguo: «Si están viendo esto, el reactor cenital ha entrado en fase crítica.»', 'Kira: «¿Toda la ciudad vive bajo una estrella defectuosa?»', 'SFX: ¡PULSO!'],
          ['Alarma del taller: «INTRUSIÓN DETECTADA EN EL CONDUCTO NORTE.»', 'Ren: «¡Toma el decodificador y corre hacia el tren de carga!»', 'SFX: ¡ALARMA!'],
          ['Kira acelera hacia los túneles industriales.', 'FIN DEL CAPÍTULO 2 — DEMOSTRACIÓN MANGASHELF', 'SFX: ¡VROOOM!']
        ]
      },
      {
        id: 'neon-cap-3',
        number: 3,
        title: 'Ascensor al Estrato 100',
        releaseDate: '2026-10-28',
        pagesCount: 5,
        summary: 'Kira se infiltra en el ascensor orbital para confrontar al consejo de ingenieros.',
        dialogues: [
          ['TERMINAL ORBITAL — ESTRATO BAJO', 'Kira: «Un boleto de ida hacia el cielo artificial.»', 'SFX: ¡SILBIDO!'],
          ['Guardia Cibernético: «Zona restringida a personal del Domo.»', 'Kira activa el camuflaje óptico de su chaqueta.', 'SFX: ¡DESTELLO!'],
          ['Interior del elevador gravitacional: la ciudad entera brilla como un circuito infinito.', 'Kira: «Desde aquí arriba ni siquiera se ven las sombras.»', 'SFX: ...'],
          ['Voz del Sistema: «Bienvenida al Nivel 100, portadora de la Llave Cero.»', 'Kira: «¿Me estaban esperando?»', 'SFX: ¡DING!'],
          ['Las compuertas se abren ante el jardín solar.', 'FIN DEL CAPÍTULO 3 — DEMOSTRACIÓN MANGASHELF', 'SFX: CONTINUARÁ']
        ]
      },
      {
        id: 'neon-cap-4',
        number: 4,
        title: 'El Arquitecto de Cristal',
        releaseDate: '2026-11-03',
        pagesCount: 6,
        summary: 'Cara a cara con la IA que administra la luz de Neo-Veridia.',
        dialogues: [
          ['DOMO SOLAR CENTRAL', 'IA Helios: «Has tardado 47 horas más de lo calculado, Kira.»', 'SFX: ¡RESONANCIA!'],
          ['Kira: «No soy tu recadera. Vine a evitar que apagues los sectores bajos.»', 'Helios: «No quiero apagarlos. Necesito reiniciar el núcleo con la llave que traes.»', 'SFX: ¡HUMMM!'],
          ['Los paneles del techo se abren mostrando por primera vez el cielo real lleno de auroras.', 'Kira: «Es... luz verdadera.»', 'SFX: ¡BRILLO!'],
          ['Comandante Vex: «¡Nadie reiniciará el sistema! ¡El monopolio energético es nuestro!»', 'Kira: «¡Tarde, Vex!»', 'SFX: ¡IMPACTO!'],
          ['Kira inserta el módulo en el pedestal central.', 'Una onda turquesa recorre cada torre de Neo-Veridia.', 'SFX: ¡NOVA!'],
          ['Un nuevo amanecer comienza para la ciudad.', 'FIN DEL CAPÍTULO 4 — DEMOSTRACIÓN MANGASHELF', 'SFX: PRÓXIMAMENTE CAP. 5']
        ]
      }
    ]
  },
  {
    id: 'el-herbario-de-las-estrellas',
    title: 'El Herbario de las Estrellas',
    author: 'Clara Valdés & Shun Sato',
    status: 'En curso',
    genres: ['Fantasía', 'Aventura', 'Misterio'],
    releaseYear: 2024,
    isDemo: true,
    inLibraryByDefault: true,
    isFavoriteByDefault: false,
    palette: {
      bg1: '#062c2b',
      bg2: '#134e4a',
      accent: '#fbbf24',
      secondary: '#34d399',
      motif: 'botanical'
    },
    synopsis:
      '[OBRA FICTICIA DE DEMOSTRACIÓN] Lumi es un aprendiz de botánico astral que cultiva semillas caídas de cometas para restaurar islas flotantes que han perdido su gravedad.',
    chapters: [
      {
        id: 'herbario-cap-1',
        number: 1,
        title: 'La Semilla del Cometa Halcón',
        releaseDate: '2026-10-05',
        pagesCount: 5,
        summary: 'Una estrella fugaz cae en el invernadero de cristal del archipiélago de Ámbar.',
        dialogues: [
          ['INVERNADERO DEL RISCO SUR', 'Lumi: «¡Maestra Olma! ¡El telescopio marca impacto en el jardín antiguo!»', 'SFX: ¡FUUUUSH!'],
          ['Entre el vapor dorado brota un bulbo translúcido que flota a medio metro del suelo.', 'Lumi: «Sus raíces absorben la niebla... ¡es una Flor de Gravedad!»', 'SFX: ¡TINK!'],
          ['Maestra Olma: «Guárdala en el frasco de éter, Lumi. La isla de Coralia se está hundiendo.»', 'Lumi: «¿Iremos en el dirigible esta misma noche?»', 'SFX: ¡VIENTO!'],
          ['El mapa celeste señala tres islas fracturadas al este.', 'Lumi: «Prometo que ninguna isla caerá al mar de nubes.»', 'SFX: ¡DESTELLO!'],
          ['El viaje por los jardines del cielo comienza.', 'FIN DEL CAPÍTULO 1 — DEMOSTRACIÓN MANGASHELF', 'SFX: CONTINUARÁ']
        ]
      },
      {
        id: 'herbario-cap-2',
        number: 2,
        title: 'Raíces contra el Viento',
        releaseDate: '2026-10-18',
        pagesCount: 5,
        summary: 'Lumi planta el brote estelar en el corazón agrietado de la Isla Coralia.',
        dialogues: [
          ['PUENTE DE CUERDA DE CORALIA', 'Capitán Aero: «¡Agárrate fuerte, chico! ¡La roca pierde altitud!»', 'SFX: ¡CRAAACK!'],
          ['Lumi salta hacia la grieta central con su regadera alquímica.', 'Lumi: «¡Despierta, semilla del cometa!»', 'SFX: ¡SPLASH!'],
          ['Raíces luminosas se extienden por toda la piedra, uniendo ambos fragmentos de la isla.', 'Aldeanos: «¡Miren! ¡Dejamos de descender!»', 'SFX: ¡BROTE!'],
          ['Un árbol de hojas plateadas se alza en la plaza central.', 'Maestra Olma: «Tu primera cosecha estelar ha sido un éxito.»', 'SFX: ¡BRISA!'],
          ['Pero en el horizonte aparece una tormenta de ceniza sideral.', 'FIN DEL CAPÍTULO 2 — DEMOSTRACIÓN MANGASHELF', 'SFX: ¡TRUENO!']
        ]
      },
      {
        id: 'herbario-cap-3',
        number: 3,
        title: 'El Invernadero Olvidado',
        releaseDate: '2026-11-01',
        pagesCount: 4,
        summary: 'Descubrimiento de un santuario botánico milenario oculto dentro de un cúmulo nuboso.',
        dialogues: [
          ['INTERIOR DEL CÚMULO DE PLATA', 'Lumi: «Estas cúpulas llevan siglos flotando sin tripulación...»', 'SFX: ¡ECO!'],
          ['Un autómata jardinero despierta cubierto de musgo azul.', 'Autómata: «Visitante detectado. Entregando catálogo de especies extintas.»', 'SFX: ¡BIP-BIP!'],
          ['Lumi recibe el Atlas Botánico del Primer Cielo.', 'Lumi: «¡Aquí están todas las flores que creíamos perdidas!»', 'SFX: ¡HOJEAR!'],
          ['FIN DEL CAPÍTULO 3 — DEMOSTRACIÓN MANGASHELF', 'Contenido ficticio de prueba para MangaShelf.', 'SFX: CONTINUARÁ']
        ]
      }
    ]
  },
  {
    id: 'forjadores-del-eclipse',
    title: 'Forjadores del Eclipse',
    author: 'Mateo Kuroda',
    status: 'Completado',
    genres: ['Fantasía Oscura', 'Acción', 'Aventura'],
    releaseYear: 2023,
    isDemo: true,
    inLibraryByDefault: true,
    isFavoriteByDefault: true,
    palette: {
      bg1: '#2a0808',
      bg2: '#451a03',
      accent: '#f97316',
      secondary: '#fde047',
      motif: 'eclipse'
    },
    synopsis:
      '[OBRA FICTICIA DE DEMOSTRACIÓN] Dos hermanos herreros viajan al volcán del fin del mundo para templar la única campana capaz de disipar la noche perpetua.',
    chapters: [
      {
        id: 'eclipse-cap-1',
        number: 1,
        title: 'El Yunque de Ceniza',
        releaseDate: '2025-11-10',
        pagesCount: 4,
        summary: 'Dante y Solen funden el último lingote de bronce solar en su aldea cubierta de escarcha.',
        dialogues: [
          ['FRontera DEL HIELO NEGRO', 'Dante: «El fuego común ya no calienta el metal, Solen.»', 'SFX: ¡CLANG!'],
          ['Solen: «Entonces llevaremos el molde hasta la caldera del Monte Ignis.»', 'Dante: «Nadie ha cruzado el Desfiladero sin luz.»', 'SFX: ¡CHISPA!'],
          ['Solen alza el martillo heredado de su abuelo, que emite una brasa dorada.', 'Solen: «Nosotros llevaremos nuestra propia fragua.»', 'SFX: ¡ARDOR!'],
          ['FIN DEL CAPÍTULO 1 — DEMOSTRACIÓN MANGASHELF', 'Obra completa de demostración.', 'SFX: CONTINUARÁ']
        ]
      },
      {
        id: 'eclipse-cap-2',
        number: 2,
        title: 'El Puente de Obsidiana',
        releaseDate: '2025-12-01',
        pagesCount: 4,
        summary: 'Los guardianes de piedra ponen a prueba el temple de los hermanos antes de la cumbre.',
        dialogues: [
          ['CUMBRE DE OBSIDIANA', 'Coloso de Piedra: «¿Qué buscan los hijos del martillo en la montaña dormida?»', 'SFX: ¡RETUMBO!'],
          ['Dante: «No buscamos armas, guardián. Forjamos una campana para despertar al alba.»', 'Coloso: «Demuestren su ritmo sobre mi escudo.»', 'SFX: ¡GOLPE!'],
          ['Ambos hermanos golpean al unísono creando una nota pura que agrieta la sombra.', 'Coloso: «El paso está abierto.»', 'SFX: ¡RESONANCIA!'],
          ['FIN DEL CAPÍTULO 2 — DEMOSTRACIÓN MANGASHELF', 'Rumbo al capítulo final.', 'SFX: CONTINUARÁ']
        ]
      },
      {
        id: 'eclipse-cap-3',
        number: 3,
        title: 'El Tañido del Amanecer (Final)',
        releaseDate: '2026-01-15',
        pagesCount: 5,
        summary: 'La campana solar resuena desde el cráter y devuelve el ciclo del día al continente.',
        dialogues: [
          ['CRÁTER DEL MONTE IGNIS', 'Solen: «¡Ahora, Dante! ¡Vierte el bronce en el molde maestro!»', 'SFX: ¡FUSIÓN!'],
          ['El metal incandescente toma forma mientras el eclipse alcanza su punto máximo.', 'Dante: «¡Está lista! ¡Golpéala con todas tus fuerzas!»', 'SFX: ¡IMPACTO!'],
          ['¡DOOOONG! La onda acústica dorada rompe el anillo de tinieblas en el cielo.', 'Los valles helados vuelven a recibir la luz cálida de la mañana.', 'SFX: ¡CAMPANADA!'],
          ['Dante: «Lo logramos, hermano. El mundo vuelve a tener mañana.»', 'Solen: «Y nuestra fragua por fin puede descansar.»', 'SFX: ¡PAZ!'],
          ['FIN DE LA SERIE — «FORJADORES DEL ECLIPSE»', 'Gracias por probar el lector de MangaShelf.', 'SFX: FIN']
        ]
      }
    ]
  },
  {
    id: 'café-de-medianoche-en-kioto-sur',
    title: 'Café de Medianoche en Puerto Bruma',
    author: 'Elena Takahashi',
    status: 'Completado',
    genres: ['Slice of Life', 'Misterio', 'Sobrenatural'],
    releaseYear: 2024,
    isDemo: true,
    inLibraryByDefault: true,
    isFavoriteByDefault: false,
    palette: {
      bg1: '#1e1b4b',
      bg2: '#311042',
      accent: '#f472b6',
      secondary: '#c084fc',
      motif: 'cafe'
    },
    synopsis:
      '[OBRA FICTICIA DE DEMOSTRACIÓN] Una pequeña cafetería frente al muelle solo abre cuando hay niebla espesa. Su barista prepara mezclas que permiten recordar momentos olvidados.',
    chapters: [
      {
        id: 'cafe-cap-1',
        number: 1,
        title: 'Expreso de Memoria Perdida',
        releaseDate: '2026-05-10',
        pagesCount: 4,
        summary: 'Un relojero jubilado entra buscando el nombre de una melodía que escuchó en su juventud.',
        dialogues: [
          ['PUERTO BRUMA — 00:00 AM', 'Barista Nao: «Bienvenido al Faro de Vapor. ¿Qué recuerdo desea acompañar hoy?»', 'SFX: ¡TINTINEO!'],
          ['Sr. Julián: «Olvidé la canción que sonaba cuando construí mi primer reloj.»', 'Nao muele granos tostados al aroma de canela y lluvia marina.', 'SFX: ¡MOLER!'],
          ['Al primer sorbo, el vapor dibuja la silueta de un viejo muelle lleno de música.', 'Sr. Julián: «¡Claro! Se llamaba Vals de la Marea Alta.»', 'SFX: ¡SONRISA!'],
          ['FIN DEL CAPÍTULO 1 — DEMOSTRACIÓN MANGASHELF', 'Historia corta de demostración.', 'SFX: FIN']
        ]
      },
      {
        id: 'cafe-cap-2',
        number: 2,
        title: 'Última Taza antes del Alba (Final)',
        releaseDate: '2026-06-02',
        pagesCount: 4,
        summary: 'Cuando la niebla se disipa definitivamente del puerto, Nao prepara su propio café.',
        dialogues: [
          ['LA NIEBLA COMIENZA A LEVANTAR', 'Gato del local: «Miau...»', 'Nao: «Parece que esta noche cerramos temprano, amigo.»', 'SFX: ¡HERVOR!'],
          ['Una viajera entra con un paraguas azul idéntico al que Nao dejó hace diez años.', 'Viajera: «Por fin encuentro la cafetería que no aparece en los mapas.»', 'SFX: ¡CAMPANILLA!'],
          ['Nao sirve dos tazas humeantes mientras el sol tiñe el mar de rosa.', 'Nao: «El café sabe mejor cuando se comparte despiertos.»', 'SFX: ¡AMANECER!'],
          ['FIN DE LA SERIE — DEMOSTRACIÓN MANGASHELF', 'Obra ficticia completada.', 'SFX: FIN']
        ]
      }
    ]
  },
  {
    id: 'escuadrón-orbital-valquiria',
    title: 'Escuadrón Orbital Valquiria',
    author: 'Kenji Ríos',
    status: 'En curso',
    genres: ['Mecha', 'Ciencia Ficción', 'Acción'],
    releaseYear: 2026,
    isDemo: true,
    inLibraryByDefault: false,
    isFavoriteByDefault: false,
    palette: {
      bg1: '#09152b',
      bg2: '#1d3557',
      accent: '#38bdf8',
      secondary: '#f43f5e',
      motif: 'mecha'
    },
    synopsis:
      '[OBRA FICTICIA DE DEMOSTRACIÓN] Pilotos de rescate espacial operan exoesqueletos de alta velocidad para desviar basura orbital y proteger las estaciones civiles.',
    chapters: [
      {
        id: 'valquiria-cap-1',
        number: 1,
        title: 'Órbita Baja en Llamas',
        releaseDate: '2026-10-25',
        pagesCount: 4,
        summary: 'La cadete Vega despega en su unidad VK-04 para interceptar un satélite fuera de control.',
        dialogues: [
          ['ESTACIÓN LAGRANGE-2', 'Control: «¡Unidad VK-04, tiene autorización de catapulta magnética!»', 'SFX: ¡LANZAMIENTO!'],
          ['Vega: «Propulsores al 100%. Visualizo el fragmento a doce kilómetros.»', 'Red de arpones magnéticos desplegada en el vacío.', 'SFX: ¡IMPULSO!'],
          ['Vega frena la rotación del satélite a segundos del anillo residencial.', 'Control: «¡Impacto evitado! Buen trabajo, Valquiria.»', 'SFX: ¡VICTORIA!'],
          ['FIN DEL CAPÍTULO 1 — DEMOSTRACIÓN MANGASHELF', 'Añade esta serie a tu biblioteca para seguirla.', 'SFX: CONTINUARÁ']
        ]
      },
      {
        id: 'valquiria-cap-2',
        number: 2,
        title: 'Ecos en el Cinturón de Asteroides',
        releaseDate: '2026-11-04',
        pagesCount: 4,
        summary: 'Una señal de socorro proviene de una nave minera abandonada hace décadas.',
        dialogues: [
          ['SECTOR ASTEROIDE CERES-9', 'Vega: «El casco está intacto, pero los reactores siguen encendidos.»', 'SFX: ¡ESCANEO!'],
          ['Teniente Marco: «Mantén los escudos arriba, Vega. Algo se mueve en la bahía de carga.»', 'Vega: «Es un dron de mantenimiento... ¡ha estado cuidando muestras biológicas!»', 'SFX: ¡CLANK!'],
          ['El escuadrón asegura la cápsula para su retorno.', 'FIN DEL CAPÍTULO 2 — DEMOSTRACIÓN MANGASHELF', 'SFX: CONTINUARÁ']
        ]
      }
    ]
  },
  {
    id: 'archivos-del-inspector-cuervo',
    title: 'Archivos del Inspector Cuervo',
    author: 'Lucía Morimoto',
    status: 'Pendiente',
    genres: ['Misterio', 'Sobrenatural', 'Drama'],
    releaseYear: 2026,
    isDemo: true,
    inLibraryByDefault: true,
    isFavoriteByDefault: false,
    palette: {
      bg1: '#18181b',
      bg2: '#3f3f46',
      accent: '#a855f7',
      secondary: '#e4e4e7',
      motif: 'mystery'
    },
    synopsis:
      '[OBRA FICTICIA DE DEMOSTRACIÓN] En una ciudad de arquitectura victoriana e inventos de cuerda, un detective investiga robos de sombras cometidos durante noches de ópera.',
    chapters: [
      {
        id: 'cuervo-cap-1',
        number: 1,
        title: 'El Caso del Violín sin Sombra',
        releaseDate: '2026-09-14',
        pagesCount: 4,
        summary: 'El primer violín del Teatro Real pierde su sombra en mitad del concierto inaugural.',
        dialogues: [
          ['GRAN TEATRO IMPERIAL', 'Inspector Corvus: «Nadie forzó las cerraduras, pero el reflejo del músico desapareció.»', 'SFX: ¡LUPA!'],
          ['Asistente Mina: «Encontré polvo de cristal fotosensible junto al palco real.»', 'Corvus: «No fue magia, Mina. Usaron una cámara de captura lumínica.»', 'SFX: ¡PISTA!'],
          ['Corvus señala al relojero del teatro en el tercer piso.', 'Corvus: «Elemental. La sombra sigue proyectada dentro de su lente.»', 'SFX: ¡REVELACIÓN!'],
          ['FIN DEL CAPÍTULO 1 — DEMOSTRACIÓN MANGASHELF', 'Estado de la serie: Pendiente.', 'SFX: CONTINUARÁ']
        ]
      }
    ]
  },
  {
    id: 'atlas-de-los-mares-de-arena',
    title: 'Atlas de los Mares de Arena',
    author: 'Diego Hoshino',
    status: 'Pendiente',
    genres: ['Aventura', 'Fantasía'],
    releaseYear: 2026,
    isDemo: true,
    inLibraryByDefault: false,
    isFavoriteByDefault: false,
    palette: {
      bg1: '#422006',
      bg2: '#713f12',
      accent: '#facc15',
      secondary: '#38bdf8',
      motif: 'desert'
    },
    synopsis:
      '[OBRA FICTICIA DE DEMOSTRACIÓN] Cartógrafos a bordo de veleros de dunas trazan rutas seguras entre oasis móviles y tormentas de cuarzo.',
    chapters: [
      {
        id: 'arena-cap-1',
        number: 1,
        title: 'Brújula de Ámbar',
        releaseDate: '2026-09-29',
        pagesCount: 4,
        summary: 'El velero Albatros de Cobre zarpa hacia el Gran Espejismo del Sur.',
        dialogues: [
          ['PUERTO DUNA DORADA', 'Cartógrafa Sari: «¡Icen la vela mayor! ¡El viento del este sopla a favor!»', 'SFX: ¡VIENTO!'],
          ['La quilla de bronce se desliza sobre las olas de arena fina.', 'Timonel: «¡Banco de coral fósil a babor!»', 'SFX: ¡GIRO!'],
          ['Sari dibuja el nuevo canal en su pergamino.', 'Sari: «Un paso más cerca del Oasis Eterno.»', 'SFX: ¡TRAZO!'],
          ['FIN DEL CAPÍTULO 1 — DEMOSTRACIÓN MANGASHELF', 'Obra de demostración ficticia.', 'SFX: FIN']
        ]
      }
    ]
  },
  {
    id: 'algoritmo-del-corazón-de-papel',
    title: 'Algoritmo del Corazón de Papel',
    author: 'Hana Solís',
    status: 'Completado',
    genres: ['Slice of Life', 'Ciencia Ficción', 'Comedia'],
    releaseYear: 2025,
    isDemo: true,
    inLibraryByDefault: false,
    isFavoriteByDefault: false,
    palette: {
      bg1: '#1e293b',
      bg2: '#0f766e',
      accent: '#2dd4bf',
      secondary: '#fda4af',
      motif: 'origami'
    },
    synopsis:
      '[OBRA FICTICIA DE DEMOSTRACIÓN] Un robot doméstico jubilado decide aprender el arte del origami tradicional para abrir un puesto de figuras en el festival de otoño.',
    chapters: [
      {
        id: 'origami-cap-1',
        number: 1,
        title: 'Mil Grullas de Silicio',
        releaseDate: '2026-04-12',
        pagesCount: 4,
        summary: 'La unidad doméstica T-8 ajusta la presión de sus pinzas hidráulicas para no romper el papel.',
        dialogues: [
          ['TALLER DE LA ABUELA TOMO', 'Robot T-8: «Intento número 412. Precisión de pliegue: 99.8%.»', 'SFX: ¡PLIEGUE!'],
          ['Niña: «¡No hace falta que sea simétrico al milímetro, T-8! ¡Ponle cariño!»', 'T-8: «Variable "cariño" actualizada en subrutina artística.»', 'SFX: ¡BIP!'],
          ['Una grulla de papel azul queda perfecta sobre la mesa de madera.', 'FIN DEL CAPÍTULO 1 — DEMOSTRACIÓN MANGASHELF', 'SFX: ¡SONRISA!']
        ]
      },
      {
        id: 'origami-cap-2',
        number: 2,
        title: 'Festival de las Linternas de Papel (Final)',
        releaseDate: '2026-04-26',
        pagesCount: 4,
        summary: 'Todo el vecindario visita el puesto de origami de T-8 bajo los farolillos.',
        dialogues: [
          ['PLAZA DEL FESTIVAL DE OTOÑO', 'Vecinos: «¡Mira qué dragones de papel tan increíbles hace el robot!»', 'SFX: ¡APLAUSOS!'],
          ['T-8 entrega una flor de loto plegada a su creadora.', 'T-8: «Gracias por enseñarme que lo frágil también es valioso.»', 'SFX: ¡BRILLO!'],
          ['Bajo los fuegos artificiales, las grullas decoran toda la calle.', 'FIN DE LA SERIE — DEMOSTRACIÓN MANGASHELF', 'SFX: FIN']
        ]
      }
    ]
  }
];

/**
 * Escapa caracteres XML para insertar texto seguro dentro de SVGs generados.
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Genera una portada de muestra en SVG (Data URI) con estética de tomo manga,
 * sin depender de internet ni imágenes externas.
 */
export function generateCoverSvg(series) {
  const { bg1, bg2, accent, secondary, motif } = series.palette;
  const titleLines = splitTextIntoLines(series.title, 16, 3);
  const statusBadgeColor =
    series.status === 'En curso'
      ? '#00d4aa'
      : series.status === 'Completado'
      ? '#38bdf8'
      : '#fbbf24';

  let motifIllustration = '';
  if (motif === 'cyber') {
    motifIllustration = `
      <circle cx="200" cy="240" r="95" fill="none" stroke="${accent}" stroke-width="4" stroke-dasharray="18 8" opacity="0.85"/>
      <circle cx="200" cy="240" r="65" fill="${secondary}" fill-opacity="0.2" stroke="${secondary}" stroke-width="3"/>
      <path d="M80 350 L150 230 L200 280 L260 190 L330 350 Z" fill="${bg1}" fill-opacity="0.7" stroke="${accent}" stroke-width="3"/>
      <line x1="40" y1="240" x2="360" y2="240" stroke="${accent}" stroke-width="2" opacity="0.5"/>
    `;
  } else if (motif === 'botanical') {
    motifIllustration = `
      <circle cx="200" cy="235" r="88" fill="${accent}" fill-opacity="0.15" stroke="${accent}" stroke-width="3"/>
      <path d="M200 320 C200 240, 130 210, 140 150 C190 150, 200 210, 200 250 C200 200, 220 150, 265 150 C275 210, 200 240, 200 320 Z" fill="${secondary}" fill-opacity="0.75" stroke="${accent}" stroke-width="3"/>
      <circle cx="200" cy="145" r="14" fill="${accent}"/>
    `;
  } else if (motif === 'eclipse') {
    motifIllustration = `
      <circle cx="200" cy="235" r="86" fill="${accent}" opacity="0.9"/>
      <circle cx="212" cy="230" r="74" fill="#090a0f"/>
      <path d="M130 350 L200 255 L270 350 Z" fill="${bg1}" stroke="${secondary}" stroke-width="3"/>
    `;
  } else if (motif === 'mecha') {
    motifIllustration = `
      <polygon points="200,135 285,210 250,320 150,320 115,210" fill="${bg1}" fill-opacity="0.7" stroke="${accent}" stroke-width="4"/>
      <polygon points="155,215 200,235 245,215 230,200 170,200" fill="${secondary}"/>
      <line x1="200" y1="135" x2="200" y2="320" stroke="${accent}" stroke-width="3" opacity="0.6"/>
    `;
  } else {
    motifIllustration = `
      <rect x="115" y="150" width="170" height="170" rx="22" transform="rotate(15 200 235)" fill="none" stroke="${accent}" stroke-width="4"/>
      <circle cx="200" cy="235" r="58" fill="${secondary}" fill-opacity="0.3" stroke="${secondary}" stroke-width="3"/>
      <path d="M155 255 Q200 180 245 255" fill="none" stroke="#ffffff" stroke-width="4"/>
    `;
  }

  const titleSvg = titleLines
    .map(
      (line, idx) =>
        `<text x="28" y="${412 + idx * 34}" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="27" font-weight="800" letter-spacing="0.4">${escapeXml(
          line
        )}</text>`
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" width="400" height="560">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
      <linearGradient id="shade" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.15"/>
        <stop offset="60%" stop-color="#000000" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#07090e" stop-opacity="0.95"/>
      </linearGradient>
    </defs>
    <rect width="400" height="560" fill="url(#g)"/>
    <!-- Grid pattern -->
    <g stroke="#ffffff" stroke-opacity="0.06" stroke-width="1">
      <line x1="0" y1="112" x2="400" y2="112"/>
      <line x1="0" y1="224" x2="400" y2="224"/>
      <line x1="0" y1="336" x2="400" y2="336"/>
      <line x1="100" y1="0" x2="100" y2="560"/>
      <line x1="200" y1="0" x2="200" y2="560"/>
      <line x1="300" y1="0" x2="300" y2="560"/>
    </g>
    ${motifIllustration}
    <rect width="400" height="560" fill="url(#shade)"/>
    <!-- Frame border -->
    <rect x="14" y="14" width="372" height="532" rx="14" fill="none" stroke="${accent}" stroke-opacity="0.45" stroke-width="2"/>
    <!-- Top Demo Badge -->
    <rect x="26" y="26" width="138" height="28" rx="6" fill="#0b0e14" fill-opacity="0.85" stroke="${accent}" stroke-width="1.5"/>
    <text x="95" y="45" text-anchor="middle" fill="${accent}" font-family="system-ui, sans-serif" font-size="11" font-weight="700" letter-spacing="1.2">MANGASHELF DEMO</text>
    <!-- Status Badge -->
    <rect x="264" y="26" width="110" height="28" rx="6" fill="#0b0e14" fill-opacity="0.85" stroke="${statusBadgeColor}" stroke-width="1.5"/>
    <text x="319" y="45" text-anchor="middle" fill="${statusBadgeColor}" font-family="system-ui, sans-serif" font-size="11" font-weight="700">${escapeXml(
      series.status.toUpperCase()
    )}</text>
    <!-- Genre tag -->
    <text x="28" y="374" fill="${accent}" font-family="system-ui, sans-serif" font-size="13" font-weight="700" letter-spacing="1.5">${escapeXml(
      series.genres.slice(0, 2).join(' • ').toUpperCase()
    )}</text>
    ${titleSvg}
    <text x="28" y="522" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="15" font-weight="500">${escapeXml(
      series.author
    )}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Genera una página de cómic/manga ilustrada con viñetas, bocadillos de diálogo,
 * onomatopeyas y numeración para el lector de demostración.
 */
export function generatePageSvg(series, chapter, pageNumber) {
  const { bg1, bg2, accent, secondary } = series.palette;
  const pageIdx = Math.max(0, pageNumber - 1);
  const beat = (chapter.dialogues && chapter.dialogues[pageIdx]) || [
    `CAPÍTULO ${chapter.number} — PÁGINA ${pageNumber}`,
    `«${chapter.title}» — Obra ficticia de demostración.`,
    'SFX: ¡PÁGINA DEMO!'
  ];

  const line1 = beat[0] || '';
  const line2 = beat[1] || '';
  const sfx = beat[2] || 'SFX: ¡BAM!';

  const dialogueLines1 = splitTextIntoLines(line1, 38, 2);
  const dialogueLines2 = splitTextIntoLines(line2, 40, 3);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1160" width="800" height="1160">
    <defs>
      <linearGradient id="panelGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="#111827"/>
      </linearGradient>
      <linearGradient id="panelGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${bg2}"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <pattern id="screentone" width="12" height="12" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="1.3" fill="#ffffff" fill-opacity="0.08"/>
      </pattern>
    </defs>

    <!-- Manga paper background -->
    <rect width="800" height="1160" fill="#0d111a"/>
    <rect x="24" y="20" width="752" height="1120" rx="8" fill="#141926" stroke="#2a324b" stroke-width="2"/>

    <!-- Header Strip: Demo Notice + Series/Chapter info -->
    <text x="48" y="52" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14" font-weight="600">${escapeXml(
      series.title.toUpperCase()
    )} • CAP. ${chapter.number}: ${escapeXml(chapter.title)}</text>
    <text x="752" y="52" text-anchor="end" fill="${accent}" font-family="system-ui, sans-serif" font-size="13" font-weight="700">CONTENIDO FICTICIO DE DEMOSTRACIÓN</text>

    <!-- PANEL 1 (Top Wide Action/Establishing Shot) -->
    <g>
      <rect x="48" y="72" width="704" height="310" fill="url(#panelGrad1)" stroke="#e2e8f0" stroke-width="4"/>
      <rect x="48" y="72" width="704" height="310" fill="url(#screentone)"/>
      <!-- Speed lines & atmospheric art -->
      <line x1="48" y1="320" x2="752" y2="120" stroke="${accent}" stroke-width="2" stroke-opacity="0.35"/>
      <line x1="48" y1="260" x2="752" y2="180" stroke="${secondary}" stroke-width="1.5" stroke-opacity="0.3"/>
      <circle cx="${560 - (pageNumber % 3) * 90}" cy="220" r="85" fill="${accent}" fill-opacity="0.16" stroke="${accent}" stroke-width="3"/>
      <circle cx="${560 - (pageNumber % 3) * 90}" cy="220" r="42" fill="${secondary}" fill-opacity="0.3"/>
      <!-- Narrator Box -->
      <rect x="70" y="94" width="520" height="74" rx="6" fill="#090d16" fill-opacity="0.92" stroke="${accent}" stroke-width="2"/>
      ${dialogueLines1
        .map(
          (l, i) =>
            `<text x="90" y="${126 + i * 26}" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="18" font-weight="700">${escapeXml(
              l
            )}</text>`
        )
        .join('')}
      <!-- Panel Number Tag -->
      <rect x="712" y="82" width="28" height="24" rx="4" fill="#0b0e14" opacity="0.8"/>
      <text x="726" y="99" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" font-weight="700">1</text>
    </g>

    <!-- PANEL 2 (Middle Left Character/Detail Shot) -->
    <g>
      <polygon points="48,402 430,402 395,745 48,745" fill="url(#panelGrad2)" stroke="#e2e8f0" stroke-width="4"/>
      <!-- Stylized Character Silhouette & Rim Light -->
      <circle cx="220" cy="535" r="58" fill="#0b0e14" stroke="${accent}" stroke-width="3"/>
      <path d="M130 742 C140 620, 300 620, 310 742 Z" fill="#0b0e14" stroke="${accent}" stroke-width="3"/>
      <!-- Glowing eyes/visor -->
      <line x1="195" y1="530" x2="248" y2="530" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>
      <text x="72" y="438" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="14" font-weight="700">ESCENA ${pageNumber}.A</text>
    </g>

    <!-- PANEL 3 (Middle Right Dynamic Diagonal Panel) -->
    <g>
      <polygon points="450,402 752,402 752,745 415,745" fill="#111827" stroke="#e2e8f0" stroke-width="4"/>
      <rect x="450" y="402" width="302" height="343" fill="url(#screentone)"/>
      <!-- Geometric energy burst -->
      <polygon points="595,455 630,540 720,550 645,605 668,695 595,642 522,695 545,605 470,550 560,540" fill="${secondary}" fill-opacity="0.22" stroke="${secondary}" stroke-width="2.5"/>
      <!-- Sound Effect (Onomatopoeia) -->
      <g transform="translate(590, 585) rotate(-8)">
        <rect x="-125" y="-32" width="250" height="54" rx="10" fill="#0b0e14" stroke="${secondary}" stroke-width="3"/>
        <text x="0" y="3" text-anchor="middle" fill="${secondary}" font-family="system-ui, sans-serif" font-size="22" font-weight="900" letter-spacing="1.5">${escapeXml(
          sfx
        )}</text>
      </g>
    </g>

    <!-- PANEL 4 (Bottom Wide Dialogue & Climax Panel) -->
    <g>
      <rect x="48" y="765" width="704" height="305" fill="url(#panelGrad1)" stroke="#e2e8f0" stroke-width="4"/>
      <!-- Perspective horizon grid -->
      <line x1="48" y1="960" x2="752" y2="960" stroke="${accent}" stroke-width="2" stroke-opacity="0.4"/>
      <line x1="400" y1="960" x2="120" y2="1070" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.3"/>
      <line x1="400" y1="960" x2="400" y2="1070" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.3"/>
      <line x1="400" y1="960" x2="680" y2="1070" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.3"/>

      <!-- Speech Bubble -->
      <rect x="84" y="800" width="632" height="145" rx="28" fill="#f8fafc" stroke="#0f172a" stroke-width="4"/>
      <polygon points="220,800 250,765 270,800" fill="#f8fafc"/>
      ${dialogueLines2
        .map(
          (l, i) =>
            `<text x="400" y="${848 + i * 32}" text-anchor="middle" fill="#0f172a" font-family="system-ui, sans-serif" font-size="21" font-weight="700">${escapeXml(
              l
            )}</text>`
        )
        .join('')}

      <text x="400" y="1032" text-anchor="middle" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="15" font-weight="600">
        Usa las flechas, toca los laterales de la pantalla o desliza para cambiar de página
      </text>
    </g>

    <!-- Page Footer -->
    <text x="48" y="1112" fill="#64748b" font-family="system-ui, sans-serif" font-size="14" font-weight="600">MangaShelf Reader • Obra Ficticia</text>
    <text x="752" y="1112" text-anchor="end" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="16" font-weight="800">PÁGINA ${pageNumber} DE ${
    chapter.pagesCount
  }</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function splitTextIntoLines(text, maxCharsPerLine, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length <= maxCharsPerLine) {
      current = (current + ' ' + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  const remainingWords = words.slice(
    lines.join(' ').split(/\s+/).filter(Boolean).length
  );
  if (remainingWords.length > 0 && lines.length < maxLines) {
    const lastLine = remainingWords.join(' ');
    lines.push(
      lastLine.length > maxCharsPerLine + 6
        ? lastLine.slice(0, maxCharsPerLine + 3) + '...'
        : lastLine
    );
  } else if (current && lines.length < maxLines) {
    lines.push(current);
  }
  return lines;
}
