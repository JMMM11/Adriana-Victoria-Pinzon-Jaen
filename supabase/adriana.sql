-- Ejecutar en el SQL Editor del proyecto Supabase de la anfitriona.
-- Los visitantes pueden enviar mensajes y leer el libro; no pueden editar ni borrar.
-- Las confirmaciones solo se pueden enviar: nadie las lee desde la página.
begin;

create table if not exists public.mensajes_adriana (
  id uuid primary key default gen_random_uuid(),
  evento text not null default 'adriana-victoria-2026'
    check (evento = 'adriana-victoria-2026'),
  nombre text not null check (char_length(btrim(nombre)) between 2 and 120),
  mensaje text not null check (char_length(btrim(mensaje)) between 2 and 2000),
  creado timestamptz not null default now()
);

create table if not exists public.confirmaciones_adriana (
  id uuid primary key default gen_random_uuid(),
  evento text not null default 'adriana-victoria-2026'
    check (evento = 'adriana-victoria-2026'),
  nombre text not null check (char_length(btrim(nombre)) between 3 and 120),
  asiste text not null check (asiste in ('si','no')),
  acompanantes jsonb not null default '[]'::jsonb
    check (jsonb_typeof(acompanantes) = 'array' and jsonb_array_length(acompanantes) <= 98),
  familia text check (char_length(familia) <= 120),
  puestos integer check (puestos between 1 and 99),
  cancion text check (char_length(cancion) <= 200),
  mensaje text check (char_length(mensaje) <= 2000),
  codigo text not null unique check (char_length(codigo) between 6 and 40),
  creado timestamptz not null default now()
);

alter table public.mensajes_adriana enable row level security;
alter table public.confirmaciones_adriana enable row level security;

revoke all on public.mensajes_adriana from anon, authenticated;
revoke all on public.confirmaciones_adriana from anon, authenticated;
grant usage on schema public to anon;
grant insert (id,evento,nombre,mensaje) on public.mensajes_adriana to anon;
grant insert (evento,nombre,asiste,acompanantes,familia,puestos,cancion,mensaje,codigo)
  on public.confirmaciones_adriana to anon;

drop policy if exists "Invitados envian palabras privadas" on public.mensajes_adriana;
create policy "Invitados envian palabras privadas"
  on public.mensajes_adriana for insert to anon
  with check (evento = 'adriana-victoria-2026');

drop policy if exists "Invitados confirman asistencia" on public.confirmaciones_adriana;
create policy "Invitados confirman asistencia"
  on public.confirmaciones_adriana for insert to anon
  with check (evento = 'adriana-victoria-2026');

-- El libro de mensajes se muestra en la invitación: nombre, mensaje y fecha.
grant select (nombre, mensaje, creado) on public.mensajes_adriana to anon;
drop policy if exists "Invitados leen el libro de mensajes" on public.mensajes_adriana;
create policy "Invitados leen el libro de mensajes"
  on public.mensajes_adriana for select to anon
  using (evento = 'adriana-victoria-2026');

-- Las confirmaciones se leen y exportan únicamente desde el proyecto de la anfitriona.
grant all on public.mensajes_adriana, public.confirmaciones_adriana to service_role;
commit;
