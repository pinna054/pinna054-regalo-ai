import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Link e navigazione che tengono conto della lingua (aggiungono /it, /en, ...)
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
