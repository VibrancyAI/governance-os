export type TextChunk = {
  content: string;
  section?: string;
  slug?: string;
  asOfDate?: Date;
  sourceUrl?: string;
};

function isTabularLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  const hasDelimiters = /[|,\t]/.test(trimmed);
  const looksLikeHeader = /^\s*[-|+]+\s*$/.test(trimmed);
  return hasDelimiters && !looksLikeHeader;
}

function splitIntoBlocks(text: string): { type: "table" | "prose"; content: string }[] {
  const lines = text.split(/\r?\n/);
  const blocks: { type: "table" | "prose"; content: string }[] = [];
  let current: { type: "table" | "prose"; lines: string[] } | null = null;
  for (const line of lines) {
    const type: "table" | "prose" = isTabularLine(line) ? "table" : "prose";
    if (!current || current.type !== type) {
      if (current) blocks.push({ type: current.type, content: current.lines.join("\n") });
      current = { type, lines: [] };
    }
    current.lines.push(line);
  }
  if (current) blocks.push({ type: current.type, content: current.lines.join("\n") });
  return blocks.filter((b) => b.content.trim().length > 0);
}

function chunkString(input: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < input.length) {
    const end = Math.min(input.length, i + size);
    const slice = input.slice(i, end);
    chunks.push(slice);
    if (end === input.length) break;
    i = end - overlap;
    if (i < 0) i = 0;
  }
  return chunks;
}

export function smartSplitText(text: string): TextChunk[] {
  const blocks = splitIntoBlocks(text);
  const out: TextChunk[] = [];
  for (const b of blocks) {
    const size = b.type === "table" ? 600 : 1000;
    const overlap = b.type === "table" ? 80 : 150;
    const parts = chunkString(b.content, size, overlap);
    for (const p of parts) out.push({ content: p });
  }
  return out;
}
