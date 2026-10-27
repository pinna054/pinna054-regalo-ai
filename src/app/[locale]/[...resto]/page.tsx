import { notFound } from "next/navigation";

// Qualsiasi indirizzo sconosciuto (es. /it/pagina-che-non-esiste) mostra la pagina "non trovata"
export default function PaginaSconosciuta() {
  notFound();
}
