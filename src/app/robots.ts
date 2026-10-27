import type { MetadataRoute } from "next";

// Indicazioni per i motori di ricerca: niente API, area del team e pagine personali delle idee
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/valutazione", "/*/idee"] },
  };
}
