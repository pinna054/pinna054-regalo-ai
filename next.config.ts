import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Le lingue del sito si ricavano dai file nella cartella /messages:
// per aggiungere il francese basta creare messages/fr.json, senza toccare il codice.
const lingue = fs
  .readdirSync(path.join(process.cwd(), "messages"))
  .filter((file) => /^[a-z]{2}(-[A-Z]{2})?\.json$/.test(file))
  .map((file) => file.replace(/\.json$/, ""))
  .sort();

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,

  // Valori resi disponibili al codice (anche nel browser): solo dati NON segreti.
  env: {
    LINGUE_DISPONIBILI: lingue.join(","),
  },

  // I prompt del motore (cartella /prompts) vengono letti dal server mentre il sito gira:
  // questa riga li include nel pacchetto pubblicato su Vercel.
  outputFileTracingIncludes: {
    "/**": ["./prompts/**/*"],
  },

  // Intestazioni di sicurezza di base per tutte le pagine
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
