-- Persistencia necesaria para fases posteriores y clasificados.
-- No borra datos existentes. Ejecutar manualmente en Supabase cuando se apruebe.

create table if not exists public.fase_equipos (
  id uuid primary key default gen_random_uuid(),
  fase_torneo_id uuid not null references public.fases_torneo(id) on delete cascade,
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  origen_fase_id uuid null references public.fases_torneo(id) on delete set null,
  origen_grupo_id uuid null references public.grupos_fase(id) on delete set null,
  posicion_origen integer null,
  metodo_clasificacion text not null default 'manual',
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  constraint fase_equipos_unique unique (fase_torneo_id, equipo_id)
);

create index if not exists idx_fase_equipos_fase on public.fase_equipos(fase_torneo_id);
create index if not exists idx_fase_equipos_equipo on public.fase_equipos(equipo_id);
create index if not exists idx_fase_equipos_origen_fase on public.fase_equipos(origen_fase_id);

create table if not exists public.criterios_clasificacion_fase (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid null references public.torneos(id) on delete cascade,
  categoria_id uuid null references public.categorias(id) on delete cascade,
  fase_torneo_id uuid not null references public.fases_torneo(id) on delete cascade,
  criterio text not null,
  orden integer not null,
  direccion text not null default 'desc' check (direccion in ('asc', 'desc')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint criterios_clasificacion_fase_unique unique (fase_torneo_id, criterio)
);

create index if not exists idx_criterios_clasificacion_fase on public.criterios_clasificacion_fase(fase_torneo_id, orden);

alter table public.fases_torneo
  add column if not exists configuracion jsonb not null default '{}'::jsonb;

comment on table public.fase_equipos is
  'Equipos participantes por fase. Permite que una categoria tenga 20 equipos, una fase 8 clasificados y otra 4.';

comment on column public.fases_torneo.configuracion is
  'Configuracion no destructiva para siguiente fase: fuente de equipos, cruces, ida/vuelta, tercer puesto, etc.';
