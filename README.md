# Pensierino — il regalo giusto, scelto per te

> "Pensierino" è un nome provvisorio: si cambia in un solo punto, `src/config/sito.ts`.

Sito che sceglie il regalo al posto tuo. Descrivi il destinatario (relazione, età, occasione,
budget, gusti, cosa non gli piace) e un motore AI propone **4 idee regalo concrete**, con i link
per cercarle su Amazon e Google Shopping nel paese di consegna.

- Multilingua: italiano e inglese (`/it`, `/en`), lingua dedotta dal browser.
- Paesi di consegna: Italia, Regno Unito, Germania, Francia, Spagna, Stati Uniti.
- Ogni generazione viene registrata in forma anonima per migliorare il motore.

Scopo, fasi, struttura del database e decisioni tecniche sono in **[PROGETTO.md](PROGETTO.md)**.

---

## Indice

1. [Cosa serve](#1-cosa-serve)
2. [Ottenere le chiavi](#2-ottenere-le-chiavi)
3. [Creare le tabelle su Supabase](#3-creare-le-tabelle-su-supabase)
4. [Avviare il sito sul tuo computer](#4-avviare-il-sito-sul-tuo-computer)
5. [Pubblicare su Vercel](#5-pubblicare-su-vercel)
6. [Modifiche frequenti](#6-modifiche-frequenti)
7. [Dove finiscono i dati](#7-dove-finiscono-i-dati)
8. [Importare il CSV degli scenari di test](#8-importare-il-csv-degli-scenari-di-test)
9. [Problemi comuni](#9-problemi-comuni)

---

## 1. Cosa serve

- **Node.js 22** o più recente: <https://nodejs.org> (scegli la versione "LTS").
- Un account **GitHub** con il repository del progetto.
- Un account **Anthropic** (motore AI), **Supabase** (database) e **Vercel** (pubblicazione).
  Supabase e Vercel hanno un piano gratuito sufficiente per iniziare.

## 2. Ottenere le chiavi

Tutte le chiavi vanno nelle **variabili d'ambiente** (mai nel codice). L'elenco completo, con
spiegazioni, è nel file [`.env.example`](.env.example).

### Chiave Anthropic (`ANTHROPIC_API_KEY`)

1. Vai su <https://platform.claude.com> e accedi (o crea un account).
2. Aggiungi un metodo di pagamento o del credito nella sezione di fatturazione (Billing).
3. Apri **API Keys** → **Create Key**, dai un nome (es. "sito regali") e copia la chiave
   (inizia con `sk-ant-`). Viene mostrata una sola volta.
4. Consigliato: nella sezione dei limiti imposta un **tetto di spesa mensile**, come rete di sicurezza.

Costo indicativo: con `claude-sonnet-5-5` una generazione costa circa 2–4 centesimi di dollaro
(il costo esatto stimato di ognuna viene salvato nel database, colonna `costo_stimato_usd`).

### Database Supabase (`DATABASE_URL`)

1. Vai su <https://supabase.com> → **New project**.
2. Scegli un nome, una **password del database** (salvala!) e una regione in Europa
   (es. *Frankfurt*), consigliata per il GDPR.
3. Quando il progetto è pronto, premi il pulsante **Connect** in alto.
4. Nella scheda delle stringhe di connessione scegli **Transaction pooler** (porta `6543`)
   e copia la stringa, che ha questa forma:
   ```
   postgresql://postgres.abcdefghijkl:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
5. Sostituisci `[YOUR-PASSWORD]` con la password del database: questa è la tua `DATABASE_URL`.

> Usa proprio il **Transaction pooler**: la connessione "diretta" non funziona da Vercel.
> Se hai dimenticato la password: *Project Settings → Database → Reset database password*.

### Tag di affiliazione Amazon (facoltativi)

Se partecipi al Programma di Affiliazione Amazon, ogni marketplace ha il suo tag (es. `mionegozio-21`):
impostalo nella variabile corrispondente (`AMAZON_TAG_IT`, `AMAZON_TAG_UK`, `AMAZON_TAG_DE`,
`AMAZON_TAG_FR`, `AMAZON_TAG_ES`, `AMAZON_TAG_US`). Quando un tag è presente, i link Amazon di quel
paese lo includono e sotto le idee compare l'avviso di affiliazione richiesto da Amazon.
Senza tag i link funzionano normalmente.

> Verifica nelle regole del programma di ogni marketplace il testo esatto dell'avviso richiesto
> (i testi si cambiano in `messages/it.json` e `messages/en.json`, chiave `idee.affiliazione`).

## 3. Creare le tabelle su Supabase

1. Nel progetto Supabase apri **SQL Editor** → **New query**.
2. Apri il file [`supabase/fase1.sql`](supabase/fase1.sql), copia **tutto** il contenuto e incollalo.
3. Premi **Run**. Deve comparire "Success".
4. In **Table Editor** ora vedi le tabelle `generazioni`, `idee`, `limiti_richieste`
   e la vista `riepilogo_giorni`.

Il file si può rieseguire senza rischi: crea solo ciò che manca e non cancella dati.
Le tabelle hanno la *Row Level Security* attiva e nessuna regola: l'API pubblica di Supabase
non può leggerle; il sito vi accede solo dal server con la `DATABASE_URL`.

## 4. Avviare il sito sul tuo computer

```bash
# 1. Scarica il progetto e installa le dipendenze
git clone <indirizzo-del-repository>
cd sito-regali
npm install

# 2. Crea il file con le chiavi e compilalo
cp .env.example .env.local
#    apri .env.local e inserisci almeno ANTHROPIC_API_KEY e DATABASE_URL

# 3. Avvia
npm run dev
```

Apri <http://localhost:3000>: verrai portato su `/it` o `/en` in base alla lingua del browser.

**Provare senza chiavi**: in `.env.local` scrivi `MOTORE_FINTO=1` e lascia vuota `DATABASE_URL`.
Il sito funziona con idee finte (c'è un avviso ben visibile) e senza salvare nulla.
Non usare mai `MOTORE_FINTO=1` sul sito pubblicato.

Altri comandi utili:

| comando | a cosa serve |
|---|---|
| `npm test` | test automatici della logica (controlli su budget e filtri, link, ecc.) |
| `npm run lint` | controllo dello stile del codice |
| `npm run build` | prepara la versione da pubblicare (la stessa che fa Vercel) |
| `npm start` | avvia la versione preparata con `build` |

## 5. Pubblicare su Vercel

1. Vai su <https://vercel.com>, accedi con GitHub.
2. **Add New… → Project** → scegli il repository → **Import**.
3. Lascia le impostazioni proposte (Vercel riconosce Next.js da solo).
4. Apri **Environment Variables** e aggiungi, con gli stessi nomi di `.env.example`:
   - `ANTHROPIC_API_KEY` (obbligatoria)
   - `DATABASE_URL` (obbligatoria: senza database il sito pubblicato non genera idee)
   - `SEGRETO_HASH_IP`: una stringa lunga e casuale (consigliata)
   - facoltative: `ANTHROPIC_MODEL`, `ANTHROPIC_EFFORT`, `MOTORE_PROMPT`, `AMAZON_TAG_…`, `LIMITE_…`
5. Premi **Deploy**. Dopo un paio di minuti il sito è online all'indirizzo indicato da Vercel.

Da quel momento ogni modifica salvata su GitHub (branch principale) viene pubblicata da sola.
Se cambi una variabile d'ambiente: **Settings → Environment Variables**, poi **Deployments →
Redeploy** perché la modifica abbia effetto.

> Una generazione dura di solito 10–30 secondi. La funzione `/api/genera` può durare fino a
> 300 secondi, il massimo del piano gratuito con *Fluid Compute* (attivo di default sui progetti nuovi).

## 6. Modifiche frequenti

| voglio… | dove |
|---|---|
| cambiare il **nome del sito** | `src/config/sito.ts` |
| completare la **pagina privacy** (titolare, email) | `src/config/sito.ts`; i testi in `messages/*.json` → `privacy` |
| cambiare un **testo** del sito | `messages/it.json`, `messages/en.json` |
| **aggiungere una lingua** (es. francese) | copia `messages/en.json` in `messages/fr.json` e traduci i testi. Nient'altro: il sito avrà `/fr` alla pubblicazione successiva. Le frasi non tradotte restano in inglese. |
| **aggiungere un paese** | aggiungi una voce in `src/config/paesi.ts` (valuta, dominio Amazon, Google) |
| cambiare **colori o caratteri** | `src/app/globals.css` (sezione `@theme`) |
| provare un **nuovo prompt** | crea `prompts/motore-v2.md` e imposta `MOTORE_PROMPT=motore-v2` |
| cambiare **modello** o **effort** | variabili `ANTHROPIC_MODEL`, `ANTHROPIC_EFFORT` |
| cambiare i **limiti di richieste** | variabili `LIMITE_ORA`, `LIMITE_GIORNO`, `LIMITE_GLOBALE_GIORNO` |

Note:

- Nei testi delle traduzioni le parole tra graffe (`{sito}`, `{valuta}`, `{numero}`) vanno lasciate
  così; evita l'apostrofo dritto subito prima di una graffa (usa `’`).
- I **valori interni** di relazione, occasione, tipologia e ingombro (es. `amico/a`, `natale`)
  sono in `src/config/opzioni.ts` e non vanno tradotti: si traducono solo le etichette.
- Se un nuovo prompt cambia i **campi del JSON** di risposta, aggiorna anche
  `src/motore/schema.ts`, altrimenti le risposte verranno scartate.
- Ogni generazione registra la versione del prompt usata (colonna `prompt_versione`).

## 7. Dove finiscono i dati

Tabelle su Supabase (dettagli in [PROGETTO.md](PROGETTO.md)):

- **`generazioni`**: ogni richiesta al motore (dati del modulo in forma anonima, risposta,
  versione del prompt, modello, token, costo stimato, durata, eventuali errori e tentativi).
- **`idee`**: ogni idea mostrata, con 👍/👎 (`voto`) e click (`click_amazon`, `click_google`).
- **`riepilogo_giorni`**: numeri e costi per giorno, pronti da consultare.

Qualche interrogazione utile (SQL Editor):

```sql
-- Gradimento per versione del prompt
select g.prompt_versione,
       count(*) filter (where i.voto = 1)  as pollici_su,
       count(*) filter (where i.voto = -1) as pollici_giu,
       sum(i.click_amazon + i.click_google) as click
from idee i join generazioni g on g.id = i.generazione_id
group by 1 order by 1;

-- Spesa API degli ultimi 7 giorni
select giorno, generazioni, costo_usd from riepilogo_giorni
where giorno > current_date - 7 order by giorno desc;
```

## 8. Importare il CSV degli scenari di test

L'area del team (`/valutazione`), con l'importazione del CSV dei 100 scenari, arriva con la
**fase 2**: questa sezione verrà completata allora. Formato previsto (separatore `;`):

```
id;relazione;eta_destinatario;occasione;budget_euro;profilo_utente;difficolta
```

più le colonne facoltative `set`, `lingua` e `paese`.

## 9. Problemi comuni

| sintomo | causa probabile |
|---|---|
| "Il servizio non è ancora configurato" | manca `ANTHROPIC_API_KEY` o, su Vercel, `DATABASE_URL`. Controlla le variabili e rifai il deploy. Nei log di Vercel (Logs) c'è il dettaglio. |
| "Hai chiesto molte idee in poco tempo" | è scattato il limite per IP (default 10 all'ora, 40 al giorno). |
| errori di connessione al database | la `DATABASE_URL` deve essere quella del **Transaction pooler** (porta 6543) con la password giusta. |
| le idee non arrivano mai | controlla credito e chiave su platform.claude.com e i log di Vercel. |
| "Modalità demo" sul sito pubblicato | è rimasta impostata `MOTORE_FINTO=1`: toglila. |
