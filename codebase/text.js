function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\u0111/g,"d").normalize("NFD")
    .replace(/\p{Diacritic}/gu, "").replace(/[^\p{L}\p{N}\s:/.-]/gu," ").replace(/\s+/g," ").trim();
}
module.exports = { normalizeText };
