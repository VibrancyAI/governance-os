"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function getExtension(filename: string | null): string {
  if (!filename) return "";
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx + 1).toLowerCase() : "";
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cur);
        cur = "";
      } else if (ch === "\n") {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else if (ch === "\r") {
        // ignore
      } else {
        cur += ch;
      }
    }
  }
  row.push(cur);
  rows.push(row);
  return rows;
}

export function FileViewerOverlay() {
  const params = useSearchParams();
  const router = useRouter();
  const name = params.get("name");
  const ext = getExtension(name);
  const open = Boolean(name);

  const src = useMemo(() => {
    if (!name) return null;
    return `/api/files/inline?name=${encodeURIComponent(name)}`;
  }, [name]);

  const [textContent, setTextContent] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
  const isPdf = ext === "pdf";
  const isCsv = ext === "csv";
  const isText = ["txt", "md", "log", "csv", "json"].includes(ext);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, router]);

  useEffect(() => {
    setTextContent(null);
    setCsvRows(null);
    setError(null);
    if (!src) return;
    if (isCsv || (isText && !isPdf && !isImage)) {
      (async () => {
        try {
          const res = await fetch(src, { cache: "no-store" });
          const t = await res.text();
          if (isCsv) setCsvRows(parseCsv(t));
          setTextContent(t);
        } catch (e) {
          setError("Failed to load file");
        }
      })();
    }
  }, [src, isCsv, isText, isPdf, isImage]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-zinc-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => router.back()}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-stretch justify-stretch"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <motion.div className="m-0 h-full w-full bg-zinc-50 shadow-2xl">
              <div className="h-12 flex items-center justify-between px-4 border-b border-zinc-200 bg-white">
                <button
                  className="px-3 py-1.5 text-xs rounded-md border border-zinc-200 hover:bg-zinc-50"
                  onClick={() => router.back()}
                >
                  Back
                </button>
                <div className="text-sm text-zinc-700 truncate max-w-[70%]">{name}</div>
                <div />
              </div>
              <div className="h-[calc(100vh-3rem)] w-full overflow-auto">
                {error ? (
                  <div className="p-6 text-sm text-red-600">{error}</div>
                ) : isImage && src ? (
                  <div className="h-full w-full flex items-center justify-center p-4">
                    <img alt={name || "image"} src={src} className="max-w-full max-h-full rounded-lg border border-zinc-200 bg-white" />
                  </div>
                ) : isPdf && src ? (
                  <object data={src} type="application/pdf" className="w-full h-full">
                    <iframe title={name || "pdf"} src={src} className="w-full h-full" />
                  </object>
                ) : isCsv && csvRows ? (
                  <div className="p-4">
                    <div className="overflow-auto border border-zinc-200 rounded-md bg-white">
                      <table className="min-w-full text-xs">
                        <tbody>
                          {csvRows.map((r, i) => (
                            <tr key={i} className={i === 0 ? "bg-zinc-50" : undefined}>
                              {r.map((c, j) => (
                                <td key={j} className="px-3 py-2 border-b border-zinc-100 whitespace-pre-wrap align-top">
                                  {c}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : isText && textContent !== null ? (
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap text-xs bg-white rounded-md p-4 border border-zinc-200 overflow-auto">
                      {ext === "json" ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(textContent || ""), null, 2);
                        } catch {
                          return textContent;
                        }
                      })() : textContent}
                    </pre>
                  </div>
                ) : src ? (
                  <iframe
                    title={name || "file"}
                    src={src}
                    className="w-full h-full"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


