/* LogID — Partículas de fondo (identidad de marca).
   Canvas liviano: densidad baja, verde tenue, reacción leve al mouse.
   Vive en shared/ para que el hub y cada módulo la hereden.
   prefers-reduced-motion: apagadas. 60fps innegociable. */

(function () {
  'use strict';

  /* Respeto total: sin animación, sin canvas. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* --- Config --- */
  const COUNT      = 42;
  const COLOR      = [53, 240, 160];  /* --lg-accent */
  const OP_MIN     = 0.04;
  const OP_MAX     = 0.16;
  const SPEED      = 0.12;            /* px/frame base drift */
  const SIZE_MIN   = 1.0;
  const SIZE_MAX   = 2.4;
  const MOUSE_R    = 110;             /* radio de reacción al cursor */
  const MOUSE_PUSH = 0.35;            /* fuerza del empujón */

  /* --- Canvas --- */
  const canvas = document.createElement('canvas');
  canvas.className = 'lg-particles';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0;
  let mx = -9999, my = -9999;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  /* --- Pool de partículas --- */
  const pool = [];

  function seed() {
    resize();
    for (let i = 0; i < COUNT; i++) {
      pool.push({
        x:  Math.random() * W,
        y:  Math.random() * H,
        vx: (Math.random() - 0.5) * SPEED * 2,
        vy: (Math.random() - 0.5) * SPEED * 2,
        r:  SIZE_MIN + Math.random() * (SIZE_MAX - SIZE_MIN),
        o:  OP_MIN  + Math.random() * (OP_MAX  - OP_MIN),
      });
    }
  }

  /* --- Loop de render --- */
  function frame() {
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];

      /* Empujón leve del cursor */
      const dx = p.x - mx;
      const dy = p.y - my;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < MOUSE_R && d > 0) {
        const f = (1 - d / MOUSE_R) * MOUSE_PUSH;
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
      }

      /* Amortiguación + deriva mínima para que nunca se detengan */
      p.vx *= 0.985;
      p.vy *= 0.985;
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd < SPEED * 0.4) {
        p.vx += (Math.random() - 0.5) * 0.015;
        p.vy += (Math.random() - 0.5) * 0.015;
      }

      p.x += p.vx;
      p.y += p.vy;

      /* Wrap alrededor de los bordes */
      if (p.x < -10) p.x = W + 5;
      else if (p.x > W + 10) p.x = -5;
      if (p.y < -10) p.y = H + 5;
      else if (p.y > H + 10) p.y = -5;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(' + COLOR[0] + ',' + COLOR[1] + ',' + COLOR[2] + ',' + p.o + ')';
      ctx.fill();
    }

    requestAnimationFrame(frame);
  }

  /* --- Eventos --- */
  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  window.addEventListener('resize', resize);

  seed();
  requestAnimationFrame(frame);
})();
