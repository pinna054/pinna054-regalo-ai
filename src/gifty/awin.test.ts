import { afterEach, describe, expect, it } from "vitest";
import { linkAwin } from "./awin";

describe("affiliazione Awin", () => {
  afterEach(() => {
    delete process.env.AWIN_PUBLISHER_ID;
    delete process.env.AWIN_NEGOZI;
  });
  it("trasforma solo i link dei negozi approvati", () => {
    process.env.AWIN_PUBLISHER_ID = "3161335";
    process.env.AWIN_NEGOZI = "etsy.com:6220, smartbox.com:12345";
    const l = linkAwin("https://www.etsy.com/it/listing/123/disco-personalizzato");
    expect(l).toBe("https://www.awin1.com/cread.php?awinmid=6220&awinaffid=3161335&ued=https%3A%2F%2Fwww.etsy.com%2Fit%2Flisting%2F123%2Fdisco-personalizzato");
    expect(linkAwin("https://www.mediaworld.it/prodotto")).toBeNull();
  });
  it("senza configurazione non cambia niente", () => {
    expect(linkAwin("https://www.etsy.com/it/listing/1")).toBeNull();
  });
});
