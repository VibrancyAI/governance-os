"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function getExtension(filename: string | null): string {
  if (!filename) return "";
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx + 1).toLowerCase() : "";
}

function parseCsv(text: string): string[][] {
  // Minimal CSV parser supporting quotes and commas
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
  // flush last cell
  row.push(cur);
  rows.push(row);
  return rows;
}

export default function ViewerPage() {
  const params = useSearchParams();
  const name = params.get("name");
  const ext = getExtension(name);

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
    setTextContent(null);
    setCsvRows(null);
    setError(null);
    if (!src) return;
    if (isCsv || (isText && !isPdf && !isImage)) {
      (async () => {
        try {
          const res = await fetch(src, { cache: "no-store" });
          const t = await res.text();
          if (isCsv) {
            setCsvRows(parseCsv(t));
          }
          setTextContent(t);
        } catch (e) {
          setError("Failed to load file");
        }
      })();
    }
  }, [src, isCsv, isText, isPdf, isImage]);

  if (!name) {
    return <div className="p-6 text-sm text-zinc-700">Missing file name</div>;
  }

  return (
    <div className="h-screen w-screen bg-zinc-50">
      <div className="h-12 flex items-center px-4 border-b border-zinc-200 bg-white">
        <div className="text-sm text-zinc-700 truncate">{name}</div>
      </div>
      <div className="h-[calc(100vh-3rem)] w-full overflow-auto">
        {error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : isImage && src ? (
          <div className="h-full w-full flex items-center justify-center p-4">
            <img alt={name} src={src} className="max-w-full max-h-full rounded-lg border border-zinc-200 bg-white" />
          </div>
        ) : isPdf && src ? (
          <object data={src} type="application/pdf" className="w-full h-full">
            <iframe title={name} src={src} className="w-full h-full" />
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
            title={name}
            src={src}
            className="w-full h-full"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        ) : null}
      </div>
    </div>
  );
}


