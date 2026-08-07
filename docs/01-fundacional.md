# LogID — Laboratorio de I+D Logístico

**Documento 01: Fundacional + Módulo de Zonas Peligrosas**

---

## PARTE A — Filosofía del laboratorio

### Qué es LogID

Un laboratorio de I+D aplicada a la cadena de suministro. No es un producto único ni un
ERP: es una colección de módulos independientes, cada uno de los cuales agarra un
problema real y concreto de la logística y le construye una solución funcionando. Cada
módulo se navega solo, corre solo, y se puede mostrar y desplegar por separado.

Hilo narrativo: una empresa ficticia (con branding propio) protagoniza cada módulo. Cada
capítulo es un problema que esa empresa sufre y que LogID resuelve. Esto da coherencia de
marca a todo el laboratorio.

### Principio rector: agnosticismo tecnológico REAL

Agnosticismo NO significa usar una tecnología distinta por módulo para lucir variedad.
Significa elegir la herramienta correcta para cada problema, sin casarse con ninguna por
moda ni costumbre — y muchas veces la correcta es la popular o la "aburrida". Un agnóstico
puede usar la misma tecnología en cinco de siete módulos si es la mejor para esos cinco;
lo que lo hace agnóstico es que en el sexto, donde no sirve, cambia sin drama.

Cada módulo del laboratorio documenta su decisión técnica CON justificación: por qué esa
herramienta y por qué NO las alternativas. El criterio de descarte es lo que demuestra
madurez, no la cantidad de tecnologías usadas.

### Mapa de tecnología por naturaleza del problema

La elección la manda la naturaleza computacional, no el área de negocio:

- **Optimización combinatoria dura** (ruteo, TMS, planning): el protagonista es el SOLVER
  (OR-Tools, solvers comerciales), orquestado desde Python. C++/Rust solo en el cómputo
  caliente por debajo.
- **Alta concurrencia de eventos en tiempo real** (WMS masivo, tracking en vivo): Go o
  Elixir. Único caso donde "algo mejor que Python" tiene un para-qué real.
- **Análisis, pricing, reporting, forecasting**: Python domina, y es la elección correcta,
  no la perezosa.
- **Transaccional con integridad fuerte** (CRM, órdenes, inventario): el protagonista es
  la base de datos (PostgreSQL); el lenguaje encima casi da igual.
- **Cómputo numérico pesadísimo** (simulación de red completa): Rust, C++ o Julia.

### Regla de construcción (anti-scope-creep)

Cada módulo es una app estática independiente, autocontenida, que NO depende de las otras
y NO comparte una arquitectura común que haya que mantener coherente. Son capítulos que se
leen solos, no piezas de una máquina que se rompe si una falla. Esto permite crecer sin
límite y sin riesgo de integración.

Objetivo del laboratorio: generar inbound profesional (roles de I+D, consultoría) y
demostrar criterio de ingeniería + conocimiento de dominio. NO es construir un ERP. Si un
módulo muestra negocio real, esa es una decisión futura con validación de mercado, no la
premisa de arranque.

---

## PARTE B — Módulo 01: Detección temprana de zonas peligrosas

### El problema de negocio

Nicho: empresas que distribuyen CARGA HOMOGÉNEA a población en zonas de riesgo (ej.
tarjetas de débito / instrumentos de pago a familias fuera del circuito bancario formal,
entregas de volumen a sectores vulnerables).

**El dolor**: las zonas peligrosas pueden representar hasta la mitad de un ruteo. Hoy el
problema se descubre TARDE — el camión ya salió a la calle, el chofer marca "zona
peligrosa", no entrega, cobra igual por el intento, y la mercadería vuelve a cruzar el
país de regreso al remitente. Resultado: DOS viajes tirados por envío + pago al chofer por
no-entrega.

**La oportunidad**: detectar los envíos en zona peligrosa ANTES de sacarlos a ruta, para
negociar punto de entrega alternativo con el destinatario, o devolver al remitente sin
gastar el viaje.

**Por qué el nicho es bueno**: la carga homogénea hace la matemática LIMPIA. Producto igual
→ precio por unidad igual → costo por envío perdido calculable → volumen diario conocido →
ahorro estimable con una fórmula simple. No requiere ML ni datos complejos. Cada empresa
del nicho ya conoce sus propios números.

### Qué construimos: una calculadora de ahorro

El usuario carga SUS valores:

- Volumen de envíos (diario o mensual)
- Porcentaje de envíos que caen en zona peligrosa
- Costo por envío
- Costo del doble viaje (flete ida + flete vuelta + pago al chofer por no-entrega)

La herramienta devuelve:

- Un mapa (nivel provincia) con los envíos pineados y polígonos de zona peligrosa.
- El cálculo del ahorro: cuánto se pierde hoy vs. cuánto se ahorra detectando antes y
  negociando devolución/punto alternativo previo a la ruta.

### El truco técnico (el corazón del módulo)

Geometría CONTROLADA: los pines y los polígonos se generan de forma que el PORCENTAJE que
el usuario cargó se cumpla exactamente en el mapa. Si carga 30%, la lógica distribuye pines
y calcula con point-in-polygon hasta que exactamente el 30% caiga dentro de los polígonos
rojos. El mapa se vuelve una representación visual FIEL de sus propios números.

Polígonos y pines se REGENERAN aleatoriamente en cada corrida de la calculadora (nueva
configuración cada vez que aprieta "calcular", siempre respetando el %). Esto refuerza que
es una simulación (no dato real de nadie) y suma efecto visual.

### El momento WOW

No es animación decorativa. Es la sensación de "estos son MIS números convertidos en mapa y
en ahorro". El golpe llega cuando el usuario carga sus valores, aprieta calcular, y ve las
manchas rojas con sus pines adentro Y el número grande del ahorro contando hasta su valor.
La animación sirve a ESE momento: los pines que caen, el polígono que se dibuja, el ahorro
que cuenta.

### Decisión tecnológica (con justificación de descarte)

**Stack elegido**: Frontend estático — Leaflet (mapas) + JavaScript (point-in-polygon en el
cliente) + JSON de datos simulados embebido. Desplegado en Cloudflare Pages.

**Por qué estático y NO backend:**

- Toda la lógica (generar pines, point-in-polygon, calcular ahorro) corre en el navegador.
  No hay estado que persistir ni datos que consultar en servidor.
- Cero costo de servidor, no se cae, no hay superficie de ataque.
- Nota clave: "estático" NO significa "sin animaciones". Todas las animaciones (pines
  cayendo, polígonos dibujándose, número contando) son frontend puro y corren perfectamente
  en hosting estático.

**Por qué polígonos SIMULADOS y NO scraping de zonas reales:**

- El scraping de zonas peligrosas reales es frágil (fuentes dudosas, desactualización) y
  tiene costo reputacional/legal (mapear barrios reales con nombre y apellido como
  "peligrosos").
- La calculadora NO necesita zonas reales para demostrar el valor. Vende la LÓGICA y el
  AHORRO, no que el polígono coincida con un barrio real.
- Si un cliente algún día quiere sus zonas reales, esa es la conversación de producto pago
  (versión 2), no la demo pública.

**Por qué nivel PROVINCIA y no calle:**

- Simplicidad suficiente para demostrar el concepto. El detalle a nivel calle es versión 2
  bajo demanda de cliente.

### Branding y despliegue

- Protagoniza la empresa ficticia por defecto (nombre editable — ver [Documento 03](03-arquitectura.md)).
- Desplegado en Cloudflare Pages con link público (cualquiera lo prueba).
- Acompañado de un posteo en LinkedIn con el formato probado: el problema real, la decisión
  técnica, el proceso, y el link para tocarlo en vivo.

### Estado

- [ ] Diseño visual de la calculadora + empresa ficticia
- [ ] Lógica de geometría controlada (porcentaje-fiel)
- [ ] Regeneración aleatoria por corrida
- [ ] Cálculo de ahorro
- [ ] Animaciones del momento wow
- [ ] Despliegue Cloudflare
- [ ] Posteo LinkedIn
