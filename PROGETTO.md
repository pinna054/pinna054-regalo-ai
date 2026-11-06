# PROGETTO

Documento di riferimento del progetto: cosa costruiamo, in che ordine, come sono fatti i dati
e quali scelte tecniche sono state prese (e perché).

## 1. Scopo

Un sito che **sceglie il regalo al posto tuo**. Chi fa il regalo descrive il destinatario
(relazione, età, occasione, budget, gusti, cosa non gli piace, carattere) e un motore AI propone
**4 idee regalo concrete**, ciascuna con due link di ricerca (Amazon e Google Shopping) per
comprarla online nel paese di consegna.

Il sito è **internazionale**: interfaccia in più lingue (all'inizio italiano e inglese), paese di
consegna scelto dall'utente (Italia, Regno Unito, Germania, Francia, Spagna, Stati Uniti), con
valuta, negozi e contesto culturale del paese.

La prima versione ha due obiettivi:

1. essere **il prodotto vero**, usabile da chiunque;
2. permettere al team (10 persone) di **valutare la qualità delle idee** su 100 scenari di test,
   prima di investire in altro.

Nome del sito: provvisorio, si cambia in un solo punto (`src/config/sito.ts`).

## 2. Come funziona (flusso)

```
Utente ──► modulo (home /it o /en)
            │  relazione, occasione, budget, paese, [età, descrizione, cosa ha già, cosa non sopporta]
            │  filtri: tipologie, ingombro massimo
            ▼
       POST /api/genera  (solo lato server)
            │  1. controlla i dati del modulo (zod) e toglie email/telefoni dai testi liberi
            │  2. limite richieste per IP (hash dell'IP, mai l'IP in chiaro)
            │  3. motore: prompt di sistema (prompts/motore-vN.md) + dati del destinatario
            │     → API Anthropic → JSON validato con zod (1 nuovo tentativo se non valido)
            │     → controllo budget/filtri (1 nuovo tentativo segnalando gli errori;
            │       se persistono, si mostrano solo le idee valide)
            │  4. costruisce i link SOLO da query_ricerca (il modello non genera URL)
            │  5. salva la generazione in forma anonima (input, output, token, costo, versione prompt)
            ▼
       Pagina risultati: lettura del profilo, avvisi, domande utili,
       4 schede idea (titolo, descrizione, perché, prezzo, sicura/originale, link, 👍/👎),
       "Rigenera" (idee diverse), "Rispondi e rigenera" (risposte alle domande aggiunte al profilo)
```

## 3. Fasi

### Fase 1 — Motore e sito pubblico (completata)

- [x] Home mobile-first: breve spiegazione + modulo + avviso privacy sotto il modulo
- [x] Multilingua con URL per lingua (`/it`, `/en`), lingua dedotta dal browser e modificabile
- [x] Paese di consegna obbligatorio (dedotto dalla lingua/browser, modificabile) → valuta e negozi
- [x] Motore: prompt `prompts/motore-v1.md`, JSON validato con zod, nuovi tentativi, controlli lato server
- [x] Pagina risultati con schede, link Amazon/Google, 👍/👎, Rigenera, risposte alle domande
- [x] Registrazione anonima di ogni generazione, voti e click
- [x] Limite di richieste per IP (e tetto giornaliero globale)
- [x] Pagina privacy in bozza (GDPR, con note per i paesi extra-UE)
- [x] File SQL pronto, `.env.example`, README in italiano
- [x] Verifica completa del flusso in locale (motore finto e finta API Anthropic, Postgres locale)

### Fase 2 — Area valutazione del team (`/valutazione`)

- [ ] Accesso con password condivisa; al primo accesso il valutatore sceglie il suo nome
      da un elenco modificabile
- [ ] Import CSV (`;`): `id;relazione;eta_destinatario;occasione;budget_euro;profilo_utente;difficolta`
      + colonne facoltative `set`, `lingua`, `paese`. Se manca `set`: 70% "sviluppo", 30% "test", a caso, salvato
- [ ] La colonna `difficolta` non arriva MAI al motore (serve solo nei report)
- [ ] "Genera": esecuzione del motore su tutti gli scenari, in coda, a piccoli blocchi
      (entro i limiti di tempo di Vercel), con gestione errori e ripresa
- [ ] Valutazione alla cieca: ogni scenario valutato da 2 persone diverse (assegnazione bilanciata);
      il valutatore non vede mai versione del prompt né difficoltà
- [ ] Per scenario: pertinenza, fattibilità, originalità (1–5), "Compreresti almeno una di queste idee?",
      idea migliore, nota libera
- [ ] Dashboard: medie per criterio e % "compreresti", divise per difficoltà, relazione, esecuzione,
      lingua e paese; elenco scenari con disaccordo ≥ 2 punti; di default solo set "sviluppo"
      (il set "test" si apre con un pulsante e un avviso)
- [ ] Esportazione CSV di risultati e valutazioni

### Fuori ambito (da NON costruire ora)

Account utente, pagamenti, carrello, spedizioni, acquisto automatico, catalogo proprio,
abbigliamento e scarpe. Il database è però predisposto per aggiungere in seguito
**profili salvati** e un **calendario di ricorrenze con promemoria email** (vedi §5.3).

## 4. Struttura del codice

```
prompts/                 prompt del motore, uno per versione (motore-v1.md, motore-v2.md, ...)
messages/                traduzioni dell'interfaccia (it.json, en.json, ...): una lingua = un file
supabase/                file SQL da eseguire su Supabase (uno per fase)
src/config/              configurazione modificabile senza toccare la logica
  sito.ts                nome del sito (unico punto), contatti, impostazioni generali
  paesi.ts               paesi: valuta, dominio Amazon, tag affiliazione, Google Shopping
  opzioni.ts             valori interni di relazione, occasione, tipologia, ingombro
  modelli.ts             prezzi dei modelli per la stima dei costi
src/motore/              il "cervello": prompt, chiamata all'AI, validazione, controlli, link
src/lib/                 database, limiti di richieste, utilità
src/app/[locale]/        pagine pubbliche (home, risultati, privacy)
src/app/api/             endpoint lato server (genera, voto, click)
src/app/valutazione/     area del team (fase 2)
src/components/          componenti dell'interfaccia
```

## 5. Database (Supabase / Postgres)

Regole generali:

- **Nessun dato identificativo**: niente nomi, email, IP in chiaro collegati alle generazioni.
- Tutte le tabelle hanno la **Row Level Security attiva senza regole**: l'API pubblica di Supabase
  non può leggerle né scriverle. Il sito accede solo dal server, con la stringa di connessione segreta.
- I valori di relazione, occasione, tipologia e ingombro sono **sempre quelli interni italiani**
  (es. `amico/a`, `natale`, `libri e cultura`) in tutte le lingue: si traducono solo le etichette.
  Così dati e report restano confrontabili.

### 5.1 Fase 1

**`generazioni`** — una riga per ogni chiamata al motore (anche le rigenerazioni)

| colonna | tipo | note |
|---|---|---|
| id | uuid PK | |
| creata_il | timestamptz | |
| origine | text | `sito` oppure `valutazione` (fase 2) |
| tipo_richiesta | text | `nuova`, `rigenera`, `risposte` |
| genitore_id | uuid → generazioni | generazione da cui deriva una rigenerazione |
| lingua | text | lingua dell'interfaccia (`it`, `en`, ...) |
| paese | text | paese di consegna (`IT`, `GB`, `DE`, `FR`, `ES`, `US`) |
| valuta | text | `EUR`, `GBP`, `USD` |
| input | jsonb | `{profilo: {...}, richiesta: {...}, risposte: [...], escludi_titoli: [...]}` |
| output | jsonb | risposta mostrata all'utente, dopo i controlli |
| tentativi | jsonb | dettaglio di ogni chiamata: problemi trovati, token, testo grezzo se scartato |
| esito | text | `ok`, `parziale` (meno di 4 idee valide), `errore` |
| errore | text | codice/descrizione dell'errore |
| prompt_versione | text | es. `motore-v1` |
| modello | text | es. `claude-sonnet-5-5` |
| parametri | jsonb | es. `{"effort": "medium"}` |
| token_input, token_output, token_cache_scrittura, token_cache_lettura | integer | somma di tutte le chiamate |
| costo_stimato_usd | numeric | stima da tabella prezzi |
| durata_ms | integer | |
| numero_chiamate | integer | chiamate all'API (1–3) |

**`idee`** — una riga per ogni idea mostrata

| colonna | tipo | note |
|---|---|---|
| id | uuid PK | usato da 👍/👎 e click |
| generazione_id | uuid → generazioni | |
| posizione | smallint | 1–4 |
| titolo, tipo, tipologia, ingombro | text | copiati per analisi rapide |
| prezzo_min, prezzo_max | numeric | nella valuta della generazione |
| query_ricerca | text | |
| dati | jsonb | l'idea completa |
| voto | smallint | `1` = 👍, `-1` = 👎, vuoto = nessun voto |
| votata_il | timestamptz | |
| click_amazon, click_google | integer | contatori |

**`limiti_richieste`** — contatori per il limite di richieste

| colonna | tipo | note |
|---|---|---|
| chiave | text | es. `genera:ora:<hash dell'IP>`; l'IP non è mai salvato in chiaro |
| finestra_inizio | timestamptz | inizio della finestra (ora/giorno) |
| conteggio | integer | |

Le righe più vecchie di 48 ore vengono cancellate automaticamente.

Gli aggiornamenti dei contatori (limiti, click) sono istruzioni SQL atomiche eseguite dal server
(`insert … on conflict do update`, `update … set click_amazon = click_amazon + 1`).

Vista **`riepilogo_giorni`**: per ogni giorno e origine, numero di generazioni, esiti, costo,
durata media, 👍/👎 e click.

### 5.2 Fase 2 (progettata ora, creata con il file SQL della fase 2)

- **`valutatori`**: id, nome (unico), attivo, creato_il — l'elenco modificabile dei nomi.
- **`scenari`**: id (quello del CSV), relazione, eta_testo, eta_min, eta_max, occasione,
  budget_testo, budget_min, budget_max, profilo_utente, **difficolta** (mai passata al motore),
  set (`sviluppo`/`test`), lingua, paese, importato_il.
- **`esecuzioni`**: id, nome, creata_il, creata_da, prompt_versione, modello, parametri, stato
  (`in_corso`, `completata`, `annullata`), contatori.
- **`esecuzione_scenari`** (la coda): esecuzione_id, scenario_id, stato (`in_attesa`,
  `in_lavorazione`, `completato`, `errore`), tentativi, generazione_id, errore,
  bloccato_fino (per riprendere i lavori rimasti a metà), aggiornato_il.
- **`assegnazioni`**: esecuzione_id, scenario_id, valutatore_id — 2 valutatori diversi per scenario,
  distribuiti in modo bilanciato.
- **`valutazioni`**: esecuzione_id, scenario_id, valutatore_id, pertinenza, fattibilita, originalita
  (1–5), compreresti (sì/no), idea_migliore (1–4), nota, creata_il, aggiornata_il.

Le generazioni prodotte dalle esecuzioni finiscono nella stessa tabella `generazioni`
(`origine = 'valutazione'`), così sito e test sono confrontabili.

### 5.3 Predisposizione futura (NON costruita ora)

Il campo `generazioni.input` è già diviso in **profilo** (chi è il destinatario) e **richiesta**
(occasione, budget, filtri, paese). Per aggiungere in futuro profili salvati e ricorrenze:

- account: Supabase Auth (`auth.users`), nessuna tabella utenti nostra;
- **`destinatari`**: id, utente_id → auth.users, etichetta scelta dall'utente (es. "mia sorella"),
  relazione, anno di nascita o età, descrizione, ha_gia, non_sopporta, paese, lingua
  — stessa forma di `input.profilo`;
- **`ricorrenze`**: id, destinatario_id, occasione, giorno e mese, ogni anno sì/no,
  avvisa_giorni_prima, ultimo_promemoria_il;
- **`promemoria_inviati`**: id, ricorrenza_id, inviato_il, esito;
- `generazioni.destinatario_id` (colonna nuova, facoltativa) per collegare le idee al profilo salvato.

Nessuna di queste aggiunte richiede di modificare le tabelle esistenti, solo di aggiungerne.

## 6. Variabili d'ambiente

Tutte lato server, mai visibili nel browser. Elenco completo con spiegazioni in `.env.example`.

| variabile | obbligatoria | a cosa serve |
|---|---|---|
| `ANTHROPIC_API_KEY` | sì | chiave API Anthropic |
| `ANTHROPIC_MODEL` | no (default `claude-sonnet-5-5`) | modello del motore |
| `ANTHROPIC_EFFORT` | no (default `medium`) | quanto il modello "ragiona" prima di rispondere |
| `MOTORE_PROMPT` | no (default `motore-v1`) | versione del prompt usata dal sito pubblico |
| `DATABASE_URL` | sì | stringa di connessione Supabase (Transaction pooler) |
| `AMAZON_TAG_IT`, `_UK`, `_DE`, `_FR`, `_ES`, `_US` | no | tag di affiliazione per ogni marketplace |
| `LIMITE_ORA`, `LIMITE_GIORNO`, `LIMITE_GLOBALE_GIORNO` | no | limiti di richieste |
| `SEGRETO_HASH_IP` | no (consigliata) | chiave per l'hash degli IP |
| `MOTORE_FINTO` | no | `1` = idee finte senza chiamare l'AI (solo sviluppo) |
| `VALUTAZIONE_PASSWORD` | fase 2 | password condivisa dell'area valutazione |

## 7. Decisioni prese

Scelte tecniche fatte con buon senso, senza chiedere conferma. Si possono cambiare.

1. **Nome "GIFTY"** (all'inizio provvisorio "Pensierino"), definito solo in `src/config/sito.ts`; logo: una volpe rossa disegnata in SVG.
2. **Next.js 16 (App Router) + TypeScript + Tailwind 4**, gestore pacchetti npm.
3. **Multilingua con next-intl**, URL con prefisso di lingua (`/it/...`, `/en/...`).
   L'elenco delle lingue si ricava automaticamente dai file in `messages/`: per aggiungere una lingua
   basta aggiungere `messages/xx.json` (le chiavi mancanti ricadono sull'inglese).
   Se il browser chiede una lingua non disponibile si usa l'**inglese**.
   Il cookie della lingua (`NEXT_LOCALE`) è di sessione e solo tecnico.
4. **Paese di consegna**: dedotto dalla regione indicata dal browser se è un paese supportato
   (es. `en-GB` → Regno Unito, `de-DE` → Germania); altrimenti dalla lingua dell'interfaccia
   (`it` → Italia, `en` → Stati Uniti). Sempre modificabile. Tutto in `src/config/paesi.ts`.
5. **Database: Supabase Postgres con connessione diretta** (libreria `postgres`) tramite il
   *Transaction pooler* di Supabase, invece del client HTTP `supabase-js`. Motivi: si può provare
   in locale con un normale Postgres, permette transazioni e una coda sicura per la fase 2,
   funziona bene su Vercel (`prepare: false`). La RLS resta attiva su tutte le tabelle.
6. **Motore**: SDK ufficiale Anthropic solo lato server. Il formato JSON del prompt è imposto anche
   con gli *structured outputs* dell'API (schema generato dallo stesso schema zod) e poi validato
   con zod. Ragionamento adattivo del modello con `effort` configurabile (default `medium`: il prompt
   chiede di valutare relazione, vincoli e gaffe prima di rispondere). Attivato il **fallback lato
   server in caso di rifiuto** (`fallbacks: "default"`), consigliato da Anthropic per i modelli 5.x.
   Il prompt di sistema è in cache per ridurre i costi. Nessun parametro `temperature`
   (non più accettato dalla versione attuale dell'API).
7. **Nuovi tentativi**: al massimo 1 per JSON non valido e al massimo 1 per idee fuori budget/filtri
   (quindi al massimo 3 chiamate). Se dopo il secondo tentativo restano idee non valide, si mostrano
   solo quelle valide, completando se serve con idee valide del tentativo precedente.
8. **Regole del controllo budget**: un'idea è valida se `prezzo_min ≤ prezzo_max`,
   `prezzo_max ≤ budget massimo` e `prezzo_min ≥ budget minimo` (con un solo valore di budget,
   il minimo è la metà del massimo, come dice la regola 1 del prompt). Ingombro: con "piccolo" sono
   ammesse solo idee piccole, con "medio" piccole e medie. Tipologie: se l'utente ne sceglie alcune,
   le idee devono appartenere a quelle. Un'idea con lo stesso titolo di una già proposta non è valida.
9. **"Rigenera"** passa al motore tutti i titoli già mostrati nella sessione.
   **"Rispondi e rigenera"** aggiunge le risposte al profilo e chiede idee nuove senza escludere
   le precedenti (con più informazioni, un'idea già vista può restare la migliore).
10. **Link**: costruiti solo dal campo `query_ricerca`.
    Amazon: `https://www.amazon.<dominio>/s?k=QUERY` + `&tag=TAG` se configurato.
    Google Shopping: `https://www.google.<dominio>/search?q=QUERY&udm=28&gl=<paese>&hl=<lingua>`
    (`udm=28` è il parametro attuale della scheda Shopping; il vecchio `tbm=shop` ora reindirizza lì).
11. **Affiliazione Amazon**: l'avviso compare solo se c'è un tag per quel marketplace; i link
    affiliati hanno `rel="sponsored nofollow noopener"`. I prezzi mostrati sono stime del motore,
    mai prezzi Amazon.
12. **Click**: il link porta direttamente al negozio (nessun reindirizzamento); il click viene
    registrato in parallelo con `navigator.sendBeacon`.
13. **Privacy**: l'IP non viene mai salvato con le generazioni; per i limiti si usa un hash
    (HMAC-SHA256 con chiave segreta) cancellato dopo 48 ore. Email e numeri di telefono scritti nei
    campi liberi vengono rimossi prima di inviarli al modello e di salvarli. Nessuno strumento di
    analisi, nessun cookie di profilazione. Font ospitati sul sito (nessuna richiesta a Google Fonts).
14. **Limiti di default**: 10 generazioni/ora e 40/giorno per IP, 2000/giorno in totale
    (modificabili con variabili d'ambiente). Le generazioni della fase 2 non sono soggette ai limiti.
15. **Età**: numero nel modulo pubblico; nel motore viaggia come testo, così la fase 2 può passare
    intervalli come "20-30".
16. **Valuta**: budget e prezzi sempre nella valuta del paese di consegna. Nel CSV della fase 2 la
    colonna `budget_euro` si intende nella valuta del paese dello scenario.
17. **Versione del prompt**: il sito pubblico usa `MOTORE_PROMPT` (default `motore-v1`); ogni
    generazione registra la versione. Nella fase 2 si sceglie la versione per ogni esecuzione,
    così v1 e v2 si confrontano sugli stessi scenari. I file `prompts/` sono inclusi nel pacchetto
    pubblicato su Vercel.
18. **Costi**: stimati in dollari (valuta dei listini Anthropic) da `src/config/modelli.ts`.
19. **Motore finto** (`MOTORE_FINTO=1`): idee di prova senza chiamare l'AI, per sviluppare senza
    chiave; il sito mostra un avviso ben visibile. Da non attivare mai in produzione.
20. **Durata delle funzioni su Vercel**: `/api/genera` può durare fino a 300 secondi
    (limite del piano Hobby con Fluid Compute); di solito risponde in 10–30 secondi.
21. **Area valutazione solo in italiano**, su `/valutazione`, fuori dal sistema delle lingue.
22. **Test automatici** (vitest) sulle parti di logica: controlli budget/filtri, link, budget, CSV.
23. **Design**: palette calda (crema, terracotta, salvia), titoli con Fraunces e testo con Figtree,
    componenti disegnati a mano senza librerie di UI.
24. **Prompt v1**: oltre alle tre modifiche richieste per il sito internazionale (primo paragrafo,
    regole 11 e 12), nel testo originale sono state cambiate solo due espressioni che contraddicevano
    la regola 12: "prezzi come numeri in euro" → "prezzi come numeri nella valuta del paese di
    consegna" e "su Amazon.it o Google Shopping" → "su Amazon o Google Shopping". Il resto è identico.
25. **Messaggio al modello**: i dati del modulo arrivano in un messaggio strutturato in italiano
    (come il prompt), con i testi liberi racchiusi tra marcatori (es. `<descrizione>`), così il
    modello li tratta come dati e non come istruzioni. "natale" viene spiegato come "festività di
    fine anno"; con un solo valore di budget il messaggio esplicita l'intervallo (metà–massimo).
26. **Più di 4 idee** nella risposta: se almeno 4 sono valide si prendono le prime 4 senza ritentare;
    meno di 4 idee contano come errore da correggere. Le domande utili oltre la seconda vengono scartate.
27. **Pagine mantenute in memoria**: con Next.js 16 le pagine visitate restano nascoste nel browser
    (per un "indietro" istantaneo); per questo i campi dei moduli usano identificativi unici (`useId`).
28. **Memoria del browser**: modulo compilato e idee ricevute restano nel `sessionStorage` della scheda
    (si cancellano chiudendola): permettono "Modifica i dati", il ritorno alle idee e il cambio di lingua
    senza perdere nulla, senza cookie né account.

## 8. Cose che può dare solo il proprietario

- Repository GitHub (vuoto) dove pubblicare il codice
- Chiave API Anthropic
- Progetto Supabase (stringa di connessione)
- Account Vercel collegato a GitHub
- Facoltativi: tag di affiliazione Amazon per ogni marketplace, password dell'area valutazione,
  dati del titolare per la pagina privacy
29. **Esperienza "alla Tinder"** (richiesta del proprietario, dopo la fase 1):
    - dopo il modulo arriva un **quiz**: 8 domande sì/no precise e fantasiose da scorrere
      (destra = Sì, sinistra = No, pulsante "Non so") e 2 domande aperte da scrivere (si possono saltare).
      Le domande le scrive il modello con il prompt `prompts/domande-v1.md` (endpoint `/api/domande`,
      con limiti per IP separati da quelli delle idee). Le risposte entrano nel profilo come `risposte`;
    - poi le **idee una alla volta**: destra = mi piace (va nei **Preferiti**, con i link per comprare),
      sinistra = scarta, con "Annulla". Ogni scelta è salvata come 👍/👎 (`idee.voto`), quindi i dati per
      il team restano gli stessi. Quando resta una carta, il motore prepara altre 4 idee in sottofondo
      ricevendo le idee piaciute e scartate (`input.piaciute`, `input.scartate`);
    - **soprannome** facoltativo ("Come lo/la chiami?") per rendere le domande personali
      ("Lucrezia andrebbe mai a un concerto di Travis Scott?"): resta solo nel browser, al server e al
      modello il destinatario arriva sempre come "la persona". Così resta valida la regola iniziale di non
      raccogliere il nome del destinatario.
30. **Gifty diventa la pagina principale** (prototipo del proprietario, `public/gifty.html`):
    - grafica, logo, testi, domande, swipe e prompt **identici** al prototipo; la pagina resta un file
      HTML statico servito su `/` (`src/proxy.ts`), il resto del sito resta su `/it` e `/en`;
    - nel prototipo l'AI era chiamata con `claude.use("sample")`, che funziona solo dentro Claude: ora la
      pagina chiama **`/api/ai`** sul nostro server, che usa l'SDK Anthropic con `ANTHROPIC_MODEL`
      (predefinito `claude-sonnet-5-5`) e la chiave `ANTHROPIC_API_KEY`, che resta solo sul server;
    - il browser manda solo le risposte e i nomi delle idee, **il prompt lo costruisce il server**
      (`src/gifty/prompt.ts`, testo identico al prototipo, verificato con un confronto automatico):
      così nessuno può usare l'endpoint per far scrivere all'AI altro. Il JSON è imposto con gli
      structured outputs e validato con zod (un nuovo tentativo se non è valido);
    - domande con effort `low` (devono arrivare in fretta), idee con `ANTHROPIC_EFFORT`;
    - **limiti per utente** (IP, salvato solo come hash): 40 chiamate all'ora, 120 al giorno, 5000 al
      giorno per tutto il sito; con database i contatori sono nella tabella `limiti_richieste`, senza
      restano in memoria (va bene solo in locale);
    - **modalità demo**: se manca la chiave, se l'AI non risponde o se il limite è raggiunto, la pagina
      passa da sola alle domande e alle idee di esempio del prototipo, con l'avviso del prototipo.
