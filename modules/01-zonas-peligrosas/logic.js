/* Módulo 01 — Zonas peligrosas.
   PASO 1: layout + mapa a nivel provincia.
   PASO 2: geometría controlada (point-in-polygon) + cálculo del ahorro.
   Las animaciones (lluvia de pines, conteo) son el paso 3. */

(function () {
  'use strict';

  /* Fallback embebido de data.json: con file:// el fetch queda bloqueado por CORS,
     así que el módulo tiene que arrancar igual sin él. */
  const FALLBACK = {
    defaults: {
      volumen: 500,
      periodo: 'diario',
      porcentajePeligroso: 30,
      costoEnvio: 4500,
      fleteIda: 3800,
      fleteVuelta: 3800,
      pagoChofer: 2500,
      costoGestionPrevia: 0,
    },
    proyeccion: {
      diario: 260,
      mensual: 12,
      etiquetaDiario: '260 días hábiles',
      etiquetaMensual: '12 meses',
    },
    mapa: {
      provincia: 'Buenos Aires',
      center: [-36.6, -60.0],
      zoom: 6,
      minZoom: 5,
      maxZoom: 9,
      bounds: [
        [-41.2, -63.6],
        [-33.2, -56.6],
      ],
      /* Contorno trazado contra la costa real. El anterior tenía 16 puntos y sus
         rectas cortaban sobre el mar: las manchas caían al Atlántico aunque el
         test dijera "dentro del área". Cada vértice queda ~10 km tierra adentro. */
      areaOperacion: [
        [-36.4, -56.79], [-36.327, -56.891], [-36.324, -57.171], [-36.316, -57.171],
        [-36.299, -57.171], [-36.268, -57.233], [-36.147, -57.38], [-35.904, -57.469],
        [-35.334, -57.319], [-34.97, -57.793], [-34.737, -58.31], [-34.601, -58.494],
        [-34.506, -58.551], [-34.137, -58.337], [-33.908, -58.79], [-33.727, -59.238],
        [-33.547, -59.673], [-33.378, -60.121], [-33.26, -60.6], [-33.279, -61.094],
        [-33.281, -61.614], [-33.299, -62.18], [-33.31, -62.845], [-33.84, -63.16],
        [-34.366, -63.399], [-34.974, -63.398], [-35.491, -63.396], [-35.959, -63.385],
        [-36.4, -63.38], [-36.841, -63.385], [-37.309, -63.396], [-37.826, -63.398],
        [-38.434, -63.399], [-39.186, -63.386], [-39.6, -63.39], [-40.1, -63.39],
        [-40.6, -63.39], [-41.0, -63.39], [-41.0, -62.72], [-40.9, -62.48],
        [-40.8, -62.38], [-40.7, -62.32], [-40.6, -62.28], [-40.5, -62.42],
        [-40.4, -62.52], [-40.3, -62.58], [-40.2, -62.48], [-40.1, -62.42],
        [-40.0, -62.42], [-39.9, -62.42], [-39.8, -62.22], [-39.7, -62.18],
        [-39.6, -62.22], [-39.5, -62.18], [-39.4, -62.12], [-39.3, -62.22],
        [-39.2, -62.42], [-38.738, -62.299], [-38.796, -62.068], [-38.886, -61.867],
        [-38.882, -61.407], [-38.879, -60.993], [-38.83, -60.6], [-38.78, -60.223],
        [-38.73, -59.843], [-38.69, -59.433], [-38.592, -59.007], [-38.507, -58.493],
        [-38.293, -57.995], [-37.921, -57.615], [-37.506, -57.195], [-36.979, -56.946],
      ],
    },
    simulacion: {
      maxPines: 500,
      poligonosMin: 3,
      poligonosMax: 6,
      radioMin: 0.14,
      radioMax: 0.42,
      verticesMin: 9,
      verticesMax: 13,
    },
  };

  const el = (id) => document.getElementById(id);

  const dom = {
    form: el('zp-form'),
    volumen: el('zp-volumen'),
    pct: el('zp-pct'),
    pctNum: el('zp-pct-num'),
    costoEnvio: el('zp-costo-envio'),
    fleteIda: el('zp-flete-ida'),
    fleteVuelta: el('zp-flete-vuelta'),
    pagoChofer: el('zp-pago-chofer'),
    costoFallido: el('zp-costo-fallido'),
    provincia: el('zp-provincia'),
    badge: el('zp-map-badge'),
    map: el('zp-map'),
    mapWrap: el('zp-map-wrap'),
    results: el('zp-results'),
    tour: el('zp-tour'),
    tourZona: el('zp-tour-zona'),
    tourDato: el('zp-tour-dato'),
  };

  const money = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
  const nf = new Intl.NumberFormat('es-AR');
  const pctFmt = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  let config = FALLBACK;
  let map = null;
  let capaZonas = null;
  let capaParticulas = null;
  let capaPines = null;
  let capaFlotantes = null;

  /* Última corrida: la vista final se arma con datos ya calculados. */
  let ultima = null;

  /* ---------- Calibración del zoom-tour ----------
     Estos tres números son los que se tocan para que el recorrido se sienta
     bien. Nada más del tour está hardcodeado. */
  const TOUR_ZOOM_MS = 1000;   /* volar hasta la zona */
  const TOUR_HOLD_MS = 900;    /* leer el dato antes de seguir */
  const TOUR_VUELTA_MS = 1200; /* volver a la vista provincial al terminar */
  const TOUR_MAX_PARADAS = 4;  /* solo frenan las zonas más gordas */

  /* ---------- Coreografía del momento wow ----------
     La lluvia es la estrella; el conteo la corona (arranca cuando la lluvia
     termina, no compite con ella). */
  const TIMING = {
    zonasIn: 420,      /* fade-in de los polígonos */
    lluviaDelay: 200,  /* respiro antes del primer pin */
    lluviaSpread: 1500,/* ventana en la que caen todos los pines */
    dropDur: 400,      /* cuánto tarda un pin en caer */
    lotes: 26,         /* olas de la cascada: agrupar pines protege el framerate */
    conteo: 950,       /* count-up del ahorro */
  };

  const reduceMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Handles para poder cancelar si el usuario vuelve a apretar Calcular.
     Los conteos van en lista: el del período y el anual corren a la vez, y con
     un solo slot el segundo pisaba el handle del primero y lo dejaba huérfano. */
  const anim = { timers: [], rafs: [] };

  /* Corta solo los count-up. El toggle de período lo usa para reanimar el anual
     sin abortar el tour, que no tiene nada que ver. */
  function cancelarConteos() {
    anim.rafs.forEach((h) => h && cancelAnimationFrame(h));
    anim.rafs = [];
  }

  function cancelarAnimaciones() {
    anim.timers.forEach(clearTimeout);
    anim.timers = [];
    cancelarConteos();

    /* Se limpia siempre, no solo con el tour activo: al terminar queda pendiente
       el timer que revela las etiquetas, y no tiene que caer sobre la corrida
       nueva. */
    limpiarTimersTour();
    desactivarSkip();
    ocultarHud();
    if (tour.activo) {
      tour.activo = false;
      map.stop();
    }
  }

  function luego(fn, ms) {
    anim.timers.push(setTimeout(fn, ms));
  }

  /* ================================================================
     GEOMETRÍA
     ================================================================ */

  /* Point-in-polygon por ray casting. Punto y vértices como [lat, lng];
     lat hace de Y y lng de X. A nivel provincia la distorsión de tratar
     grados como plano es irrelevante para decidir dentro/fuera. */
  function pointInPolygon(punto, poligono) {
    const y = punto[0];
    const x = punto[1];
    let dentro = false;

    for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
      const yi = poligono[i][0];
      const xi = poligono[i][1];
      const yj = poligono[j][0];
      const xj = poligono[j][1];

      const cruza = yi > y !== yj > y;
      if (cruza && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        dentro = !dentro;
      }
    }
    return dentro;
  }

  function dentroDeAlguna(punto, poligonos) {
    for (let i = 0; i < poligonos.length; i++) {
      if (pointInPolygon(punto, poligonos[i])) return true;
    }
    return false;
  }

  function bbox(poligono) {
    let latMin = Infinity, latMax = -Infinity, lngMin = Infinity, lngMax = -Infinity;
    for (const [lat, lng] of poligono) {
      if (lat < latMin) latMin = lat;
      if (lat > latMax) latMax = lat;
      if (lng < lngMin) lngMin = lng;
      if (lng > lngMax) lngMax = lng;
    }
    return { latMin, latMax, lngMin, lngMax };
  }

  /* Área por fórmula del cordón (shoelace). Se usa para repartir los pines
     rojos entre polígonos en proporción al tamaño de cada zona. */
  function area(poligono) {
    let a = 0;
    for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
      a += poligono[j][1] * poligono[i][0] - poligono[i][1] * poligono[j][0];
    }
    return Math.abs(a / 2);
  }

  const rnd = (min, max) => min + Math.random() * (max - min);
  const rndInt = (min, max) => Math.floor(rnd(min, max + 1));

  function barajar(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function puntoEnArea(areaOperacion, caja) {
    for (let i = 0; i < 400; i++) {
      const p = [
        rnd(caja.latMin, caja.latMax),
        rnd(caja.lngMin, caja.lngMax),
      ];
      if (pointInPolygon(p, areaOperacion)) return p;
    }
    return [(caja.latMin + caja.latMax) / 2, (caja.lngMin + caja.lngMax) / 2];
  }

  /* Mancha irregular: radios con jitter por vértice, para que no parezcan
     círculos perfectos. */
  function manchaAlrededor(centro, sim, factor) {
    const rLat = rnd(sim.radioMin, sim.radioMax) * factor;
    const rLng = rnd(sim.radioMin, sim.radioMax) * 1.25 * factor;
    const n = rndInt(sim.verticesMin, sim.verticesMax);
    const zona = [];

    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const jitter = rnd(0.62, 1.3);
      zona.push([
        centro[0] + Math.sin(ang) * rLat * jitter,
        centro[1] + Math.cos(ang) * rLng * jitter,
      ]);
    }
    return zona;
  }

  /* Último recurso: cada vértice que quedó afuera se trae por su propio radio
     hasta el último punto que sigue en tierra. Deforma un poco la mancha, pero
     nunca la deja mojarse. */
  function recortarAlArea(zona, centro, areaOperacion) {
    return zona.map((v) => {
      if (pointInPolygon(v, areaOperacion)) return v;

      const dLat = v[0] - centro[0];
      const dLng = v[1] - centro[1];

      for (let t = 0.92; t > 0.05; t -= 0.06) {
        const p = [centro[0] + dLat * t, centro[1] + dLng * t];
        if (pointInPolygon(p, areaOperacion)) return p;
      }
      return [centro[0] + dLat * 0.05, centro[1] + dLng * 0.05];
    });
  }

  /* Una zona peligrosa es un barrio, no un banco de niebla: NINGÚN vértice
     puede quedar en el agua. Se reintenta con otro centro, después con manchas
     más chicas, y recién al final se recortan los vértices rebeldes. */
  function generarZona(areaOperacion, caja, sim) {
    let zona = null;
    let centro = null;

    for (let intento = 0; intento < 16; intento++) {
      const factor = intento < 8 ? 1 : 0.6;
      centro = puntoEnArea(areaOperacion, caja);
      zona = manchaAlrededor(centro, sim, factor);
      if (zona.every((v) => pointInPolygon(v, areaOperacion))) return zona;
    }

    return recortarAlArea(zona, centro, areaOperacion);
  }

  function generarZonas(sim, mapa) {
    const caja = bbox(mapa.areaOperacion);
    const cantidad = rndInt(sim.poligonosMin, sim.poligonosMax);
    const zonas = [];
    for (let i = 0; i < cantidad; i++) {
      zonas.push(generarZona(mapa.areaOperacion, caja, sim));
    }
    return zonas;
  }

  /* Pin PELIGROSO: se sortea una zona (ponderada por área) y se samplea dentro
     de su bounding box hasta caer adentro del polígono. */
  function pinEnZonas(zonas, acumArea, totalArea) {
    for (let intento = 0; intento < 600; intento++) {
      const t = Math.random() * totalArea;
      let idx = 0;
      while (idx < acumArea.length - 1 && acumArea[idx] < t) idx++;

      const zona = zonas[idx];
      const caja = bbox(zona);
      const p = [rnd(caja.latMin, caja.latMax), rnd(caja.lngMin, caja.lngMax)];
      if (pointInPolygon(p, zona)) return p;
    }
    return null;
  }

  /* Pin SEGURO: dentro del área de operación y fuera de TODAS las zonas. */
  function pinFueraDeZonas(areaOperacion, caja, zonas) {
    for (let intento = 0; intento < 600; intento++) {
      const p = [rnd(caja.latMin, caja.latMax), rnd(caja.lngMin, caja.lngMax)];
      if (pointInPolygon(p, areaOperacion) && !dentroDeAlguna(p, zonas)) return p;
    }
    return null;
  }

  /* El corazón: devuelve zonas + pines con EXACTAMENTE `objetivoDentro` pines
     adentro. El flag `peligroso` no se cree la intención: se recalcula con
     point-in-polygon sobre la geometría final. */
  function simular(totalPines, objetivoDentro) {
    const sim = config.simulacion;
    const mapa = config.mapa;
    const caja = bbox(mapa.areaOperacion);

    const zonas = generarZonas(sim, mapa);

    /* Ruleta ponderada por área de cada zona. */
    const areas = zonas.map(area);
    const totalArea = areas.reduce((a, b) => a + b, 0);
    const acumArea = [];
    areas.reduce((acc, a, i) => (acumArea[i] = acc + a), 0);

    const pines = [];

    for (let i = 0; i < objetivoDentro; i++) {
      const p = pinEnZonas(zonas, acumArea, totalArea);
      if (p) pines.push(p);
    }
    for (let i = 0; i < totalPines - objetivoDentro; i++) {
      const p = pinFueraDeZonas(mapa.areaOperacion, caja, zonas);
      if (p) pines.push(p);
    }

    /* Verificación independiente: el color sale del test geométrico, no de
       cómo se generó el punto. Si el mapa dice rojo, es porque está adentro.
       De paso se anota EN CUÁL zona cayó — las zonas pueden solaparse, así que
       se queda con la primera que lo contiene y los conteos siguen sumando el
       total exacto de rojos. */
    const marcados = pines.map((p) => {
      let zona = -1;
      for (let i = 0; i < zonas.length; i++) {
        if (pointInPolygon(p, zonas[i])) {
          zona = i;
          break;
        }
      }
      return { lat: p[0], lng: p[1], peligroso: zona !== -1, zona: zona };
    });

    const rojos = marcados.filter((p) => p.peligroso).length;

    /* Dato por zona para el tour: se calcula acá, una sola vez. Durante el
       recorrido no se recalcula nada. */
    const porZona = zonas.map((poligono, indice) => ({ indice, poligono, rojos: 0 }));
    marcados.forEach((p) => {
      if (p.zona >= 0) porZona[p.zona].rojos++;
    });

    /* Los rojos se generan primero: sin barajar, la lluvia caería toda roja y
       después toda verde. Mezclados, la cascada se lee como aleatoria. */
    barajar(marcados);

    return { zonas, porZona, pines: marcados, rojos, total: marcados.length };
  }

  /* ================================================================
     PINES TECH (marcadores geométricos)
     ================================================================ */

  /* Extendemos CircleMarker en vez de usar divIcon: así reusamos todo el ciclo
     de vida de Leaflet (proyección, panes, className, setRadius) pero dibujando
     otra forma. Cada pin sigue siendo UN <path> — mismo costo que el círculo,
     cero filtros por elemento, la lluvia del paso 3 no se entera. */
  function pathDiamante(p, r) {
    return (
      'M' + p.x + ' ' + (p.y - r) +
      'L' + (p.x + r) + ' ' + p.y +
      'L' + p.x + ' ' + (p.y + r) +
      'L' + (p.x - r) + ' ' + p.y + 'Z'
    );
  }

  /* El cuadrado se dibuja un poco más chico: a igual radio tiene más área que
     el rombo y los seguros terminarían pesando más que los peligrosos. */
  function pathCuadrado(p, r) {
    const l = r * 0.82;
    return (
      'M' + (p.x - l) + ' ' + (p.y - l) +
      'h' + l * 2 + 'v' + l * 2 + 'h' + -l * 2 + 'Z'
    );
  }

  const PinTech = L.CircleMarker.extend({
    options: { forma: 'diamante' },
    _updatePath: function () {
      const d =
        this.options.forma === 'diamante'
          ? pathDiamante(this._point, this._radius)
          : pathCuadrado(this._point, this._radius);
      this._renderer._setPath(this, d);
    },
  });

  /* El glow NO es un filter: es un stroke ancho y translúcido del mismo color.
     Un halo pintado con el propio path, gratis. */
  function estiloPin(peligroso) {
    const color = peligroso ? '#ff4d6d' : '#35f0a0';
    return {
      forma: peligroso ? 'diamante' : 'cuadrado',
      color: color,
      weight: 2,
      opacity: 0.28,
      fillColor: color,
      fillOpacity: 0.95,
      radius: 3.2,
      interactive: false,
    };
  }

  /* De lejos son 500 puntos sobre una provincia: si el halo es grueso se
     empastan en una mancha. De cerca (el tour se acerca) tienen que leerse como
     figuras.

     Crecer los pines redibujando cada path (setRadius + setStyle) son 1000
     operaciones justo al aterrizar el flyTo: costaba un frame de ~200ms. Se
     hace con UNA clase en el contenedor y un scale de CSS: el path no se
     recalcula, y el scale agranda el halo junto con la figura. */
  function tramoDeZoom(z) {
    if (z >= 9) return 'zp-map-wrap--cerca';
    if (z >= 8) return 'zp-map-wrap--medio';
    return '';
  }

  let tramoActual = '';

  function ajustarPinesAlZoom() {
    const tramo = tramoDeZoom(map.getZoom());
    if (tramo === tramoActual) return;
    if (tramoActual) dom.mapWrap.classList.remove(tramoActual);
    if (tramo) dom.mapWrap.classList.add(tramo);
    tramoActual = tramo;
  }

  /* ================================================================
     CÁLCULO DEL AHORRO
     ================================================================ */

  function calcularAhorro(i) {
    const costoDobleViaje = i.fleteIda + i.fleteVuelta + i.pagoChofer;
    const enviosPeligrosos = Math.round((i.volumen * i.pct) / 100);

    const perdidaActual = enviosPeligrosos * costoDobleViaje;
    const costoGestionPrevia = config.defaults.costoGestionPrevia || 0;
    const costoDeteccionTemprana = enviosPeligrosos * costoGestionPrevia;
    const ahorro = perdidaActual - costoDeteccionTemprana;

    const factor =
      i.periodo === 'diario' ? config.proyeccion.diario : config.proyeccion.mensual;
    const etiquetaFactor =
      i.periodo === 'diario'
        ? config.proyeccion.etiquetaDiario
        : config.proyeccion.etiquetaMensual;

    return {
      costoDobleViaje,
      enviosPeligrosos,
      perdidaActual,
      costoDeteccionTemprana,
      ahorro,
      ahorroAnual: ahorro * factor,
      factor,
      etiquetaFactor,
    };
  }

  /* ================================================================
     RENDER
     ================================================================ */

  function dibujarMapa(sim, animar) {
    capaZonas.clearLayers();
    capaPines.clearLayers();
    capaFlotantes.clearLayers();

    sim.zonas.forEach((zona) => {
      L.polygon(zona, {
        /* Entrada y pulso NO conviven: las dos usan el shorthand `animation`
           con la misma especificidad, así que la última del archivo pisaba a la
           otra y el radar nunca corría. Van en secuencia (ver desfasarZonas). */
        className: 'zp-zona' + (animar ? ' zp-zona--entra' : ''),
        color: '#ff4d6d',
        weight: 2,
        opacity: 0.9,
        /* El alfa lo llevan los stops del gradiente, no esta opción. */
        fillOpacity: 1,
        interactive: false,
      }).addTo(capaZonas);
    });

    dibujarParticulas(sim.zonas, animar);

    sim.pines.forEach((pin) => {
      const opciones = estiloPin(pin.peligroso);
      opciones.className =
        (pin.peligroso ? 'zp-pin zp-pin--rojo' : 'zp-pin zp-pin--ok') +
        (animar ? ' zp-pin--cae' : '');
      new PinTech([pin.lat, pin.lng], opciones).addTo(capaPines);
    });

    if (animar) {
      escalonarLluvia();
      /* El radar arranca cuando la mancha terminó de aparecer. */
      luego(desfasarZonas, TIMING.zonasIn);
    }
  }

  /* Cambia la entrada por el pulso. Se hace por clase y no sumando animaciones
     al shorthand porque el delay/duration inline de acá tiene que caerle al
     radar, no a la entrada.
     Si todas las manchas pulsaran al unísono parecería un semáforo: cada una
     arranca en otro punto del ciclo y con otra duración. */
  function desfasarZonas() {
    dom.map.querySelectorAll('.zp-zona--entra').forEach((path, i) => {
      path.classList.remove('zp-zona--entra');
      path.classList.add('zp-zona--pulso');
      path.style.animationDelay = -(i * 620) + 'ms';
      path.style.animationDuration = 2400 + i * 180 + 'ms';
    });
  }

  const PARTICULAS_POR_ZONA = 4;

  function puntoEnZona(zona) {
    const caja = bbox(zona);
    for (let i = 0; i < 200; i++) {
      const p = [rnd(caja.latMin, caja.latMax), rnd(caja.lngMin, caja.lngMax)];
      if (pointInPolygon(p, zona)) return p;
    }
    return null;
  }

  /* Cuatro puntos de energía por mancha. Sin stroke, sin filtro: es una
     animación de opacity + translate sobre ~24 elementos en total. */
  function dibujarParticulas(zonas, animar) {
    capaParticulas.clearLayers();
    if (!animar) return; /* reduced-motion: mancha quieta */

    zonas.forEach((zona) => {
      for (let i = 0; i < PARTICULAS_POR_ZONA; i++) {
        const p = puntoEnZona(zona);
        if (!p) continue;
        L.circleMarker(p, {
          className: 'zp-part',
          radius: rnd(1.2, 2.6),
          stroke: false,
          fillColor: '#ff8fa3',
          fillOpacity: 0.5,
          interactive: false,
        }).addTo(capaParticulas);
      }
    });

    dom.map.querySelectorAll('.zp-part').forEach((path, i) => {
      path.style.animationDelay = -(i * 430) + 'ms';
      path.style.animationDuration = 6000 + (i % 5) * 900 + 'ms';
    });
  }

  /* La lluvia no la maneja JS frame a frame: se le reparte a cada pin un
     animation-delay y el compositor del navegador corre la línea de tiempo.
     Los pines se agrupan en olas (TIMING.lotes) — con 500 delays distintos
     hay demasiadas animaciones SVG simultáneas y el framerate se cae. */
  function escalonarLluvia() {
    const paths = dom.map.querySelectorAll('.zp-pin--cae');
    const total = paths.length;
    if (!total) return;

    const porLote = Math.ceil(total / TIMING.lotes);
    const pasoLote = TIMING.lluviaSpread / Math.max(TIMING.lotes - 1, 1);

    paths.forEach((path, i) => {
      const lote = Math.floor(i / porLote);
      path.style.animationDelay = TIMING.lluviaDelay + lote * pasoLote + 'ms';
    });
  }

  /* Count-up con easeOutExpo: arranca rápido y frena, para que el número
     "aterrice" en vez de cortarse de golpe. */
  function contarHasta(nodo, valor, duracion, remate) {
    const clase = remate || 'zp-ahorro__num--land';
    nodo.classList.remove(clase);
    const inicio = performance.now();

    /* Slot propio: así dos conteos simultáneos no se pisan el handle. */
    const slot = anim.rafs.length;
    anim.rafs.push(null);

    function frame(ahora) {
      const t = Math.min((ahora - inicio) / duracion, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      nodo.textContent = money.format(Math.round(valor * eased));
      if (t < 1) anim.rafs[slot] = requestAnimationFrame(frame);
      else {
        nodo.textContent = money.format(valor);
        nodo.classList.add(clase);
        anim.rafs[slot] = null;
      }
    }
    anim.rafs[slot] = requestAnimationFrame(frame);
  }

  /* `animar` es {base, anual}: el toggle de período reanima solo el anual,
     porque el número base no cambia de valor y recontarlo desde cero haría
     dudar de si cambió. Se mueve lo que efectivamente cambió. */
  function renderResultados(i, r, sim, escala, animar) {
    const empresa = window.LogIDBrand
      ? window.LogIDBrand.getCompanyName()
      : 'la empresa';
    const periodo = i.periodo === 'diario' ? 'por día' : 'por mes';
    const unidad = i.periodo === 'diario' ? '/ día' : '/ mes';
    const pctReal = (sim.rojos / sim.total) * 100;

    /* Contraste exitoso vs fallido: le da magnitud a la pérdida. El múltiplo
       se calcula, no se afirma — si el flete normal es 0 no hay comparación. */
    const ratio = i.costoEnvio > 0 ? r.costoDobleViaje / i.costoEnvio : null;
    const nota =
      ratio === null
        ? 'Cargá el costo por envío para ver la comparación.'
        : `${pctFmt.format(ratio)}× lo que cuesta un envío que sí se entrega — y acá no se entrega nada.`;

    dom.results.innerHTML = `
      <h2 class="zp-panel__title">Resultado para ${empresa}</h2>

      <div class="zp-ahorro">
        <span class="zp-ahorro__kicker">Ahorro detectando antes de rutear</span>

        <span class="zp-ahorro__linea">
          <strong class="zp-ahorro__num" id="zp-ahorro-num" data-valor="${r.ahorro}">${
            animar.base ? money.format(0) : money.format(r.ahorro)
          }</strong>
          <span class="zp-ahorro__unidad">${unidad}</span>
        </span>

        <span class="zp-anual">
          <span class="zp-anual__label">proyectado al año</span>
          <span class="zp-anual__linea">
            <strong class="zp-anual__num" id="zp-anual-num" data-valor="${r.ahorroAnual}">${
              animar.anual ? money.format(0) : money.format(r.ahorroAnual)
            }</strong>
            <em class="zp-anual__factor">× ${r.etiquetaFactor}</em>
          </span>
        </span>
      </div>

      <div class="zp-contraste">
        <div class="zp-contraste__item">
          <span class="zp-contraste__label">Envío exitoso</span>
          <strong class="zp-contraste__val">${money.format(i.costoEnvio)}</strong>
          <span class="zp-contraste__note">llega a destino</span>
        </div>
        <span class="zp-contraste__vs">vs</span>
        <div class="zp-contraste__item zp-contraste__item--mal">
          <span class="zp-contraste__label">Envío fallido</span>
          <strong class="zp-contraste__val">${money.format(r.costoDobleViaje)}</strong>
          <span class="zp-contraste__note">vuelve al remitente</span>
        </div>
        <p class="zp-contraste__nota">${nota}</p>
      </div>

      <div class="zp-desglose">
        <div class="zp-stat zp-stat--danger">
          <span class="zp-stat__label">Pérdida actual ${periodo}</span>
          <strong class="zp-stat__value">${money.format(r.perdidaActual)}</strong>
          <span class="zp-stat__note">se descubre en la calle</span>
        </div>
        <div class="zp-stat">
          <span class="zp-stat__label">Envíos afectados</span>
          <strong class="zp-stat__value">${nf.format(r.enviosPeligrosos)}</strong>
          <span class="zp-stat__note">de ${nf.format(i.volumen)} ${periodo} · ${i.pct}%</span>
        </div>
        <div class="zp-stat">
          <span class="zp-stat__label">Costo del doble viaje</span>
          <strong class="zp-stat__value">${money.format(r.costoDobleViaje)}</strong>
          <span class="zp-stat__note">por cada envío fallido</span>
        </div>
        <div class="zp-stat zp-stat--ok">
          <span class="zp-stat__label">Costo detectando antes</span>
          <strong class="zp-stat__value">${money.format(r.costoDeteccionTemprana)}</strong>
          <span class="zp-stat__note">no se gasta el viaje</span>
        </div>
      </div>

      <p class="zp-formula">
        <span>${nf.format(r.enviosPeligrosos)} envíos en zona peligrosa</span>
        <span>×</span>
        <span>${money.format(r.costoDobleViaje)} (ida + vuelta + chofer)</span>
        <span>=</span>
        <strong>${money.format(r.perdidaActual)} tirados ${periodo}</strong>
      </p>

      <p class="zp-check">
        Verificación geométrica: <strong>${nf.format(sim.rojos)}</strong> de
        <strong>${nf.format(sim.total)}</strong> pines dentro de los polígonos =
        <strong>${pctFmt.format(pctReal)}%</strong>
        ${escala > 1 ? `· 1 pin = ${nf.format(Math.round(escala))} envíos` : '· 1 pin = 1 envío'}
      </p>
    `;
  }

  /* ================================================================
     ZOOM-TOUR
     ================================================================ */

  const tour = { activo: false, timers: [], skipHandler: null };

  function luegoTour(fn, ms) {
    tour.timers.push(setTimeout(fn, ms));
  }

  function limpiarTimersTour() {
    tour.timers.forEach(clearTimeout);
    tour.timers = [];
  }

  function boundsProvincia() {
    return L.latLngBounds(config.mapa.bounds);
  }

  function ocultarHud() {
    dom.tour.hidden = true;
    dom.tour.classList.remove('zp-tour--visible');
  }

  /* Cualquier click corta el recorrido. Se escucha en captura para ganarle a
     cualquier handler de la página, y solo mientras el tour corre. */
  function activarSkip(alSaltear) {
    tour.skipHandler = () => alSaltear();
    document.addEventListener('pointerdown', tour.skipHandler, {
      capture: true,
      once: true,
    });
  }

  function desactivarSkip() {
    if (!tour.skipHandler) return;
    document.removeEventListener('pointerdown', tour.skipHandler, {
      capture: true,
    });
    tour.skipHandler = null;
  }

  function terminarTour(animado) {
    if (!tour.activo) return;
    tour.activo = false;
    limpiarTimersTour();
    desactivarSkip();
    ocultarHud();
    map.stop(); /* aborta el flyTo en curso */

    const b = boundsProvincia();
    if (animado) {
      map.flyToBounds(b, { duration: TOUR_VUELTA_MS / 1000 });
      /* Las etiquetas entran cuando la cámara ya llegó a la vista provincial. */
      luegoTour(() => vistaFinal(true), TOUR_VUELTA_MS);
    } else {
      /* Salteado: el usuario quiere el resultado YA. */
      map.fitBounds(b, { animate: false });
      vistaFinal(false);
    }
  }

  /* ================================================================
     VISTA FINAL: etiquetas flotantes por zona
     ================================================================ */

  /* Centro del borde superior de la zona: la etiqueta flota ARRIBA de la
     mancha, no encima de los pines. */
  function anclaEtiqueta(poligono) {
    const caja = bbox(poligono);
    return [caja.latMax, (caja.lngMin + caja.lngMax) / 2];
  }

  /* Se dibujan TODAS las zonas, también las que el tour no visitó: la vista
     alejada deja de estar muerta e invita a acercarse a mirar cualquiera. */
  function vistaFinal(animarEntrada) {
    capaFlotantes.clearLayers();
    if (!ultima) return;

    const sim = ultima.sim;
    const costo = ultima.costoDobleViaje;
    const entra = animarEntrada && !reduceMotion();

    sim.porZona.forEach((zona, i) => {
      const plata = zona.rojos * costo;
      const clase = 'zp-flota__pill' + (entra ? ' zp-flota__pill--entra' : '');
      const delay = entra ? ' style="animation-delay:' + i * 90 + 'ms"' : '';

      const html =
        '<span class="' + clase + '"' + delay + '>' +
        '<b>' + nf.format(zona.rojos) + '</b> pines · ' + money.format(plata) +
        '</span>';

      L.marker(anclaEtiqueta(zona.poligono), {
        icon: L.divIcon({
          className: 'zp-flota',
          html: html,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        interactive: false,
        keyboard: false,
      }).addTo(capaFlotantes);
    });

    ajustarFlotantes();
  }

  /* Dos cosas que arruinan la vista final si no se corrigen:
     1. una zona pegada al borde de arriba deja su etiqueta fuera del marco;
     2. dos zonas cercanas superponen sus etiquetas y no se lee ninguna.

     La caja de cada píldora se calcula, no se lee del DOM: durante la entrada
     está animándose y getBoundingClientRect devolvería la posición a mitad de
     la animación. Los factores replican los --zp-y del CSS. */
  const FLOTA_Y_ARRIBA = -1.7; /* .zp-flota__pill        → translate(-50%, -170%) */
  const FLOTA_Y_ABAJO = 0.8;   /* .zp-flota__pill--abajo → translate(-50%, 80%) */

  function ajustarFlotantes() {
    const cajas = [];

    capaFlotantes.eachLayer((marcador) => {
      const nodo = marcador.getElement();
      if (!nodo || !nodo.firstElementChild) return;

      const pill = nodo.firstElementChild;
      const punto = map.latLngToContainerPoint(marcador.getLatLng());
      const ancho = pill.offsetWidth;
      const alto = pill.offsetHeight;
      if (!alto) return;

      const abajo = punto.y < 38;
      pill.classList.toggle('zp-flota__pill--abajo', abajo);

      cajas.push({
        pill: pill,
        abajo: abajo,
        alto: alto,
        x1: punto.x - ancho / 2,
        x2: punto.x + ancho / 2,
        y1: punto.y + (abajo ? FLOTA_Y_ABAJO : FLOTA_Y_ARRIBA) * alto,
      });
    });

    /* De arriba hacia abajo, cada etiqueta que choca se corre buscando hueco:
       primero en su sentido natural (la que cuelga baja, la que flota sube) y
       si ahí no entra, para el otro lado. Un corrimiento que se sale del marco
       no vale — es el mismo problema que veníamos a resolver. */
    const margen = 4;
    const anchoMapa = dom.map.clientWidth;
    const altoMapa = dom.map.clientHeight;

    cajas.sort((a, b) => a.y1 - b.y1);
    const puestas = [];

    cajas.forEach((c) => {
      /* Si la píldora se pasa por los costados, se corre en X lo justo. */
      let dx = 0;
      if (c.x1 < margen) dx = margen - c.x1;
      else if (c.x2 > anchoMapa - margen) dx = anchoMapa - margen - c.x2;

      const x1 = c.x1 + dx;
      const x2 = c.x2 + dx;

      const paso = c.alto + 5;
      const dir = c.abajo ? 1 : -1;
      const candidatos = [0];
      for (let k = 1; k <= 4; k++) candidatos.push(k * paso * dir, -k * paso * dir);

      const libre = (y) =>
        !puestas.some((q) => x1 < q.x2 && x2 > q.x1 && y < q.y2 && y + c.alto > q.y1);
      const enMarco = (y) => y >= margen && y + c.alto <= altoMapa - margen;

      let extra = candidatos.find((d) => enMarco(c.y1 + d) && libre(c.y1 + d));
      if (extra === undefined) {
        /* Nada limpio: se prioriza que se vea entera antes que no pisar. */
        const yClamp = Math.min(
          Math.max(c.y1, margen),
          altoMapa - c.alto - margen
        );
        extra = yClamp - c.y1;
      }

      c.pill.style.setProperty('--zp-x', dx + 'px');
      c.pill.style.setProperty('--zp-extra', extra + 'px');
      puestas.push({ x1: x1, x2: x2, y1: c.y1 + extra, y2: c.y1 + extra + c.alto });
    });
  }

  /* El tour solo mueve cámara y escribe números ya calculados. */
  function iniciarTour(sim, costoDobleViaje) {
    /* Solo frenan las zonas más gordas, de mayor a menor: la que más duele va
       primero (si el usuario saltea temprano, igual vio la que importa) y las
       chicas no hacen esperar. Se podan del RECORRIDO, no del mapa: siguen
       dibujadas, con sus pines y su etiqueta flotante. */
    const paradas = sim.porZona
      .filter((z) => z.rojos > 0)
      .sort((a, b) => b.rojos - a.rojos)
      .slice(0, TOUR_MAX_PARADAS);

    if (!paradas.length) {
      /* 0% en zona peligrosa: no hay nada que recorrer. */
      map.fitBounds(boundsProvincia(), { animate: false });
      vistaFinal(true);
      return;
    }

    tour.activo = true;
    activarSkip(() => terminarTour(false));

    let i = 0;

    function siguiente() {
      if (!tour.activo) return;

      if (i >= paradas.length) {
        terminarTour(true);
        return;
      }

      const parada = paradas[i];
      const nro = i + 1;
      i++;

      ocultarHud();
      map.flyToBounds(L.latLngBounds(parada.poligono).pad(0.6), {
        duration: TOUR_ZOOM_MS / 1000,
        maxZoom: 10,
      });

      luegoTour(() => {
        if (!tour.activo) return;
        mostrarDato(parada, nro, paradas.length, sim.rojos, costoDobleViaje);
        luegoTour(siguiente, TOUR_HOLD_MS);
      }, TOUR_ZOOM_MS);
    }

    siguiente();
  }

  function mostrarDato(parada, nro, totalParadas, totalRojos, costoDobleViaje) {
    const plata = parada.rojos * costoDobleViaje;
    const share = totalRojos ? Math.round((parada.rojos / totalRojos) * 100) : 0;

    dom.tourZona.textContent = 'Zona ' + nro + ' de ' + totalParadas;
    dom.tourDato.textContent =
      'Acá cayeron ' + nf.format(parada.rojos) + ' pines · ' +
      money.format(plata) + ' · ' + share + '% del total';

    dom.tour.hidden = false;
    /* Reflow para que la transición de entrada corra en cada zona. */
    void dom.tour.offsetWidth;
    dom.tour.classList.add('zp-tour--visible');
  }

  /* ================================================================
     ORQUESTACIÓN
     ================================================================ */

  /* Sin cálculo previo no hay nada que reflejar: el toggle queda inerte hasta
     que el usuario apretó Calcular al menos una vez. */
  function reflejarPeriodo() {
    if (!ultima) return;

    cancelarConteos(); /* el tour, si está corriendo, sigue: no lo toca */

    const i = readInputs();
    const r = calcularAhorro(i);
    const animar = !reduceMotion();

    ultima.costoDobleViaje = r.costoDobleViaje;
    renderResultados(i, r, ultima.sim, ultima.escala, {
      base: false,
      anual: animar,
    });

    if (animar) {
      const anual = el('zp-anual-num');
      if (anual) {
        contarHasta(anual, r.ahorroAnual, TIMING.conteo, 'zp-anual__num--land');
      }
    }
  }

  function calcular() {
    cancelarAnimaciones();

    const i = readInputs();
    const r = calcularAhorro(i);

    /* Tope visual: por encima del tope, cada pin representa varios envíos. */
    const totalPines = Math.min(i.volumen, config.simulacion.maxPines);
    const escala = i.volumen / totalPines;
    const objetivoDentro = Math.round((totalPines * i.pct) / 100);

    const sim = simular(totalPines, objetivoDentro);
    const animar = !reduceMotion();

    ultima = { sim: sim, costoDobleViaje: r.costoDobleViaje, escala: escala };

    dibujarMapa(sim, animar);
    renderResultados(i, r, sim, escala, { base: animar, anual: animar });

    dom.badge.textContent =
      nf.format(sim.rojos) + ' de ' + nf.format(sim.total) + ' pines en zona roja';
    dom.badge.classList.add('zp-badge--activo');

    /* El conteo arranca cuando cayó el último pin: corona la lluvia, no la pisa.
       Y el tour arranca cuando el número terminó de contar. */
    if (animar) {
      const finLluvia = TIMING.lluviaDelay + TIMING.lluviaSpread + TIMING.dropDur;
      luego(() => {
        const nodo = el('zp-ahorro-num');
        if (nodo) contarHasta(nodo, r.ahorro, TIMING.conteo);

        /* El anual cuenta junto al base: son la misma noticia contada en dos
           escalas, si entran en momentos distintos se leen como dos cosas. */
        const anual = el('zp-anual-num');
        if (anual) contarHasta(anual, r.ahorroAnual, TIMING.conteo, 'zp-anual__num--land');

        /* La animación de caída queda "congelada" en su último keyframe por el
           fill-mode: eso le gana a cualquier transform de CSS que venga después.
           Terminada la lluvia se saca la clase y los pines vuelven a ser
           escalables por el tramo de zoom. */
        dom.map.querySelectorAll('.zp-pin--cae').forEach((p) =>
          p.classList.remove('zp-pin--cae')
        );
      }, finLluvia);

      luego(() => iniciarTour(sim, r.costoDobleViaje), finLluvia + TIMING.conteo);
    } else {
      /* Sin animaciones: nada de recorrido, vista provincial con las etiquetas
         puestas directo. */
      map.fitBounds(boundsProvincia(), { animate: false });
      vistaFinal(false);
    }
  }

  /* ---------- Config ---------- */

  async function loadConfig() {
    try {
      const res = await fetch('data.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const json = await res.json();
      return {
        defaults: Object.assign({}, FALLBACK.defaults, json.defaults),
        proyeccion: Object.assign({}, FALLBACK.proyeccion, json.proyeccion),
        mapa: Object.assign({}, FALLBACK.mapa, json.mapa),
        simulacion: Object.assign({}, FALLBACK.simulacion, json.simulacion),
      };
    } catch (e) {
      /* file:// o data.json ausente: seguimos con los defaults embebidos */
      return FALLBACK;
    }
  }

  function applyDefaults() {
    const d = config.defaults;
    dom.volumen.value = d.volumen;
    dom.pct.value = d.porcentajePeligroso;
    dom.pctNum.value = d.porcentajePeligroso;
    dom.costoEnvio.value = d.costoEnvio;
    dom.fleteIda.value = d.fleteIda;
    dom.fleteVuelta.value = d.fleteVuelta;
    dom.pagoChofer.value = d.pagoChofer;

    const periodo = document.querySelector(
      'input[name="periodo"][value="' + d.periodo + '"]'
    );
    if (periodo) periodo.checked = true;

    dom.provincia.textContent = config.mapa.provincia;
    syncPct();
    syncCostoFallido();
  }

  /* ---------- Lectura del formulario ---------- */

  function num(input, min, max) {
    const v = parseFloat(input.value);
    if (!isFinite(v)) return min;
    return Math.min(Math.max(v, min), max);
  }

  function readInputs() {
    return {
      volumen: Math.round(num(dom.volumen, 1, 100000)),
      periodo:
        document.querySelector('input[name="periodo"]:checked')?.value || 'diario',
      pct: Math.round(num(dom.pct, 0, 100)),
      costoEnvio: num(dom.costoEnvio, 0, 1e9),
      fleteIda: num(dom.fleteIda, 0, 1e9),
      fleteVuelta: num(dom.fleteVuelta, 0, 1e9),
      pagoChofer: num(dom.pagoChofer, 0, 1e9),
    };
  }

  /* ---------- Sincronía de campos ---------- */

  function syncPct(source) {
    if (source === 'slider') dom.pctNum.value = dom.pct.value;
    else if (source === 'num') {
      const v = Math.min(Math.max(parseInt(dom.pctNum.value, 10) || 0, 0), 100);
      dom.pct.value = v;
    }
    dom.pct.style.setProperty('--zp-pct', dom.pct.value + '%');
  }

  /* El costo del doble viaje es la suma de los 3 campos: se muestra en vivo
     para que el usuario vea qué le cuesta cada envío fallido. */
  function syncCostoFallido() {
    const i = readInputs();
    dom.costoFallido.textContent = money.format(
      i.fleteIda + i.fleteVuelta + i.pagoChofer
    );
  }

  /* ---------- Mapa ---------- */

  function initMap() {
    const m = config.mapa;
    const bounds = L.latLngBounds(m.bounds);

    map = L.map(dom.map, {
      center: m.center,
      zoom: m.zoom,
      minZoom: m.minZoom,
      maxZoom: m.maxZoom,
      maxBounds: bounds.pad(0.15),
      maxBoundsViscosity: 0.9,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false, /* que la rueda scrollee la página, no el mapa */
    });

    /* Basemap dark, para que el mapa no pelee con los tokens del laboratorio. */
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map);

    /* Contorno del área de operación: los pines caen adentro de esto, no en el mar. */
    L.polygon(m.areaOperacion, {
      className: 'zp-area',
      color: '#4db8ff',
      weight: 1,
      opacity: 0.35,
      fill: false,
      dashArray: '4 6',
      interactive: false,
    }).addTo(map);

    capaZonas = L.layerGroup().addTo(map);
    capaParticulas = L.layerGroup().addTo(map);
    capaPines = L.layerGroup().addTo(map);
    capaFlotantes = L.layerGroup().addTo(map);

    /* El scroll-zoom se habilita solo cuando el mapa tiene el foco del usuario. */
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());

    map.on('zoomend', ajustarPinesAlZoom);
    map.on('moveend', ajustarFlotantes);

    map.fitBounds(bounds);
  }

  /* ---------- Eventos ---------- */

  function wire() {
    dom.pct.addEventListener('input', () => syncPct('slider'));
    dom.pctNum.addEventListener('input', () => syncPct('num'));

    [dom.fleteIda, dom.fleteVuelta, dom.pagoChofer].forEach((input) =>
      input.addEventListener('input', syncCostoFallido)
    );

    dom.form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      calcular();
    });

    /* El período no cambia la geometría: los mismos envíos, contados por día o
       por mes. Así que se rehacen los números sobre la simulación ya dibujada —
       el mapa no se toca — y se reanima solo el anual, que es lo único que
       cambia de valor (×260 ↔ ×12). */
    document.querySelectorAll('input[name="periodo"]').forEach((radio) =>
      radio.addEventListener('change', reflejarPeriodo)
    );

    /* Si el usuario renombra la empresa, el título del resultado la sigue. */
    document.addEventListener('logid:company-change', () => {
      const titulo = dom.results.querySelector('.zp-panel__title');
      if (titulo && window.LogIDBrand) {
        titulo.textContent = 'Resultado para ' + window.LogIDBrand.getCompanyName();
      }
    });
  }

  /* ---------- Arranque ---------- */

  async function init() {
    config = await loadConfig();
    applyDefaults();
    initMap();
    wire();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
