## Estado — ACTUALIZADO
- [x] Polígono tech-glow (pulso + gradiente + partículas internas) — HECHO, reemplazó el manchón
- [ ] BLOQUE 2 — Partículas de fondo en shared/ (hub + módulos)
- [ ] BLOQUE 3 — Microanimaciones de entrada + detalles arcade (fuera del mapa)
- [ ] prefers-reduced-motion en toda la capa
- [ ] Verificación 60fps sin regresión

### Nota de cierre para BLOQUES 2 y 3
El Bloque 1 (polígono tech-glow) quedó aprobado. Los bloques 2 y 3 se construyen juntos
en una pasada, respetando todo lo del Documento 05: tono retro-gaming/arcade sci-fi,
partículas verdes tenues de fondo en shared/ (heredadas por hub y módulos), entradas
escalonadas de paneles/tarjetas, entrada arcade del hero (glitch breve una vez), hover
táctil con glow de fósforo, glow pulsante en el número del ahorro, scanline CRT opcional
muy tenue. SIN drop-shadow ni filtros pesados por elemento (glow por opacity/transform/
stroke, como se resolvió en la lluvia y en el polígono). 60fps innegociable.
prefers-reduced-motion desactiva TODO.