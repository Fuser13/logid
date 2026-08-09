/*
 * Datos ficticios y reproducibles para el Módulo 02.
 * No consulta servicios externos ni conserva estado fuera de esta ejecución.
 */

const STATES = Object.freeze(['pendiente', 'preparado', 'despachado']);
const DEMO_START_MS = Date.UTC(2026, 0, 12, 8, 0, 0);
const DELIVERY_ZONES = Object.freeze([
  'Córdoba Capital',
  'La Matanza',
  'Rosario',
  'Mendoza Centro',
  'Quilmes',
  'Tucumán',
  'Mar del Plata',
  'Lanús',
  'Pilar',
  'San Isidro',
]);

/** Convierte una seed de texto o número en un entero estable de 32 bits. */
function seedToUint32(seed) {
  const text = String(seed);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

/** Generador pseudoaleatorio Mulberry32: misma seed, misma secuencia. */
function createRandom(seed) {
  let state = seedToUint32(seed);

  return function random() {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function createShipment(idNumber, enteredAtMs, random) {
  const stateChanges = [
    { state: 'pendiente', timestamp: new Date(enteredAtMs).toISOString() },
  ];
  const bultos = randomInt(random, 1, 15);
  const stateRoll = random();

  // Distribución objetivo: 24% pendiente, 15% preparado, 61% despachado.
  if (stateRoll >= 0.24) {
    const preparedAtMs = enteredAtMs + randomInt(random, 12, 95) * 60_000;
    stateChanges.push({
      state: 'preparado',
      timestamp: new Date(preparedAtMs).toISOString(),
    });

    if (stateRoll >= 0.39) {
      const dispatchedAtMs = preparedAtMs + randomInt(random, 18, 150) * 60_000;
      stateChanges.push({
        state: 'despachado',
        timestamp: new Date(dispatchedAtMs).toISOString(),
      });
    }
  }

  const currentState = stateChanges.at(-1).state;

  return {
    id: `NC-${String(idNumber).padStart(4, '0')}`,
    cliente: 'NanoCargo',
    zonaEntrega: DELIVERY_ZONES[randomInt(random, 0, DELIVERY_ZONES.length - 1)],
    bultos,
    peso: Number((bultos * (2 + random() * 6)).toFixed(1)),
    remitoId: `R-${String(idNumber).padStart(5, '0')}`,
    enteredAt: stateChanges[0].timestamp,
    stateChanges,
    currentState,
  };
}

/**
 * Genera envíos ficticios, en orden de entrada.
 * @param {number} count Cantidad de envíos a generar.
 * @param {string|number} seed Semilla reproducible.
 * @returns {{id: string, cliente: string, zonaEntrega: string, bultos: number, peso: number, remitoId: string, enteredAt: string, stateChanges: {state: string, timestamp: string}[], currentState: string}[]}
 */
export function generateShipments(count, seed = 'logid-module-02') {
  if (!Number.isInteger(count) || count < 0) {
    throw new TypeError('count debe ser un entero igual o mayor que cero.');
  }

  const random = createRandom(seed);
  const shipments = [];
  let enteredAtMs = DEMO_START_MS;

  for (let index = 1; index <= count; index += 1) {
    enteredAtMs += randomInt(random, 4, 20) * 60_000;
    shipments.push(createShipment(index, enteredAtMs, random));
  }

  return shipments;
}

export { DELIVERY_ZONES, STATES };

// Muestra pedida para validar la forma del dato durante esta etapa.
console.log('LogID · muestra de 12 envíos ficticios (seed: logid-module-02)');
console.table(generateShipments(12));
