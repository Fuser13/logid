import { generateShipments, STATES } from './data/generateShipments.js';

const DEFAULT_COUNT = 50;
const SEED = 'logid-module-02';
const stateNames = { pendiente: 'Pendiente', preparado: 'Preparado', despachado: 'Despachado' };
const stateInput = document.querySelector('#filter-state');
const zoneInput = document.querySelector('#filter-zone');
const countInput = document.querySelector('#shipment-count');
const simulacionKanban = document.querySelector('#simulacion-kanban');
const advanceButton = document.querySelector('#advance-event');
const autoplayButton = document.querySelector('#autoplay');



const arrivalInput = document.querySelector('#arrival-rate');
const dispatchInput = document.querySelector('#dispatch-rate');
const arrivalVal = document.querySelector('#arrival-rate-value');
const dispatchVal = document.querySelector('#dispatch-rate-value');
const rateDelta = document.querySelector('#rate-delta');
const rateRemainder = document.querySelector('#rate-remainder');
const chartArea = document.querySelector('#rate-chart-area');
const chartLine = document.querySelector('#rate-chart-line');
let shipments = [];
let replayEvents = [];
let currentStates = new Map();
let naiveCounts = {};
let replayIndex = 0;
let autoplayTimer;

let chartData = Array(50).fill(18); // Start with initial remainder of 18
let currentRemainder = 18.0;

// Tab logic
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.fv-tab-btn');
  const panes = document.querySelectorAll('.fv-tab-pane');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
});

// Formulas logic
function updateRateLabels() {
  const arr = parseInt(arrivalInput.value, 10);
  const disp = parseInt(dispatchInput.value, 10);
  arrivalVal.textContent = `${arr} envíos/h`;
  dispatchVal.textContent = `${disp} envíos/h`;
  const delta = arr - disp;
  rateDelta.textContent = `${delta > 0 ? '+' : ''}${delta}/h`;
  rateDelta.style.color = delta > 0 ? 'var(--lg-warn)' : (delta < 0 ? 'var(--lg-accent)' : 'var(--lg-text-dim)');
}
[arrivalInput, dispatchInput].forEach(inp => inp.addEventListener('input', updateRateLabels));
updateRateLabels();

function tickFormulas() {
  const arrival = parseInt(arrivalInput.value, 10);
  const dispatch = parseInt(dispatchInput.value, 10);
  const delta = arrival - dispatch;
  currentRemainder = Math.max(0, currentRemainder + (delta / 20)); // Arbitrary scale for visuals
  rateRemainder.textContent = currentRemainder.toFixed(1).replace('.', ',');
  
  chartData.push(currentRemainder);
  if (chartData.length > 50) chartData.shift();
  
  const maxVal = Math.max(40, ...chartData);
  const pts = chartData.map((val, i) => `${i * (300/49)},${74 - (val/maxVal)*74}`).join(' L');
  chartLine.setAttribute('d', `M0,${74 - (chartData[0]/maxVal)*74} L${pts}`);
  chartArea.setAttribute('d', `M0,74 L0,${74 - (chartData[0]/maxVal)*74} L${pts} L300,74 Z`);
}
setInterval(tickFormulas, 250);

function formatDate(timestamp) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(timestamp));
}

function percentage(value, total) {
  return total ? `${Math.round((value / total) * 100)}%` : '0%';
}

function realCounts() {
  return STATES.reduce((counts, state) => {
    counts[state] = shipments.filter((shipment) => currentStates.get(shipment.id) === state).length;
    return counts;
  }, {});
}

function totalNaiveRecords() {
  return STATES.reduce((total, state) => total + naiveCounts[state], 0);
}

function renderKpis() {
  const counts = realCounts();
  document.querySelector('#kpi-total').textContent = shipments.length;
  STATES.forEach((state) => {
    document.querySelector(`#kpi-${state}`).textContent = percentage(counts[state], shipments.length);
    document.querySelector(`#kpi-${state}-count`).textContent = `${counts[state]} envíos`;
  });
}

function renderFlowStatus() {
  const records = totalNaiveRecords();
  const difference = records - shipments.length;
  const panel = document.querySelector('#flow-panel');
  const stockFlowPanel = document.querySelector('#stock-tab-flow-panel');
  const status = document.querySelector('#flow-status');
  panel.classList.toggle('fv-flow-panel--alert', difference > 0);
  if (stockFlowPanel) stockFlowPanel.classList.toggle('fv-flow-panel--alert', difference > 0);
  
  status.textContent = difference > 0
    ? `ALERTA: ${records} registros de flujo para ${shipments.length} identidades. Hay ${difference} duplicado${difference === 1 ? '' : 's'} por cambios de estado.`
    : `Sin desfasaje todavía: ${records} registro${records === 1 ? '' : 's'} para ${shipments.length} identidades.`;
    
  const flowRecordCount = document.querySelector('#flow-record-count');
  if (flowRecordCount) flowRecordCount.textContent = records;
  const stockFlowRecordCount = document.querySelector('#stock-flow-record-count');
  if (stockFlowRecordCount) stockFlowRecordCount.textContent = records;
  const stockIdentityCount = document.querySelector('#stock-identity-count');
  if (stockIdentityCount) stockIdentityCount.textContent = shipments.length;
}

function renderStock() {
  const counts = realCounts();
  const initial = 0;
  const entries = shipments.length;
  const exits = counts.despachado;
  const finalStock = initial + entries - exits;
  const identitiesInOperation = counts.pendiente + counts.preparado;
  document.querySelector('#stock-initial').textContent = initial;
  document.querySelector('#stock-entries').textContent = entries;
  document.querySelector('#stock-exits').textContent = exits;
  document.querySelector('#stock-final').textContent = finalStock;
  document.querySelector('#stock-identities').textContent = identitiesInOperation;
  document.querySelector('#stock-check').textContent = `${finalStock} = ${identitiesInOperation}`;
}

function renderZones() {
  const counts = shipments.reduce((result, shipment) => {
    result[shipment.zonaEntrega] = (result[shipment.zonaEntrega] || 0) + 1;
    return result;
  }, {});
  const sorted = Object.entries(counts).sort(([, left], [, right]) => right - left);
  document.querySelector('#zone-breakdown').innerHTML = sorted.map(([zone, count]) => `
    <div class="fv-zone" style="--zone-pct: ${(count / shipments.length) * 100}%">
      <span title="${zone}">${zone}</span><b>${count}</b><i aria-hidden="true"></i>
    </div>`).join('');
}

function renderSimulacionKanban() {
  const actual = realCounts();
  if (!simulacionKanban) return;
  simulacionKanban.innerHTML = STATES.map((state) => {
    const visible = shipments.filter((shipment) => currentStates.get(shipment.id) === state).slice(0, 4);
    const remaining = actual[state] - visible.length;
    return `<section class="fv-lane fv-lane--${state}" data-state="${state}">
      <header class="fv-lane__head"><span>${stateNames[state]}</span><b>${actual[state]} identidades</b></header>
      ${visible.map((shipment) => `<article class="fv-mini-card"><b>${shipment.id}</b><span>${shipment.zonaEntrega} · ${shipment.bultos} bultos</span></article>`).join('')}
      ${remaining > 0 ? `<p class="fv-mini-card--more">+ ${remaining} identidades aquí</p>` : ''}
    </section>`;
  }).join('');
}

function populateFilters() {
  stateInput.innerHTML = '<option value="all">Todos</option>' + STATES.map((state) => `<option value="${state}">${stateNames[state]}</option>`).join('');
  const zones = [...new Set(shipments.map((shipment) => shipment.zonaEntrega))].sort();
  zoneInput.innerHTML = '<option value="all">Todas</option>' + zones.map((zone) => `<option value="${zone}">${zone}</option>`).join('');
}

function filteredShipments() {
  return shipments.filter((shipment) => (
    (stateInput.value === 'all' || currentStates.get(shipment.id) === stateInput.value)
    && (zoneInput.value === 'all' || shipment.zonaEntrega === zoneInput.value)
  ));
}

function renderTable() {
  const filtered = filteredShipments();
  document.querySelector('#shipment-table-body').innerHTML = filtered.map((shipment) => {
    const state = currentStates.get(shipment.id);
    const applied = shipment.stateChanges.filter((change) => STATES.indexOf(change.state) <= STATES.indexOf(state));
    return `<tr>
      <td>${shipment.id}<br><small>${shipment.remitoId}</small></td>
      <td>${shipment.cliente}</td><td>${shipment.zonaEntrega}</td><td>${shipment.bultos}</td><td>${shipment.peso.toLocaleString('es-AR')} kg</td>
      <td><span class="fv-state fv-state--${state}">${stateNames[state]}</span></td>
      <td class="fv-trace">${applied.map((change) => `${stateNames[change.state]} · ${formatDate(change.timestamp)}`).join('<br>')}</td>
    </tr>`;
  }).join('');
  document.querySelector('#table-results').textContent = `${filtered.length} de ${shipments.length} envíos visibles`;
}

function animateTransit(shipment, from, to) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  
  [simulacionKanban].forEach(targetKanban => {
    if (!targetKanban) return;
    const source = targetKanban.querySelector(`[data-state="${from}"]`);
    const target = targetKanban.querySelector(`[data-state="${to}"]`);
    if (!source || !target) return;
    
    const base = targetKanban.getBoundingClientRect();
    const sourceBox = source.getBoundingClientRect();
    const targetBox = target.getBoundingClientRect();
    
    const transit = document.createElement('div');
    transit.className = 'fv-transit';
    transit.innerHTML = `<b>${shipment.id}</b><span>${stateNames[from]} → ${stateNames[to]}</span>`;
    
    // Add glow trail effect directly on style for visibility
    transit.style.boxShadow = '0 0 25px 8px rgba(53, 240, 160, 0.4), inset 0 0 10px rgba(53, 240, 160, 0.6)';
    transit.style.borderColor = 'rgba(53, 240, 160, 0.8)';
    
    // Position at source
    transit.style.transform = `translate(${sourceBox.left - base.left + 10}px, ${sourceBox.top - base.top + 56}px)`;
    transit.style.transition = 'transform 900ms cubic-bezier(.2,.8,.2,1), opacity 180ms ease';
    targetKanban.append(transit);
    
    // Animate to target
    requestAnimationFrame(() => {
      transit.style.transform = `translate(${targetBox.left - base.left + 10}px, ${targetBox.top - base.top + 56}px)`;
    });
    
    setTimeout(() => transit.classList.add('fv-transit--out'), 940);
    setTimeout(() => transit.remove(), 1150);
  });
}

function renderAll() {
  renderKpis();
  renderFlowStatus();
  renderStock();
  renderSimulacionKanban();
  renderTable();
  document.querySelector('#event-progress').textContent = `${replayIndex} ${replayIndex === 1 ? 'transición aplicada' : 'transiciones aplicadas'} de ${replayEvents.length}`;
  advanceButton.disabled = replayIndex >= replayEvents.length;
}

function advanceEvent() {
  const event = replayEvents[replayIndex];
  if (!event) {
    stopAutoplay();
    return;
  }
  currentStates.set(event.shipment.id, event.to);
  naiveCounts[event.to] += 1; // El error: se agrega la fila nueva, pero no se quita la anterior.
  replayIndex += 1;
  renderAll();
  animateTransit(event.shipment, event.from, event.to);
}

function stopAutoplay() {
  clearInterval(autoplayTimer);
  autoplayTimer = undefined;
  autoplayButton.setAttribute('aria-pressed', 'false');
  autoplayButton.textContent = 'Autoplay';
}

function toggleAutoplay() {
  if (autoplayTimer) {
    stopAutoplay();
    return;
  }
  autoplayButton.setAttribute('aria-pressed', 'true');
  autoplayButton.textContent = 'Pausar autoplay';
  autoplayTimer = setInterval(advanceEvent, 1000);
}

function setupSimulation() {
  currentStates = new Map(shipments.map((shipment) => [shipment.id, 'pendiente']));
  naiveCounts = { pendiente: shipments.length, preparado: 0, despachado: 0 };
  replayEvents = shipments.flatMap((shipment) => shipment.stateChanges.slice(1).map((change, index) => ({
    shipment,
    from: shipment.stateChanges[index].state,
    to: change.state,
    timestamp: change.timestamp,
  }))).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  replayIndex = 0;
}

function regenerate() {
  const parsed = Number(countInput.value);
  const count = Math.max(10, Math.min(500, Number.isInteger(parsed) ? parsed : DEFAULT_COUNT));
  countInput.value = count;
  shipments = generateShipments(count, SEED);
  stopAutoplay();
  setupSimulation();
  populateFilters();
  renderZones();
  renderAll();
}

function csvValue(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function downloadCsv() {
  const rows = shipments.map((shipment) => ({
    id: shipment.id, cliente: shipment.cliente, zonaEntrega: shipment.zonaEntrega, bultos: shipment.bultos,
    pesoKg: shipment.peso, remitoId: shipment.remitoId, estadoActual: currentStates.get(shipment.id),
    timestampEntrada: shipment.enteredAt,
    cambiosDeEstado: shipment.stateChanges.map((change) => `${change.state}: ${change.timestamp}`).join(' | '),
  }));
  const headers = Object.keys(rows[0]);
  const csv = ['\uFEFF' + headers.join(','), ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: 'nanocargo-flujo-ficticio.csv' });
  link.click(); URL.revokeObjectURL(url);
}

countInput.addEventListener('change', regenerate);
stateInput.addEventListener('change', renderTable);
zoneInput.addEventListener('change', renderTable);
advanceButton.addEventListener('click', advanceEvent);
autoplayButton.addEventListener('click', toggleAutoplay);
document.querySelector('#download-data').addEventListener('click', downloadCsv);
regenerate();
