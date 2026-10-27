-- =====================================================================
--  FASE 1 — tabelle del sito pubblico
--
--  Come usarlo: Supabase → SQL Editor → New query → incolla TUTTO il file → Run.
--  Si può rieseguire senza problemi: crea solo ciò che manca e non cancella dati.
-- =====================================================================


-- ---------------------------------------------------------------------
-- GENERAZIONI: una riga per ogni richiesta di idee al motore
-- (anche le rigenerazioni). Nessun dato che identifichi le persone:
-- niente IP, niente nomi, niente account.
-- ---------------------------------------------------------------------
create table if not exists public.generazioni (
  id                     uuid primary key default gen_random_uuid(),
  creata_il              timestamptz not null default now(),
  -- 'sito' = richiesta di un utente; 'valutazione' = test del team (fase 2)
  origine                text not null default 'sito' check (origine in ('sito', 'valutazione')),
  -- 'nuova' = modulo inviato; 'rigenera' = "altre idee"; 'risposte' = risposte alle domande
  tipo_richiesta         text not null default 'nuova' check (tipo_richiesta in ('nuova', 'rigenera', 'risposte')),
  -- generazione da cui deriva una rigenerazione
  genitore_id            uuid references public.generazioni (id) on delete set null,
  lingua                 text not null,              -- lingua dell'interfaccia: it, en, ...
  paese                  text not null,              -- paese di consegna: IT, GB, DE, FR, ES, US
  valuta                 text not null,              -- EUR, GBP, USD
  -- dati inviati al motore: {profilo: {...}, richiesta: {...}, risposte: [...], escludi_titoli: [...]}
  input                  jsonb not null,
  -- risposta mostrata all'utente, dopo i controlli
  output                 jsonb,
  -- dettaglio di ogni chiamata al modello (problemi trovati, token, testo scartato)
  tentativi              jsonb not null default '[]'::jsonb,
  esito                  text not null check (esito in ('ok', 'parziale', 'errore')),
  errore                 text,
  prompt_versione        text not null,              -- es. motore-v1
  modello                text not null,              -- es. claude-sonnet-5-5
  parametri              jsonb not null default '{}'::jsonb,   -- es. {"effort": "medium"}
  token_input            integer not null default 0,
  token_output           integer not null default 0,
  token_cache_scrittura  integer not null default 0,
  token_cache_lettura    integer not null default 0,
  costo_stimato_usd      numeric(12, 6),
  durata_ms              integer,
  numero_chiamate        integer not null default 0
);

create index if not exists generazioni_creata_il_idx on public.generazioni (creata_il desc);
create index if not exists generazioni_origine_idx   on public.generazioni (origine, creata_il desc);
create index if not exists generazioni_genitore_idx  on public.generazioni (genitore_id);


-- ---------------------------------------------------------------------
-- IDEE: una riga per ogni idea mostrata, con 👍/👎 e click sui link
-- ---------------------------------------------------------------------
create table if not exists public.idee (
  id              uuid primary key default gen_random_uuid(),
  generazione_id  uuid not null references public.generazioni (id) on delete cascade,
  posizione       smallint not null check (posizione between 1 and 10),
  titolo          text not null,
  tipo            text,                -- sicura / originale
  tipologia       text,                -- esperienze, libri e cultura, ...
  ingombro        text,                -- piccolo / medio / grande
  prezzo_min      numeric(12, 2),      -- nella valuta della generazione
  prezzo_max      numeric(12, 2),
  query_ricerca   text,
  dati            jsonb not null,      -- l'idea completa
  voto            smallint check (voto in (-1, 1)),   -- 1 = 👍, -1 = 👎, vuoto = nessun voto
  votata_il       timestamptz,
  click_amazon    integer not null default 0,
  click_google    integer not null default 0,
  creata_il       timestamptz not null default now()
);

create index if not exists idee_generazione_idx on public.idee (generazione_id);


-- ---------------------------------------------------------------------
-- LIMITI_RICHIESTE: contatori per limitare gli abusi.
-- La chiave contiene un hash dell'IP (mai l'IP in chiaro).
-- Il sito cancella da solo le righe più vecchie di 48 ore.
-- ---------------------------------------------------------------------
create table if not exists public.limiti_richieste (
  chiave           text not null,
  finestra_inizio  timestamptz not null,
  conteggio        integer not null default 0,
  primary key (chiave, finestra_inizio)
);

create index if not exists limiti_richieste_finestra_idx on public.limiti_richieste (finestra_inizio);


-- ---------------------------------------------------------------------
-- RIEPILOGO_GIORNI: vista di comodo con numeri e costi per giorno
-- (in Supabase: Table Editor → riepilogo_giorni)
-- ---------------------------------------------------------------------
create or replace view public.riepilogo_giorni
with (security_invoker = true) as
with idee_per_generazione as (
  select generazione_id,
         count(*) filter (where voto = 1)   as voti_positivi,
         count(*) filter (where voto = -1)  as voti_negativi,
         sum(click_amazon + click_google)   as click
  from public.idee
  group by generazione_id
)
select
  date_trunc('day', g.creata_il)::date             as giorno,
  g.origine,
  count(*)                                          as generazioni,
  count(*) filter (where g.esito = 'ok')            as ok,
  count(*) filter (where g.esito = 'parziale')      as parziali,
  count(*) filter (where g.esito = 'errore')        as errori,
  round(sum(coalesce(g.costo_stimato_usd, 0)), 4)   as costo_usd,
  round(avg(g.durata_ms) / 1000.0, 1)               as secondi_medi,
  coalesce(sum(i.voti_positivi), 0)                 as voti_positivi,
  coalesce(sum(i.voti_negativi), 0)                 as voti_negativi,
  coalesce(sum(i.click), 0)                         as click
from public.generazioni g
left join idee_per_generazione i on i.generazione_id = g.id
group by 1, 2
order by 1 desc, 2;


-- ---------------------------------------------------------------------
-- SICUREZZA
-- Row Level Security attiva e nessuna regola: l'API pubblica di Supabase
-- (chiave anon / publishable) non può leggere né scrivere queste tabelle.
-- Il sito si collega dal server con la stringa di connessione segreta.
-- ---------------------------------------------------------------------
alter table public.generazioni      enable row level security;
alter table public.idee             enable row level security;
alter table public.limiti_richieste enable row level security;

do $$
begin
  -- I ruoli anon e authenticated esistono solo su Supabase
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.generazioni, public.idee, public.limiti_richieste, public.riepilogo_giorni
      from anon, authenticated;
  end if;
end
$$;
