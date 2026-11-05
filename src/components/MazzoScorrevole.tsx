"use client";

/**
 * Mazzo di carte da scorrere, come in un'app di incontri.
 * A destra = sì / mi piace, a sinistra = no / scarta. Funziona anche con i pulsanti
 * sotto le carte e con le frecce della tastiera. Usato per le idee e per le domande del quiz.
 */
import { useRef, useState, type PointerEvent, type ReactNode } from "react";

// Di quanti pixel va spostata la carta perché la scelta valga
const SOGLIA = 100;

type Props<T> = {
  /** Elementi ancora da scegliere: il primo è la carta in cima */
  elementi: T[];
  chiave: (elemento: T) => string;
  disegna: (elemento: T) => ReactNode;
  onScegli: (elemento: T, scelta: 1 | -1) => void;
  /** Testi dei timbri e dei pulsanti */
  etichette: { destra: string; sinistra: string; istruzioni: string };
  /** Pulsante facoltativo tra i due principali (es. "Annulla" o "Non so") */
  centrale?: { etichetta: string; icona: ReactNode; onClick: () => void; disabilitato?: boolean };
  /** Icone dei pulsanti principali */
  icone: { destra: ReactNode; sinistra: ReactNode };
};

export function MazzoScorrevole<T>({ elementi, chiave, disegna, onScegli, etichette, centrale, icone }: Props<T>) {
  // Spostamento orizzontale della carta in cima mentre la si trascina
  const [spostamento, setSpostamento] = useState(0);
  const [trascinando, setTrascinando] = useState(false);
  // Direzione in cui la carta sta volando via dopo la scelta
  const [uscita, setUscita] = useState<1 | -1 | null>(null);
  const inizio = useRef<{ x: number; id: number } | null>(null);

  const cima = elementi[0];

  function scegli(scelta: 1 | -1) {
    if (cima === undefined || uscita) return;
    setUscita(scelta);
    // L'animazione di uscita dura 250 ms, poi la scelta viene registrata
    setTimeout(() => {
      onScegli(cima, scelta);
      setUscita(null);
      setSpostamento(0);
    }, 250);
  }

  function premi(e: PointerEvent<HTMLDivElement>) {
    // Non trascinare se si tocca un campo, un link o un pulsante dentro la carta
    if ((e.target as HTMLElement).closest("a, button, input, textarea")) return;
    inizio.current = { x: e.clientX, id: e.pointerId };
    setTrascinando(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function muovi(e: PointerEvent<HTMLDivElement>) {
    if (inizio.current?.id === e.pointerId) setSpostamento(e.clientX - inizio.current.x);
  }
  function rilascia(e: PointerEvent<HTMLDivElement>) {
    if (inizio.current?.id !== e.pointerId) return;
    inizio.current = null;
    setTrascinando(false);
    if (spostamento > SOGLIA) scegli(1);
    else if (spostamento < -SOGLIA) scegli(-1);
    else setSpostamento(0);
  }

  if (cima === undefined) return null;

  const x = uscita ? uscita * 700 : spostamento;
  // da -1 (tutto a sinistra) a 1 (tutto a destra): serve a mostrare i timbri
  const verso = Math.max(-1, Math.min(1, x / SOGLIA));

  return (
    <div
      className="mx-auto w-full max-w-md outline-none"
      tabIndex={0}
      aria-label={etichette.istruzioni}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") scegli(1);
        if (e.key === "ArrowLeft") scegli(-1);
      }}
    >
      {/* Le carte sono impilate nella stessa cella della griglia: si vedono la prima e, sotto, la seconda */}
      <div className="grid">
        {elementi.slice(0, 2).reverse().map((elemento) => {
          const inCima = chiave(elemento) === chiave(cima);
          return (
            <div
              key={chiave(elemento)}
              className={`relative [grid-area:1/1] ${
                inCima ? "z-10 cursor-grab touch-pan-y select-none active:cursor-grabbing" : "scale-[0.95] opacity-60"
              }`}
              style={
                inCima
                  ? {
                      transform: `translateX(${x}px) rotate(${x / 18}deg)`,
                      transition: trascinando ? "none" : "transform 0.25s ease-out",
                    }
                  : { transition: "transform 0.25s ease-out" }
              }
              onPointerDown={inCima ? premi : undefined}
              onPointerMove={inCima ? muovi : undefined}
              onPointerUp={inCima ? rilascia : undefined}
              onPointerCancel={inCima ? rilascia : undefined}
              aria-hidden={!inCima}
              data-carta={inCima ? "cima" : "sotto"}
            >
              {disegna(elemento)}
              {inCima && (
                <>
                  <Timbro testo={etichette.destra} visibilita={verso} lato="destra" />
                  <Timbro testo={etichette.sinistra} visibilita={-verso} lato="sinistra" />
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-center gap-5">
        <PulsanteTondo etichetta={etichette.sinistra} onClick={() => scegli(-1)} grande colore="text-terracotta hover:bg-terracotta-chiaro">
          {icone.sinistra}
        </PulsanteTondo>
        {centrale && (
          <PulsanteTondo
            etichetta={centrale.etichetta}
            onClick={centrale.onClick}
            disabilitato={centrale.disabilitato}
            colore="text-tenue hover:bg-sabbia"
          >
            {centrale.icona}
          </PulsanteTondo>
        )}
        <PulsanteTondo etichetta={etichette.destra} onClick={() => scegli(1)} grande colore="text-salvia hover:bg-salvia-chiaro">
          {icone.destra}
        </PulsanteTondo>
      </div>
      <p className="mt-3 text-center text-sm text-tenue">{etichette.istruzioni}</p>
    </div>
  );
}

function Timbro({ testo, visibilita, lato }: { testo: string; visibilita: number; lato: "destra" | "sinistra" }) {
  return (
    <span
      className={`pointer-events-none absolute top-6 z-20 rounded-lg border-4 bg-carta/80 px-3 py-1 text-xl font-black tracking-wider uppercase ${
        lato === "destra" ? "left-6 -rotate-12 border-salvia text-salvia" : "right-6 rotate-12 border-terracotta text-terracotta"
      }`}
      style={{ opacity: Math.max(0, visibilita) }}
      aria-hidden="true"
    >
      {testo}
    </span>
  );
}

function PulsanteTondo({
  etichetta,
  onClick,
  disabilitato = false,
  grande = false,
  colore,
  children,
}: {
  etichetta: string;
  onClick: () => void;
  disabilitato?: boolean;
  grande?: boolean;
  colore: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabilitato}
      aria-label={etichetta}
      title={etichetta}
      className={`grid place-items-center rounded-full border border-bordo bg-white shadow-morbida transition active:scale-95 disabled:opacity-40 ${colore} ${
        grande ? "size-16" : "size-12"
      }`}
    >
      <svg viewBox="0 0 20 20" className={grande ? "size-7" : "size-5"} aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

/** Icone usate dai mazzi. */
export const ICONE = {
  cuore: (
    <path fill="currentColor" d="M10 17.3 8.9 16.3C4.9 12.7 2.3 10.3 2.3 7.4A4.1 4.1 0 0 1 6.5 3.2c1.4 0 2.7.6 3.5 1.7a4.6 4.6 0 0 1 3.5-1.7 4.1 4.1 0 0 1 4.2 4.2c0 2.9-2.6 5.3-6.6 8.9L10 17.3Z" />
  ),
  croce: (
    <path fill="currentColor" d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
  ),
  spunta: (
    <path fill="currentColor" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" />
  ),
  annulla: (
    <path fill="currentColor" d="M8.7 3.3a1 1 0 0 1 0 1.4L6.4 7H11a6 6 0 1 1 0 12H8a1 1 0 1 1 0-2h3a4 4 0 0 0 0-8H6.4l2.3 2.3a1 1 0 1 1-1.4 1.4l-4-4a1 1 0 0 1 0-1.4l4-4a1 1 0 0 1 1.4 0Z" />
  ),
  forse: (
    <path fill="currentColor" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 13a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm1.2-4.3v.5H9v-.9c0-1 .6-1.6 1.3-2 .5-.4.8-.6.8-1.1 0-.6-.5-1-1.1-1-.7 0-1.1.4-1.2 1.1L6.7 7c.2-1.8 1.6-2.9 3.4-2.9 2 0 3.3 1.1 3.3 2.8 0 1.2-.7 1.8-1.4 2.3-.5.4-.8.6-.8 1.5Z" />
  ),
};
