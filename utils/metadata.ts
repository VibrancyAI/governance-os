import { slugify } from "@/components/data-room-structure";

export type FileMetadata = {
  section?: string;
  slug?: string;
  currency?: string;
  asOfDate?: Date | null;
  entities: Array<{ key: string; value: string; confidence: number; unit?: string; asOfDate?: Date | null }>;
};

const CURRENCY_REGEX = /(USD|EUR|GBP|\$|€|£)/i;
const DATE_ISO = /\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/;
const DATE_MDY = /\b(0?[1-9]|1[0-2])[\/-](0?[1-9]|[12]\d|3[01])[\/-](20\d{2})\b/;

// very basic numeric captures
const NUMBER_WITH_SYMBOL = /([£$€]?\s?)(\d{1,3}(?:,\d{3})*(?:\.\d+)?)(\s?(k|m|bn|b))?/i;

function parseAsOfDate(text: string): Date | null {
  const iso = text.match(DATE_ISO);
  if (iso) return new Date(iso[0]);
  const mdy = text.match(DATE_MDY);
  if (mdy) {
    const [m, d, y] = [parseInt(mdy[1]), parseInt(mdy[2]), parseInt(mdy[3])];
    return new Date(y, m - 1, d);
  }
  return null;
}

function detectCurrency(text: string): string | undefined {
  const m = text.match(CURRENCY_REGEX);
  if (!m) return undefined;
  const s = m[0].toUpperCase();
  if (s.includes("USD") || s.includes("$")) return "USD";
  if (s.includes("EUR") || s.includes("€")) return "EUR";
  if (s.includes("GBP") || s.includes("£")) return "GBP";
  return undefined;
}

function findFirstAmount(lines: string[], keywords: string[]): string | null {
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (keywords.some((k) => lower.includes(k))) {
      const m = line.match(NUMBER_WITH_SYMBOL);
      if (m) return m[0];
    }
  }
  return null;
}

export function extractMetadata(filename: string, text: string): FileMetadata {
  const entities: FileMetadata["entities"] = [];
  const lines = text.split(/\r?\n/).slice(0, 200);
  const currency = detectCurrency(lines.join(" \n"));
  const asOfDate = parseAsOfDate(lines.join(" \n"));

  const revenue = findFirstAmount(lines, ["revenue", "arr", "mrr", "sales"]);
  if (revenue) entities.push({ key: "revenue", value: revenue, confidence: 0.6, unit: currency, asOfDate });

  const burn = findFirstAmount(lines, ["burn", "net burn", "cash outflow"]);
  if (burn) entities.push({ key: "burn", value: burn, confidence: 0.6, unit: currency, asOfDate });

  const runway = lines.find((l) => /runway/i.test(l));
  if (runway) entities.push({ key: "runway", value: runway, confidence: 0.5, unit: "months", asOfDate });

  const options = lines.find((l) => /(options outstanding|esop)/i.test(l));
  if (options) entities.push({ key: "options_outstanding", value: options, confidence: 0.5 });

  const lower = filename.toLowerCase();
  let slug: string | undefined;
  if (lower.includes("financial")) slug = slugify("Audited Financial Statements");
  if (lower.includes("cap") && lower.includes("table")) slug = slugify("Cap Table History (share issuances, SAFEs)");
  if (lower.includes("pitch") || lower.includes("deck")) slug = slugify("Pitch Deck");
  if (/(product\s*roadmap|\bprd\b|product[-_\s]?requirements)/i.test(lower)) slug = slugify("Product Roadmap");

  return { section: undefined, slug, currency, asOfDate, entities };
}
