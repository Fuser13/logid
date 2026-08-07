# LogID — Módulo 01: Calculadora de Zonas Peligrosas
## Documento 04: Especificación de construcción

> Este documento especifica QUÉ y CÓMO construir. La filosofía del problema de
> negocio está en el Documento 01. La estructura de carpetas está en el Documento 03.
> El módulo vive en `modules/01-zonas-peligrosas/` y es autocontenido.

---

## OBJETIVO
Una calculadora interactiva que le muestra a una empresa de carga homogénea cuánto
dinero pierde por descubrir tarde los envíos en zona peligrosa, y cuánto ahorraría
detectándolos ANTES de sacarlos a ruta. El valor se demuestra con los propios números
del usuario, convertidos en un mapa visual y en una cifra de ahorro.

## STACK (definido, no negociar)
- Leaflet para el mapa.
- JavaScript vanilla para la lógica (point-in-polygon, geometría controlada, cálculo).
- Sin backend. Sin frameworks. Todo corre en el navegador. Buildeable a estático.
- Consume `shared/` para branding (nombre de empresa editable) y design tokens.

## LOS INPUTS (lo que carga el usuario)
Un panel de formulario con estos campos:
1. **Volumen de envíos** (número; con selector diario/mensual).
2. **Porcentaje en zona peligrosa** (slider o número, 0–100%).
3. **Costo por envío** (valor unitario del flete normal).
4. **Costo del doble viaje** — TRES campos separados:
   - Flete de ida (sacar el envío a ruta)
   - Flete de vuelta (devolverlo al remitente)
   - Pago al chofer por intento de no-entrega
5. Nombre de empresa: viene de `shared/branding` (NanoCargo por defecto, editable).

Botón grande: **"Calcular"**.

## LA LÓGICA (el corazón)
### Geometría controlada
Al apretar Calcular:
1. Se generan N pines (proporcional al volumen, con un tope visual razonable para
   no saturar el mapa — ej. máximo ~500 pines representando el total).
2. Se generan polígonos de "zona peligrosa" en posiciones ALEATORIAS sobre un mapa
   a nivel provincia.
3. CLAVE: la distribución de pines y polígonos se ajusta con point-in-polygon hasta
   que EXACTAMENTE el porcentaje que cargó el usuario caiga DENTRO de los polígonos.
   Si cargó 30%, exactamente el 30% de los pines quedan en rojo. El mapa es una
   representación FIEL de su número.
4. REGENERACIÓN: cada vez que aprieta Calcular, mapa nuevo — polígonos y pines en
   distinta posición, pero siempre respetando el porcentaje. Es como tirar el dado.

### El cálculo del ahorro
- Envíos en zona peligrosa = volumen × porcentaje.
- Pérdida actual (hoy, detección tardía) = envíos_peligrosos × (flete_ida +
  flete_vuelta + pago_chofer). [El doble viaje completo se paga porque se descubre
  en la calle.]
- Costo con detección temprana = envíos_peligrosos × (costo de gestión previa —
  para la demo, se asume ~0 o un costo mínimo simbólico, porque negociar punto
  alternativo o devolver antes de rutear no gasta el viaje).
- **AHORRO = Pérdida actual − Costo con detección temprana.**
- Mostrar el ahorro por período (diario/mensual según el input) y proyectado anual.

## EL MOMENTO WOW (la estrella: LLUVIA DE PINES)
Al apretar Calcular:
1. Los pines CAEN sobre el mapa uno por uno, en secuencia rápida (lluvia de puntos).
   Los que caen en zona peligrosa aparecen en rojo; los seguros en verde/azul.
   Efecto de "drop" (caen desde arriba con un pequeño rebote o fade).
2. Los polígonos rojos se dibujan (fade-in o trazo animado) mientras/antes de la lluvia.
3. Al terminar la lluvia, el número grande del AHORRO cuenta desde 0 hasta su valor.
   Este es el remate — no compite con la lluvia, la corona.
- Timing: la lluvia dura ~1.5–2s (rápida, no tediosa). El conteo del ahorro arranca
  al terminar la lluvia.
- prefers-reduced-motion: sin lluvia ni conteo, los pines y el número aparecen directos.

## EL LAYOUT
- Panel de inputs a un lado (izquierda o arriba).
- Mapa grande protagonista (el centro visual).
- Panel de resultados con el número del ahorro GRANDE + desglose (pérdida actual vs
  ahorro, envíos afectados, proyección anual).
- Header con el branding LogID + selector de empresa (viene del shell).
- Tono visual: dark, cómic/gaming, consistente con los design tokens de `shared/`.

## LO QUE NO HACE (fronteras explícitas)
- NO scraping de zonas reales (polígonos simulados — ver Documento 01 el porqué).
- NO nivel calle (nivel provincia alcanza para el concepto).
- NO backend, NO persistencia de datos del usuario más allá de la sesión.
- NO simulación de movimiento de camiones (eso es un módulo futuro, no este).

## DESPLIEGUE Y DIFUSIÓN
- Se agrega la tarjeta del módulo al hub (`index.html` raíz, en `#module-grid`).
- Deploy a Cloudflare Pages con el resto del repo.
- Posteo en LinkedIn: el problema de negocio (carga homogénea, doble viaje),
  la decisión técnica (por qué estático, por qué simulado), el link para probarlo.

## ESTADO
- [ ] Layout base (inputs + mapa + panel resultados)
- [ ] Mapa Leaflet a nivel provincia
- [ ] Generación de pines + polígonos aleatorios
- [ ] Geometría controlada (porcentaje-fiel con point-in-polygon)
- [ ] Cálculo del ahorro (con los 3 campos del doble viaje)
- [ ] Lluvia de pines animada
- [ ] Conteo del ahorro al final de la lluvia
- [ ] Regeneración por corrida
- [ ] Tarjeta en el hub
- [ ] prefers-reduced-motion
- [ ] Deploy Cloudflare

---
## AMPLIACIÓN — Fase de exploración (pines tech + zoom-tour + pines flotantes)
> Se agrega DESPUÉS del paso 3 (lluvia + conteo). Es la capa que corona el módulo y
> resuelve que la vista alejada invite a explorar sin depender de que el usuario zoomee.

### A. Pines más "tech" (cambio visual)
Reemplazar los marcadores de gota default de Leaflet por marcadores geométricos que
combinen con el tono gaming: puntos/diamantes/cuadrados con glow sutil. Rojos los de
zona peligrosa, verde/azul los seguros. Motivo: al hacer zoom los pines default cantan
a genérico; los geométricos se ven de nivel de cerca (el tour los muestra de cerca).

### B. Zoom-tour automático (el remate, corre SIEMPRE al terminar el conteo)
Secuencia completa del Calcular:
  polígonos fade-in → lluvia de pines → count-up del ahorro total →
  → ZOOM-TOUR: la cámara (Leaflet flyTo) recorre las zonas peligrosas una por una.
En cada zona, al acercarse, muestra su dato: "Acá cayeron X pines · $Y · Z% del total".
  (X = pines rojos en esa zona; Y = X × costo_doble_viaje; Z = X / total_pines_rojos.)
Después de la última zona, la cámara vuelve a la vista provincial completa (flyTo al
bounds de la provincia).
- Usar flyTo nativo de Leaflet (animación de cámara suave, ya existe, no inventar motor).
- Timing por zona: acercarse (~1s) + mostrar dato (~1.2s) + alejar hacia la siguiente.
- SALTEABLE: cualquier click del usuario CORTA el tour y salta directo a la vista final
  (vista provincial con los pines flotantes de la fase C). Esto hace que la 1ª vez
  deslumbre y las siguientes no hagan esperar.
- prefers-reduced-motion: sin tour, va directo a la vista final fase C.

### C. Vista final: pines flotantes con dato fijo (invitación a explorar)
Al terminar (o saltear) el tour, la vista provincial alejada muestra sobre cada zona
peligrosa un pin/etiqueta flotante DISCRETO y FIJO con su dato resumido (ej. cantidad de
pines y $ de esa zona). Motivo: la vista alejada deja de estar "muerta" — los pines
flotantes muestran que cada mancha tiene info y INVITAN a acercarse manualmente si el
usuario quiere volver a mirar una. Cierra el círculo del zoom que antes nadie usaba.

### Cálculo (todo dato que ya existe, división simple)
- Pines por zona: ya se sabe en qué polígono cayó cada rojo (point-in-polygon).
- $ por zona = pines_zona × (flete_ida + flete_vuelta + pago_chofer).
- % del total = pines_zona / total_pines_rojos.

### Rendimiento
El tour mueve la cámara y muestra números ya calculados — es barato. No re-generar
geometría durante el tour. Mantener 60fps en las transiciones de cámara.

### Estado (ampliación)
- [ ] Pines geométricos tech (reemplazo de los default)
- [ ] Cálculo por-zona (pines, $, % del total)
- [ ] Zoom-tour con flyTo, zona por zona con su dato
- [ ] Vuelta a vista provincial al terminar
- [ ] Tour salteable con cualquier click
- [ ] Pines flotantes fijos en la vista final
- [ ] prefers-reduced-motion (directo a vista final)