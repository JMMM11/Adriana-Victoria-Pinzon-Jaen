# XV de Adriana Victoria

Invitación digital: el invitado entra a la casa, recibe una carta de Lady Whistledown y recorre la celebración.

## Dónde está cada cosa

- Páginas: `index.html` (invitación) y `confirmar.html` (confirmación de asistencia).
- Fotos, WhatsApp y conexión a la base de datos: `configuracion.js`. Las fotos se guardan en `assets/fotos/`.
- Textos y datos de la fiesta: `datos.js`.
- Estilos, en el orden en que se cargan: `estilos.css` (base), `experiencia.css` (entrada y animaciones) y `adriana.css` (colores y ajustes para teléfono).
- Comportamiento: `app.js` (invitación), `experiencia.js` (entrada y jardín), `confirmar.js` (confirmación), `musica.js` (música) y `servicios.js` (envíos a Supabase).
- Mensajes y confirmaciones: tablas `mensajes_adriana` y `confirmaciones_adriana` del proyecto de Supabase (estructura en `supabase/adriana.sql`).

## Ver en local

`node servidor.mjs` y abrir <http://127.0.0.1:4173/>.

## Publicación

El sitio se publica en Vercel desde la rama `main` de GitHub: cada `git push` actualiza la página. Las cabeceras del sitio están en `vercel.json`.
