/* Música de fondo de la invitación. */
(() => {
  'use strict';
  const button = document.querySelector('#musicToggle'),
    audio = document.querySelector('#eventAudio');
  if (!button || !audio) return;
  const music = window.EVENTO_BASE.musica,
    textos = window.EVENTO_BASE.textos;
  const file = window.InvitationData.safeURL(music.archivo, true);
  button.hidden = !file;
  button.title = music.titulo;
  if (!file) return;
  // La posición viaja entre páginas para que la canción continúe donde iba.
  const KEY = 'adriana.musica';
  let saved = {};
  try {
    saved = JSON.parse(sessionStorage.getItem(KEY)) || {};
  } catch {
    /* almacenamiento opcional */
  }
  let playing = false,
    pending = false,
    restored = false,
    heard = false,
    lastSave = 0;

  // ===== Guardar por dónde iba la canción =====
  function remember() {
    // Sin haber sonado en esta página no hay posición nueva que guardar.
    if (!heard) return;
    try {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({ t: audio.currentTime, paused: saved.paused === true }),
      );
    } catch {
      /* almacenamiento opcional */
    }
  }

  // ===== Botón: cambia entre escuchar y pausar =====
  function setState(value) {
    playing = value;
    button.setAttribute('aria-pressed', String(value));
    button.setAttribute('aria-label', value ? textos.sinMusica : textos.musica);
    button.querySelector('span').textContent = value ? textos.sinMusica : textos.musica;
    button.querySelector('use').setAttribute('href', value ? '#i-pause' : '#i-music');
  }

  // ===== Reproducción =====
  function prepare() {
    if (audio.getAttribute('src') !== file) audio.src = file;
    audio.volume = Math.min(1, Math.max(0, music.volumen));
    if (restored || !(saved.t > 0)) return;
    restored = true;
    const seek = () => {
      try {
        audio.currentTime = saved.t;
      } catch {
        /* la canción empieza desde el inicio */
      }
    };
    if (audio.readyState >= 1) seek();
    else audio.addEventListener('loadedmetadata', seek, { once: true });
  }
  function stopWaiting() {
    document.removeEventListener('click', onInteraction, true);
    document.removeEventListener('keydown', onInteraction, true);
  }
  async function start() {
    if (playing || pending || saved.paused) return;
    pending = true;
    prepare();
    try {
      await audio.play();
      stopWaiting();
    } catch {
      /* Algunos navegadores exigen un gesto: se reintenta al primer toque o tecla. */
    } finally {
      pending = false;
    }
  }
  function onInteraction(event) {
    if (event.target.closest?.('#musicToggle')) return;
    void start();
  }

  // ===== Eventos del botón y del audio =====
  button.addEventListener('click', async () => {
    if (playing) {
      saved.paused = true;
      heard = true;
      audio.pause();
      remember();
      return;
    }
    saved.paused = false;
    prepare();
    try {
      await audio.play();
      stopWaiting();
    } catch {
      setState(false);
    }
    remember();
  });
  audio.addEventListener('playing', () => {
    heard = true;
  });
  audio.addEventListener('play', () => setState(true));
  audio.addEventListener('pause', () => setState(false));
  audio.addEventListener('error', () => setState(false));
  audio.addEventListener('timeupdate', () => {
    if (Date.now() - lastSave > 2000) {
      lastSave = Date.now();
      remember();
    }
  });
  window.addEventListener('pagehide', remember);
  // Al salir de la página (otra app, otra pestaña, pantalla bloqueada) la música se pausa y vuelve al regresar.
  let resumeOnReturn = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      resumeOnReturn = playing;
      if (playing) audio.pause();
      remember();
    } else if (resumeOnReturn && !saved.paused) {
      resumeOnReturn = false;
      audio.play().catch(() => setState(false));
    }
  });
  document.addEventListener('click', onInteraction, true);
  document.addEventListener('keydown', onInteraction, true);
  void start();
})();
