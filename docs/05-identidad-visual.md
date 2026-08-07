# LogID — Capa de Identidad Visual (el "alma")
## Documento 05: Sistema visual retro-gaming / arcade sci-fi

> Esta capa le da personalidad a TODO LogID. Vive en shared/ para que el hub y todos
> los módulos la hereden — una sola decisión que firma el laboratorio entero.
> Regla de oro: TODO sutil, nada que trabe el navegador. 60fps innegociable.
> prefers-reduced-motion desactiva partículas, glow pulsante y glitch.

---

## TONO GENERAL: retro-gaming / arcade sci-fi
Dark de base, con acentos que vibran (verde LogID, rojo alerta). Aire de consola
arcade: píxeles, glitch MUY sutil, glow de fósforo. No es neón saturado ni sobrio
corporativo — es una máquina de arcade de los 80 mirando datos de logística.

## A. PARTÍCULAS DE FONDO (identidad de marca, en shared/)
- Capa de fondo con partículas sutiles que derivan lento (tipo polvo de datos o
  estrellas de arcade). Verde tenue sobre el dark, opacidad baja (que NO compita con
  el contenido). Densidad baja.
- Reaccionan levísimo al mouse (parallax suave o se apartan apenas del cursor).
- Canvas liviano (no una lib pesada). CRÍTICO: 60fps, no traba scroll. Si hay que
  elegir, menos partículas antes que menos fluidez.
- Vive en shared/ → el hub y cada módulo la muestran de fondo. Firma común de LogID.
- prefers-reduced-motion: partículas apagadas.

## B. MICROANIMACIONES DE ENTRADA (fuera del mapa)
Lo que hoy se ve "template IA" son los elementos que aparecen de golpe, estáticos.
Darles vida al entrar:
- Los paneles (inputs, resultados, tarjetas del hub) entran con fade + slide-up sutil,
  escalonado (stagger ~40-60ms entre elementos). Que se sienta que la interfaz "se arma".
- El título del módulo / hero: un efecto de entrada con sabor arcade — glitch MUY breve
  al aparecer (1-2 frames de desplazamiento RGB) que se asienta, o un "type-in" de
  máquina. Sutil, una vez, no en loop.
- Hover en elementos interactivos (botones, tarjetas, campos): micro-respuesta táctil
  (lift sutil, glow de fósforo verde en el borde, transición 150ms).
- El botón "Calcular": estado hover/active con glow arcade. Al apretarlo, un flash breve.

## C. TIPOGRAFÍA Y DETALLES ARCADE
- Los textos de código/monospace que ya hay (los // comentarios, los labels) refuerzan
  el aire arcade — mantenerlos y explotarlos como parte de la identidad.
- Detalles tipo scanline sutil sobre superficies oscuras (líneas horizontales muy
  tenues, como monitor CRT), opcional y muy leve.
- El número grande del ahorro: que además del count-up tenga un glow de fósforo que
  pulse apenas al aterrizar (remate arcade).

## D. EL POLÍGONO TECH-GLOW (reemplaza el "manchón" del mapa)
El relleno rojo sólido con borde actual es lo más template del mapa. Reemplazarlo por:
- Contorno del polígono que PULSA / RESPIRA (opacidad o grosor del borde oscilando lento,
  ~2-3s por ciclo) — como un radar marcando una amenaza. Rojo alerta.
- Relleno NO sólido: un gradiente radial tenue (más intenso al centro, se desvanece al
  borde) o una trama sutil, en vez del rojo plano. Que se sienta "energía contenida",
  no una mancha de pintura.
- Partículas rojas MUY sutiles flotando dentro del polígono (poquitas, lentas) que
  refuercen el "acá hay peligro". Sci-fi, no saturado.
- Al hacer zoom (en el tour), el pulso y las partículas se ven de cerca y lucen — es
  justo donde el detalle paga.
- Rendimiento: el pulso es CSS (opacity/transform en el path o su contenedor, no filtros
  pesados por elemento — lección de los pasos anteriores). Las partículas internas,
  pocas y baratas. 60fps durante el tour, sin regresión de la lluvia.
- prefers-reduced-motion: polígono sin pulso ni partículas, contorno rojo estático.

## REGLAS TRANSVERSALES (para todo lo de arriba)
- 60fps SIEMPRE. Nada que trabe scroll ni interacción. Medir, no suponer (como se hizo
  con la lluvia y el tour).
- Sutil y premium, no árbol de navidad. Si dudás entre "más" y "menos", elegí menos y
  más pulido. El alma se siente, no se grita.
- prefers-reduced-motion respetado en TODO: partículas, glow pulsante, glitch, entradas.
- Sin drop-shadow ni filtros pesados por elemento repetido (lección aprendida: matan fps).
- Consistencia: la identidad vive en shared/ y se ve igual en el hub y en cada módulo.

## Estado
- [ ] Partículas de fondo en shared/ (hub + módulos)
- [ ] Microanimaciones de entrada escalonadas (paneles, tarjetas)
- [ ] Entrada arcade del hero/título (glitch breve o type-in)
- [ ] Hover táctil con glow de fósforo (botones, tarjetas, campos)
- [ ] Detalles arcade (scanline sutil opcional, monospace explotado)
- [ ] Glow pulsante en el número del ahorro
- [ ] Polígono tech-glow (pulso + gradiente + partículas internas) — reemplaza manchón
- [ ] prefers-reduced-motion en toda la capa
- [ ] Verificación 60fps sin regresión de lluvia/tour