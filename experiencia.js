/* Entrada unificada, jardín y animaciones: sin librerías ni conexiones externas. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector),
    body = document.body;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const dialog = $('#arrivalDialog'),
    garden = $('#gardenWorld');
  let config = window.EVENTO_BASE,
    arrivalTimers = [],
    finishTimer,
    flightTimer,
    previousFocus,
    initialised = false;
  const seenFlights = new Set(),
    visibleGarden = new Set();
  body.classList.add('experience-enhanced');

  // ===== Entrada: la casa, el sobre y la carta de Lady Whistledown =====
  function later(callback, delay) {
    const timer = setTimeout(callback, delay);
    arrivalTimers.push(timer);
    return timer;
  }
  function clearArrival() {
    arrivalTimers.forEach(clearTimeout);
    arrivalTimers = [];
    clearTimeout(finishTimer);
  }
  function ready() {
    body.classList.remove('arrival-running');
    body.classList.add('experience-ready');
    window.dispatchEvent(new Event('invitation:arrival-state'));
    updateGarden();
  }
  function finishArrival(immediate = false) {
    clearArrival();
    const close = () => {
      dialog.classList.remove('is-playing', 'is-leaving', 'is-static');
      if (dialog.open) dialog.close();
      ready();
      if (previousFocus && previousFocus !== body && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
      else $('#heroTitle')?.focus({ preventScroll: true });
    };
    if (!dialog.open) {
      ready();
      return;
    }
    if (immediate || motion.matches) {
      close();
      return;
    }
    dialog.classList.add('is-leaving');
    finishTimer = setTimeout(close, 650);
  }
  function arrivalStage(name, text) {
    dialog.dataset.stage = name;
    $('#arrivalStatus').textContent = text;
  }
  // Abre la entrada y recorre sus etapas: palacio, puertas, sobre y carta.
  function showArrival(manual = false) {
    if (dialog.open) return;
    if (!manual && (motion.matches || !config.experiencia.entrada || location.hash)) {
      ready();
      return;
    }
    clearArrival();
    previousFocus = document.activeElement;
    body.classList.add('arrival-running');
    dialog.classList.remove('is-leaving');
    dialog.showModal();
    fitGreeting();
    document.fonts.ready.then(fitGreeting);
    $('#skipArrival').focus({ preventScroll: true });
    if (motion.matches) {
      dialog.classList.add('is-static');
      arrivalStage('carta', config.textos.entradaCarta);
      later(() => finishArrival(true), 4000);
      return;
    }
    // El reflujo reinicia la secuencia cuando se vuelve a abrir desde el pie.
    dialog.classList.remove('is-playing');
    void dialog.offsetWidth;
    dialog.classList.add('is-playing');
    arrivalStage('palacio', config.textos.entradaPalacio);
    later(() => arrivalStage('puertas', config.textos.entradaPalacio), 1700);
    later(() => arrivalStage('sobre', config.textos.entradaSobre), 3900);
    later(() => arrivalStage('carta', config.textos.entradaLectura), 6800);
    later(() => finishArrival(), 9350);
    window.dispatchEvent(new Event('invitation:arrival-state'));
  }

  // ===== Opciones de datos.js: entrada, jardín y cursor decorado =====
  function applyConfig(next) {
    config = next;
    garden.hidden = !config.experiencia.jardin;
    body.classList.toggle('themed-cursor', config.experiencia.cursor);
    $('#replayArrival').hidden = !config.experiencia.entrada;
    if (dialog.open && !config.experiencia.entrada) finishArrival(true);
    updateGarden();
    requestAnimationFrame(fitGreeting);
  }
  // El saludo manuscrito de la carta se encoge si no cabe en una línea.
  function fitGreeting() {
    const text = $('.arrival-script');
    text.style.fontSize = '';
    const width = text.scrollWidth;
    if (width > text.clientWidth - 6 && text.clientWidth > 0)
      text.style.fontSize =
        Math.max(
          18,
          ((parseFloat(getComputedStyle(text).fontSize) * (text.clientWidth - 6)) / width) * 0.96,
        ) + 'px';
  }
  document.fonts.ready.then(fitGreeting);
  window.addEventListener('resize', () => requestAnimationFrame(fitGreeting));

  // ===== Jardín de los bordes: se mueve con el scroll y florece por secciones =====
  let scrolling = false;
  function updateGarden() {
    const max = document.documentElement.scrollHeight - innerHeight;
    garden.style.setProperty(
      '--garden-flow',
      String(max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0),
    );
  }
  window.addEventListener(
    'scroll',
    () => {
      if (scrolling || garden.hidden) return;
      scrolling = true;
      requestAnimationFrame(() => {
        updateGarden();
        scrolling = false;
      });
    },
    { passive: true },
  );
  // Al llegar a ciertas secciones el jardín florece, vuela la mariposa y caen pétalos en el pie.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        if (id === 'final') {
          entry.target.classList.toggle('in-view', entry.isIntersecting);
          garden.classList.toggle('at-finale', entry.isIntersecting);
          return;
        }
        if (entry.isIntersecting) visibleGarden.add(id);
        else visibleGarden.delete(id);
        if (
          entry.isIntersecting &&
          ['historia', 'galeria'].includes(id) &&
          !seenFlights.has(id) &&
          !motion.matches &&
          !garden.hidden &&
          !dialog.open
        ) {
          seenFlights.add(id);
          clearTimeout(flightTimer);
          garden.classList.remove('butterfly-flight');
          flightTimer = setTimeout(() => {
            if (!document.hidden && !dialog.open) {
              garden.classList.add('butterfly-flight');
              setTimeout(() => garden.classList.remove('butterfly-flight'), 6100);
            }
          }, 1100);
        }
      });
      garden.classList.toggle('is-blooming', visibleGarden.size > 0);
    },
    { threshold: 0.2 },
  );
  ['gaceta', 'historia', 'galeria', 'final'].forEach((id) => {
    const target = document.getElementById(id);
    if (target) observer.observe(target);
  });

  // ===== Botones y arranque =====
  $('#skipArrival').addEventListener('click', () => finishArrival(true));
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    finishArrival(true);
  });
  $('#replayArrival').addEventListener('click', () => showArrival(true));
  motion.addEventListener('change', (event) => {
    if (event.matches && dialog.open) finishArrival(true);
  });
  document.addEventListener('visibilitychange', () =>
    body.classList.toggle('page-unfocused', document.hidden),
  );
  window.addEventListener('invitation:render', (event) => applyConfig(event.detail.config));
  (window.INVITATION_CONFIG_READY || Promise.resolve(config))
    .then((next) => {
      if (initialised) return;
      initialised = true;
      applyConfig(window.InvitationContext?.config || next);
      showArrival();
    })
    .catch(() => {
      applyConfig(config);
      ready();
    });
})();
