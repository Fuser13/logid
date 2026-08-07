/* LogID — Comportamiento del shell del hub.
   Conecta el input de empresa con shared/branding/brand.js.
   Identidad visual: stagger entry + glitch arcade. */

(function () {
  function init() {
    const brand = window.LogIDBrand;
    if (!brand) return;

    brand.applyCompanyName();

    const input = document.querySelector('[data-brand-company-input]');
    if (input) {
      input.value = brand.getCompanyName();
      input.addEventListener('input', () => brand.setCompanyName(input.value));
      input.addEventListener('blur', () => {
        input.value = brand.getCompanyName();
      });
    }

    const reset = document.querySelector('[data-brand-company-reset]');
    if (reset) {
      reset.addEventListener('click', () => {
        const name = brand.resetCompanyName();
        if (input) input.value = name;
      });
    }

    const year = document.querySelector('[data-shell-year]');
    if (year) year.textContent = new Date().getFullYear();

    /* ================================================================
       IDENTIDAD VISUAL — stagger entry + glitch arcade
       ================================================================ */
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {

      /* Stagger: los .lg-stagger se revelan con fade + slide-up escalonado.
         Elementos que entran al viewport en el mismo frame se agrupan y se
         escalonan a ~50 ms entre sí. Después de animar se limpian las clases
         para liberar las transiciones originales del elemento (hover, etc.). */
      let sq = [], st = null;

      function flushSt() {
        const items = sq.slice();
        sq = [];
        st = null;
        items.forEach((el, i) => {
          el.style.transitionDelay = (i * 50) + 'ms';
          el.classList.add('lg-stagger--in');
        });
        setTimeout(() => {
          items.forEach(el => {
            el.style.transitionDelay = '';
            el.classList.remove('lg-stagger', 'lg-stagger--in');
          });
        }, items.length * 50 + 500);
      }

      const stObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            sq.push(e.target);
            stObs.unobserve(e.target);
            clearTimeout(st);
            st = setTimeout(flushSt, 30);
          }
        });
      }, { threshold: 0.08 });

      document.querySelectorAll('.lg-stagger').forEach(el => stObs.observe(el));

      /* Glitch arcade: sacudida RGB breve al entrar al viewport, una sola vez. */
      const glObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('lg-glitch');
            glObs.unobserve(e.target);
          }
        });
      }, { threshold: 0.25 });

      document.querySelectorAll('[data-glitch]').forEach(el => glObs.observe(el));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
