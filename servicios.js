/* Envíos a Supabase y lectura del libro de mensajes. Las confirmaciones nunca se consultan. */
window.AdrianaServicios = (() => {
  'use strict';
  const EVENTO = 'adriana-victoria-2026';

  // ===== Conexión: solo se acepta una clave pública de Supabase =====
  function publicKey(key) {
    if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
    try {
      return (
        JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'
      );
    } catch {
      return false;
    }
  }
  function configuration() {
    const raw = window.CONFIGURACION_ADRIANA?.supabase || {};
    return {
      url: String(raw.url || '')
        .trim()
        .replace(/\/$/, ''),
      key: String(raw.clavePublica || '').trim(),
    };
  }
  function available() {
    const c = configuration();
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(c.url) && publicKey(c.key);
  }

  // ===== Guardar un registro =====
  async function insert(table, payload) {
    if (!available()) throw new Error('not-configured');
    const c = configuration(),
      controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const headers = {
        apikey: c.key,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      };
      // Las claves publishable no son JWT y no se envían como Bearer.
      if (!c.key.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${c.key}`;
      const response = await fetch(`${c.url}/rest/v1/${table}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...payload, evento: EVENTO }),
        signal: controller.signal,
      });
      if (!response.ok) {
        // Si se perdió la primera respuesta de red, reintentar el mismo UUID
        // no crea dos cartas. Esta tabla solo tiene una restricción única: id.
        if (table === 'mensajes_adriana' && response.status === 409) {
          const failure = await response.json().catch(() => ({}));
          if (failure.code === '23505') return true;
        }
        throw new Error('save-failed');
      }
      // La respuesta se muestra solo después de la confirmación del servidor.
      return true;
    } finally {
      clearTimeout(timer);
    }
  }

  // ===== Libro de mensajes y confirmaciones =====
  async function message(name, text, id) {
    name = String(name).trim();
    text = String(text).trim();
    if (name.length < 2 || name.length > 120 || text.length < 2 || text.length > 2000)
      throw new Error('invalid-message');
    return insert('mensajes_adriana', { id, nombre: name, mensaje: text });
  }
  async function attendance(record) {
    const { fecha, remote, ...payload } = record;
    payload.cancion ||= null;
    payload.mensaje ||= null;
    return insert('confirmaciones_adriana', payload);
  }
  // Lee las cartas del libro, de la más reciente a la más antigua.
  async function messages() {
    if (!available()) return [];
    const c = configuration(),
      controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const headers = { apikey: c.key };
      if (!c.key.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${c.key}`;
      const response = await fetch(
        `${c.url}/rest/v1/mensajes_adriana?select=nombre,mensaje,creado&order=creado.desc&limit=150`,
        { headers, signal: controller.signal },
      );
      if (!response.ok) throw new Error('read-failed');
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }
  return { available, message, attendance, messages };
})();
