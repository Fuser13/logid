# Módulo 03 · Cubicaje con restricciones de ruta (Multi-Drop 3D)

Simulador interactivo y comparador 3D de estiba y cubicaje en semirremolques para distribución multi-destino (*multi-drop container loading problem*). Resuelve simultáneamente la estabilidad gravitacional, límites de sobrecarga, fragilidad y la secuencia inversa de descarga (LIFO).

---

## 🚀 Cómo ejecutarlo localmente

El módulo es 100% estático y se ejecuta en el navegador sin dependencias de backend ni bases de datos:

```bash
# Desde la raíz del repositorio LogID
npx http-server -p 8080 -c-1
```

Abrir en el navegador:
`http://localhost:8080/modules/03-cubicaje/index.html`

---

## 📑 Estructura y pestañas del módulo

### 1. 📦 Simulación 3D (`#tab-sim`)
- **Escena 3D en Three.js:** Renderizado de alto rendimiento mediante `THREE.InstancedMesh` a 60 FPS sostenidos con hasta 550 bultos individuales.
- **Selector de 21 perfiles de carga:** Casos extremos y combinaciones reales agrupadas en 7 categorías (saturación por peso, volumen, fragilidad, homogéneos, rutas capilares vs troncales, mudanzas/retail, y casos patológicos).
- **Control de variantes:** Generación determinista mediante PRNG `mulberry32` + `xmur3`.
- **Fase de Carga y Ruta:** Animación secuencial de entrada desde el muelle y recorrido interactivo parada por parada con detección de cajas bloqueadoras (*remanipuleos*).
- **HUD dinámico:** Indicador de clasificación física (*Volume-bound* vs *Weight-bound*) y resumen de volumen/peso bajo el camión.

### 2. 📋 Datos (`#tab-datos`)
- **Manifiesto interactivo:** Tabla completa de todos los bultos generados con sus dimensiones (L×An×Al), peso, estado de fragilidad, apilabilidad, resistencia de carga y coordenadas espaciales tridimensionales $(X, Y, Z)$ comparadas entre método Cubicaje y Naive.
- **Filtros y ordenamiento:** Filtrado instantáneo por parada y familia de producto, y ordenamiento dinámico por cualquier columna.
- **Totales agregados:** Resumen de volumen total, peso total, porcentaje de fragilidad y tasa de carga efectiva.
- **Exportación CSV:** Descarga directa con codificación UTF-8 con BOM (`\uFEFF`) y separador compatible con Excel.

### 3. ⚙️ Cómo funciona (`#tab-como-funciona`)
- **Enfoque para operaciones:** Explicación en lenguaje llano de por qué el costo de remanipuleo en la calle supera con creces el costo del volumen vacío.
- **Las 2 reglas inviolables:** LIFO inverso de ruta y prioridad de bultos pesados en la base con frágiles arriba, ilustrado con diagrama esquemático SVG.
- **Heurística greedy por bandas:** Justificación matemática de por qué una heurística greedy constructiva resuelve en ~400 ms en el cliente frente a un solver exacto NP-difícil.
- **Transparencia:** Supuestos físicos y parámetros declarados con invitación a experimentar con los perfiles.

### 4. 📊 Escenarios (`#tab-escenarios`)
- **Carga instantánea:** Consumo del dataset precalculado `data/barridos.json` (870 corridas estocásticas, 0 violaciones físicas) con recálculo en vivo disponible.
- **4 Gráficos analíticos SVG:**
  1. *Volumen vs. Peso:* Demostración de que la nube de viajes opera al 50% de la capacidad de semirremolque y bifurca según la densidad crítica $q^* = 311\text{ kg/m}^3$.
  2. *Ocupación vs. Remanipuleos:* Frontera de Pareto dominada por el cubicaje con restricciones.
  3. *Costo marginal por parada:* Demostración de saturación de bloqueos a partir de la 5ª parada.
  4. *Calibración de holgura $\alpha$:* Rango óptimo (2% a 5%) que minimiza bultos no cargados sin degradar el orden de ruta.
- **Puente gráfico ↔ 3D:** Botones directos para inspeccionar en la escena 3D casos representativos de dominancia de peso y colapso de método tradicional.
- **Glosario integrado:** Definiciones claras de 7 términos técnicos para consulta rápida.

---

## 🛡️ Garantías físicas del modelo
- **Doble freno de capacidad:** Límites físicos estrictos a $89,96\text{ m}^3$ y $28.000\text{ kg}$.
- **Cero violaciones:** Validación automática contra solapamientos 3D, cajas flotantes sin soporte gravitacional, bultos sobrepasando el límite de peso encima y fragilidad aplastada.
- **Accesibilidad:** Soporte completo para navegación por teclado (`:focus-visible`), diseño adaptativo a 380px de ancho y respeto de `prefers-reduced-motion`.
