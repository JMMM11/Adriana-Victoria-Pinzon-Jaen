/* Confirmación de asistencia: página propia con los mismos datos de la invitación. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  const D = window.InvitationData;
  const data = D.load();
  const params = new URLSearchParams(location.search);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const invitation = { puestos: null, familia: params.get('f') || params.get('familia') || '' };
  let ownResponse = null,
    toastTimer;

  // ===== Utilidades =====
  const readPath = (obj, path) => path.split('.').reduce((v, key) => v?.[key], obj);
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function toast(text) {
    $('#toast').textContent = text;
    $('#toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4500);
  }
  function eventKey() {
    return (
      'bridgerton.respuesta.' +
      encodeURIComponent(data.nombreCompleto + '|' + data.fechaISO + '|' + invitation.familia)
    );
  }
  function phoneNumber() {
    return data.rsvp.whatsapp.replace(/[\s()+-]/g, '');
  }
  function validPhone() {
    return /^[1-9]\d{7,14}$/.test(phoneNumber());
  }
  function backendEnabled() {
    return window.AdrianaServicios.available();
  }

  // ===== Textos de la página =====
  function render() {
    $$('[data-text]').forEach((el) => {
      el.textContent = data.textos[el.dataset.text] ?? '';
    });
    $$('[data-value]').forEach((el) => {
      el.textContent = readPath(data, el.dataset.value) ?? '';
    });
    $$('[data-monogram]').forEach((el) => {
      el.textContent = data.iniciales;
    });
    document.title = `${data.rsvp.boton} · ${data.nombreCompleto}`;
    // El ancla evita repetir la animación de entrada al volver.
    $$('[data-home-link]').forEach((a) => {
      a.href = 'index.html' + location.search + '#inicio';
    });
    $('#deadline').textContent = data.rsvp.fechaLimite
      ? `Agradeceremos tu respuesta antes del ${data.rsvp.fechaLimite}.`
      : '';
    $('#guestName').placeholder = data.textos.placeholderNombre;
    $('#guestSong').placeholder = data.textos.placeholderCancion;
    $('#guestMessage').placeholder = data.textos.placeholderMensaje;
    $('#formNote').textContent = backendEnabled()
      ? 'Tu respuesta se guardará en la lista de invitados.'
      : 'Tu respuesta se preparará para enviar por WhatsApp.';
  }

  // ===== Invitación personal: lugares reservados (?p=3) y familia (?f=Nombre) =====
  function renderPersonal() {
    $('#reservedSeats').hidden = !invitation.puestos;
    $('#seatNumber').textContent = invitation.puestos || '';
  }
  function renderCompanions() {
    const container = $('#companions');
    container.replaceChildren();
    if (!(invitation.puestos > 1)) return;
    for (let i = 1; i < invitation.puestos; i++) {
      const field = node('div', 'field companion-field');
      const label = node('label', '', `Nombre del acompañante ${i} (opcional)`);
      const input = node('input');
      input.id = `companion${i}`;
      input.name = `companion${i}`;
      input.maxLength = 120;
      label.htmlFor = input.id;
      field.append(label, input);
      container.append(field);
    }
  }
  async function loadPersonal() {
    const seat = Number(params.get('p') || params.get('puestos'));
    if (Number.isInteger(seat) && seat >= 1 && seat <= 99) invitation.puestos = seat;
    renderPersonal();
    renderCompanions();
    try {
      const response = JSON.parse(localStorage.getItem(eventKey()));
      if (response && response.nombre && ['si', 'no'].includes(response.asiste)) {
        ownResponse = response;
        showResponse(response, false);
      }
    } catch {
      /* almacenamiento opcional */
    }
  }

  // ===== Referencia interna de cada respuesta y mensaje de WhatsApp =====
  // La base de datos pide una referencia única por respuesta; el invitado no la ve.
  function codeFor(name) {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return (
      (data.nombre
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 8)
        .toUpperCase() || 'XV') +
      '-' +
      [...bytes].map((x) => letters[x % letters.length]).join('')
    );
  }
  function whatsappMessage(record) {
    let text = `Hola, soy ${record.nombre}. ${record.asiste === 'si' ? 'Confirmo mi asistencia' : 'Lamento no poder asistir'} a los XV de ${data.nombreCompleto}.\n${data.fechaTexto} · ${data.horaTexto}\n${data.lugar.nombre}${data.lugar.salon ? ' · ' + data.lugar.salon : ''}`;
    if (record.familia) text += '\nInvitación: ' + record.familia;
    if (record.puestos) text += '\nLugares reservados: ' + record.puestos;
    if (record.acompanantes?.length) text += '\nAcompañantes: ' + record.acompanantes.join(', ');
    if (record.cancion) text += '\nCanción: ' + record.cancion;
    if (record.mensaje) text += '\nMi mensaje: ' + record.mensaje;
    return text;
  }

  // ===== Tarjeta de respuesta: sello de aceptado y botón de WhatsApp =====
  function showResponse(record, scroll = true) {
    $('#rsvpForm').hidden = true;
    $('#responseCard').hidden = false;
    const seal = $('#acceptedSeal');
    seal.hidden = record.asiste !== 'si';
    seal.classList.remove('is-stamped');
    if (!seal.hidden && scroll) {
      void seal.offsetWidth;
      seal.classList.add('is-stamped');
    }
    const confirmed = record.remote === true;
    $('#responseEyebrow').textContent = confirmed
      ? 'RESPUESTA GUARDADA'
      : 'TU CARTA ESTÁ PREPARADA';
    $('#responseTitle').textContent = confirmed
      ? record.asiste === 'si'
        ? 'Nos vemos en el baile.'
        : 'Te vamos a extrañar.'
      : 'Un último paso…';
    $('#responseGuest').textContent = record.nombre;
    $('#responseStatus').textContent = confirmed
      ? record.asiste === 'si'
        ? data.rsvp.mensajeGracias
        : data.rsvp.mensajeNoAsiste
      : 'Envía tu respuesta por WhatsApp para hacerla llegar a los anfitriones.';
    const link = $('#whatsappLink');
    link.hidden = !validPhone();
    $('#whatsappNote').hidden = !validPhone();
    if (validPhone())
      link.href = `https://wa.me/${phoneNumber()}?text=${encodeURIComponent(whatsappMessage(record))}`;
    else link.removeAttribute('href');
    $('#editResponse').hidden = confirmed;
    if (scroll)
      $('#responseCard').scrollIntoView({
        behavior: reduced ? 'instant' : 'smooth',
        block: 'center',
      });
  }

  // ===== Envío del formulario =====
  async function submitResponse(event) {
    event.preventDefault();
    const form = $('#rsvpForm');
    const name = $('#guestName').value.trim();
    const choice = form.querySelector('input[name=asiste]:checked');
    $('#nameError').textContent = data.rsvp.errorNombre;
    $('#nameError').hidden = name.length >= 3;
    $('#guestName').setAttribute('aria-invalid', String(name.length < 3));
    $('#attendanceError').textContent = data.rsvp.errorAsiste;
    $('#attendanceError').hidden = !!choice;
    if (name.length < 3) {
      $('#guestName').focus();
      return;
    }
    if (!choice) {
      form.querySelector('input[name=asiste]').focus();
      return;
    }
    if (!backendEnabled() && !validPhone()) {
      $('#submitError').hidden = false;
      $('#submitError').textContent =
        'Los anfitriones aún deben configurar el número de WhatsApp de esta invitación.';
      return;
    }
    const record = {
      nombre: name,
      asiste: choice.value,
      acompanantes: $$('.companion-field input')
        .map((el) => el.value.trim())
        .filter(Boolean),
      familia: invitation.familia || null,
      puestos: invitation.puestos,
      cancion: $('#guestSong').value.trim(),
      mensaje: $('#guestMessage').value.trim(),
      codigo: codeFor(name),
      fecha: new Date().toISOString(),
      remote: false,
    };
    const button = $('#submitRsvp');
    if (button.disabled) return;
    button.disabled = true;
    $('#submitError').hidden = true;
    try {
      if (backendEnabled()) {
        await window.AdrianaServicios.attendance(record);
        record.remote = true;
      }
      ownResponse = record;
      try {
        localStorage.setItem(eventKey(), JSON.stringify(record));
      } catch {
        toast('Tu navegador no pudo guardar la copia local. Puedes enviar la respuesta ahora.');
      }
      showResponse(record);
      if (record.remote) toast('Tu respuesta quedó guardada.');
    } catch (error) {
      $('#submitError').hidden = false;
      $('#submitError').textContent =
        'No pudimos guardar tu respuesta. Revisa tu conexión e inténtalo de nuevo.';
      if (validPhone()) {
        ownResponse = record;
        showResponse(record);
        $('#responseStatus').textContent =
          'No pudimos guardar en la lista. Puedes hacer llegar tu respuesta por WhatsApp.';
      }
    } finally {
      button.disabled = false;
    }
  }

  // ===== Botones y arranque =====
  $('#rsvpForm').addEventListener('submit', submitResponse);
  $('#editResponse').addEventListener('click', () => {
    if (!ownResponse) return;
    $('#guestName').value = ownResponse.nombre;
    $('#guestSong').value = ownResponse.cancion;
    $('#guestMessage').value = ownResponse.mensaje;
    $('#rsvpForm').querySelector(`input[value="${ownResponse.asiste}"]`).checked = true;
    $$('.companion-field input').forEach(
      (el, i) => (el.value = ownResponse.acompanantes?.[i] || ''),
    );
    $('#responseCard').hidden = true;
    $('#rsvpForm').hidden = false;
    $('#guestName').focus();
  });
  render();
  loadPersonal();
})();
