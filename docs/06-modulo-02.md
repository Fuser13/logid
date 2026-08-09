# LogID — Estado del Laboratorio y Hoja de Ruta
## Documento maestro (actualización agosto 2026)

> Este documento pone al día el estado de LogID. Reemplaza la foto que daban los
> documentos fundacionales previos. Sirve para retomar el contexto y para pensar
> los próximos módulos.

---

## QUÉ ES LogID (recordatorio)
Laboratorio de I+D logístico. Colección de módulos independientes; cada uno agarra
un problema real de la cadena de suministro y le construye una solución que se puede
tocar. Datos ficticios, lógica de verdad. Empresa ficticia protagonista: NanoCargo
(editable por el usuario).
- Publicado y online en: logid.pages.dev
- Repo único, sitio estático, desplegado en Cloudflare Pages.
- Cada módulo autocontenido en modules/NN-nombre/, consume shared/ para branding y tokens.

## PRINCIPIO RECTOR (no olvidar)
Agnosticismo tecnológico REAL: elegir la herramienta correcta por problema, no por moda.
A veces es la popular o la aburrida. El criterio de descarte (por qué NO otra cosa) es lo
que demuestra madurez, no la cantidad de tecnologías. Cada módulo documenta su decisión.
Mapa de tecnología por naturaleza del problema:
- Optimización combinatoria (ruteo, asignación): el SOLVER manda (OR-Tools), orquestado en Python.
- Alta concurrencia en tiempo real (WMS masivo, tracking): Go o Elixir.
- Análisis, pricing, forecasting: Python (y es la elección correcta, no la perezosa).
- Transaccional con integridad: la base de datos manda (PostgreSQL).
- Cómputo numérico pesado: Rust/C++/Julia.

## REGLA ANTI-SCOPE-CREEP (aprendida a los golpes)
Cada módulo es una app independiente que NO depende de las otras. NO es un ERP. Los
módulos son capítulos que se leen solos, no piezas de una máquina que se rompe si una
falla. Crecer sin límite y sin infierno de integración.
Y sobre construir CADA módulo: partir en pasos chicos con freno y verificación entre cada
uno. La tentación siempre es hacer todo entero y de una — eso lleva a noches de debugging.
La disciplina es: decidir la arquitectura en .md ANTES de tocar código, y que el agente
ejecute lo ya decidido paso a paso, no que improvise.

---

## MÓDULO 01 — TERMINADO Y PUBLICADO
Calculadora de detección temprana de zonas peligrosas.

Problema: empresas de carga homogénea a población en zonas de riesgo (ej. medios de pago
a familias fuera del circuito bancario). Los envíos a zona peligrosa no se entregan: el
chofer llega, no baja, cobra el intento, y la mercadería vuelve a cruzar el país. Dos
viajes tirados por envío, descubiertos TARDE (con el camión ya en la calle).

Solución: calculadora donde el usuario carga su volumen, su % de zona peligrosa, su costo
por envío y el costo del doble viaje (flete ida + vuelta + pago al chofer). Devuelve un
mapa donde sus propios números se dibujan (si carga 30%, exactamente el 30% de los pines
cae en las zonas rojas — geometría controlada con point-in-polygon) y el ahorro de detectar
antes de rutear. Además plantea las salidas: pactar punto alternativo, devolver antes de
gastar el viaje, o armar rutas especiales con choferes que viven en la zona (pagados contra
% de entrega).

Features construidas: geometría controlada verificada (el % se cumple exacto contando pines
en el DOM), regeneración aleatoria por corrida, lluvia de pines animada, zoom-tour automático
que recorre las zonas mostrando datos por zona (salteable con click), pines flotantes finales,
contraste envío exitoso vs fallido, toggle diario/mensual con proyección anual.
Capa de identidad visual (alma): polígonos tech-glow que pulsan (radar de amenaza, no manchón),
partículas de fondo en shared/, microanimaciones de entrada, tono retro-gaming/arcade.
Todo a 60fps medido, prefers-reduced-motion respetado.

Stack: Leaflet + JS vanilla, 100% estático, sin backend. Zonas simuladas a propósito (no
scraping de barrios reales — reputacional/legal). Nivel provincia.

Difusión: posteo de LinkedIn publicado (formato: problema real + solución + link, en voseo).
96 impresiones el primer día.

---

## MÓDULO 02 — A DEFINIR (acá necesito ayuda para pensar)

Objetivo del módulo 02: mostrar una FACETA DISTINTA a la del módulo 01. El 01 ya demostró
mapas espectaculares con lógica geométrica. Repetir "otro mapa con otra calculadora" volvería
el laboratorio monótono. El valor de un laboratorio es mostrar RANGO: distintos tipos de
problema, de solución y de tecnología (donde de verdad corresponda).

Facetas candidatas que el módulo 01 NO mostró:
- Datos / análisis puro: un dashboard, pricing dinámico, forecasting — sin mapa, mostrando
  manejo de datos y visualización analítica.
- Optimización real: armar rutas óptimas, asignación de recursos, un solver de verdad
  (OR-Tools) — mostrando que se ataca un problema NP-difícil con la herramienta correcta.
- Automatización / proceso: algo que muestre el "de la idea al deploy", un pipeline, una
  automatización de un proceso logístico repetitivo.

Restricciones que se mantienen: datos ficticios pero lógica real; app desplegable (idealmente
estática para Cloudflare, o con un backend serverless simple si el problema lo justifica);
autocontenida; con su decisión técnica justificada; protagoniza NanoCargo.

PREGUNTAS PARA PENSAR JUNTOS:
1. ¿Qué problema real de logística ataca el módulo 02, distinto en naturaleza al del 01?
2. ¿Qué faceta técnica muestra (análisis / optimización / automatización)?
3. ¿Qué tecnología es la correcta para ESE problema, y por qué no otra?
4. ¿Cómo se hace visualmente atractivo sin repetir el recurso del mapa?
5. ¿Se puede mantener estático, o justifica un backend? Si lo justifica, ¿cuál y por qué?