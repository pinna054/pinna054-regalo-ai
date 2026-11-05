"use client";

/** Schermata di attesa mentre il motore prepara le idee (di solito 15-30 secondi). */
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Marchio } from "./Illustrazioni";

const NUMERO_FRASI = 5;

/** Va mostrato solo durante l'attesa: {inAttesa && <Caricamento />} */
export function Caricamento({ variante = "idee" }: { variante?: "idee" | "domande" }) {
  const t = useTranslations("caricamento");
  const [frase, setFrase] = useState(1);

  // Cambia frase ogni 3,5 secondi (l'ultima resta finché serve)
  useEffect(() => {
    const timer = setInterval(() => setFrase((n) => Math.min(n + 1, NUMERO_FRASI)), 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 grid place-items-center bg-crema/92 px-6 backdrop-blur-[3px]"
    >
      <div className="max-w-sm animate-comparsa text-center">
        <div className="mx-auto mb-6 w-fit animate-dondola">
          <Marchio className="size-16 drop-shadow-md" />
        </div>
        <p className="font-titoli text-2xl font-semibold">{variante === "domande" ? t("domandeTitolo") : t("titolo")}</p>
        {variante === "idee" && (
          <p key={frase} className="mt-3 min-h-6 animate-comparsa text-lg text-tenue">
            {t(`frasi.${frase}`)}
          </p>
        )}
        <div className="mx-auto mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-sabbia">
          <div className="h-full rounded-full bg-terracotta transition-[width] duration-[3500ms] ease-linear" style={{ width: `${(frase / NUMERO_FRASI) * 100}%` }} />
        </div>
        <p className="mt-6 text-sm text-tenue">{variante === "domande" ? t("domandeNota") : t("nota")}</p>
      </div>
    </div>
  );
}
