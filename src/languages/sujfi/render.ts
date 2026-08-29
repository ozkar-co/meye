import { createCanvas } from "canvas";
import { cacheKey, getOrCreatePng } from "../../cache.js";
import { translateToSujfi, splitSyllables, translateSyllables } from "./translate.js";

/** Minimal typographic render for a Sujfi word (placeholder for richer art). */
export async function renderSujfiImage(word: string): Promise<Buffer> {
  const key = cacheKey({ lang: "sujfi", word });
  return getOrCreatePng(`sujfi_${key}`, async () => {
    const sujfi = translateToSujfi(word);
    const syllables = translateSyllables(splitSyllables(word));
    const canvas = createCanvas(1200, 600);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1a1f24";
    ctx.fillRect(0, 0, 1200, 600);
    ctx.fillStyle = "#e8e4dc";
    ctx.font = "bold 48pt Sans";
    ctx.textAlign = "center";
    ctx.fillText(word, 600, 180);
    ctx.font = "bold 72pt Sans";
    ctx.fillStyle = "#c4a574";
    ctx.fillText(sujfi, 600, 320);
    ctx.font = "28pt Sans";
    ctx.fillStyle = "#8a9088";
    ctx.fillText(syllables.join(" · "), 600, 420);
    ctx.font = "20pt Sans";
    ctx.fillText("sujfi", 600, 520);
    return canvas.toBuffer("image/png");
  });
}
