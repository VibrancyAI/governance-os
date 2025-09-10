"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/utils/functions";

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
  const docTextSrc = useMemo(() => {
    if (!name) return null;
    return `/api/files/text?name=${encodeURIComponent(name)}`;
  }, [name]);
  const docHtmlSrc = useMemo(() => {
    if (!name) return null;
    return `/api/files/html?name=${encodeURIComponent(name)}`;
  }, [name]);

  const [textContent, setTextContent] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [frameLoaded, setFrameLoaded] = useState<boolean>(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [docSourceUrl, setDocSourceUrl] = useState<string | null>(null);
  const [htmlFailed, setHtmlFailed] = useState<boolean>(false);
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
  const isPdf = ext === "pdf";
  const isCsv = ext === "csv";
  const isText = ["txt", "md", "log", "csv", "json"].includes(ext);

  const { data: assocRows, mutate: mutateAssoc } = useSWR<
    Array<{ labelSlug: string; fileName?: string; workingUrl?: string }>
  >(name ? "/api/files/associations" : null, fetcher, { fallbackData: [] });
  const currentAssoc = useMemo(
    () => (assocRows || []).find((r) => r.fileName === name),
    [assocRows, name],
  );
  const workingUrl = currentAssoc?.workingUrl;
  function normalizeFile(name: string): string {
    return name
      .toLowerCase()
      .replace(/\.[a-z0-9]{1,6}$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  function getWorkingColor(url?: string) {
    const lower = (url || "").toLowerCase();
    if (lower.includes("google.com/document") || lower.endsWith(".doc") || lower.endsWith(".docx")) return "bg-blue-600 hover:bg-blue-700";
    if (lower.includes("google.com/spreadsheets") || lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "bg-green-600 hover:bg-green-700";
    if (lower.includes("google.com/presentation") || lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "bg-amber-600 hover:bg-amber-700";
    return "bg-slate-600 hover:bg-slate-700";
  }

  useEffect(() => {
    setTextContent(null);
    setCsvRows(null);
    setError(null);
    setFrameLoaded(false);
    setDocSourceUrl(null);
    setHtmlFailed(false);
    if (!src) return;
    if (isCsv || (isText && !isPdf && !isImage)) {
      (async () => {
        try {
          setLoading(true);
          const res = await fetch(src, { cache: "no-store" });
          const t = await res.text();
          if (isCsv) {
            setCsvRows(parseCsv(t));
          }
          setTextContent(t);
        } catch (e) {
          setError("Failed to load file");
        } finally {
          setLoading(false);
        }
      })();
    } else if (ext === "docx" && (docHtmlSrc || docTextSrc)) {
      (async () => {
        try {
          setLoading(true);
          // Prefer HTML view for styling; fallback to plain text
          if (docHtmlSrc) {
            const res = await fetch(docHtmlSrc, { cache: "no-store" });
            if (!res.ok) throw new Error("html-failed");
            const html = await res.text();
            setTextContent(html);
          } else if (docTextSrc) {
            const res = await fetch(docTextSrc, { cache: "no-store" });
            const t = await res.text();
            setTextContent(t);
          }
        } catch (e) {
          setHtmlFailed(true);
          // try to fetch source URL for Office web viewer fallback
          try {
            const resp = await fetch(`/api/files/source?name=${encodeURIComponent(name || "")}`, { cache: "no-store" });
            if (resp.ok) {
              const { url } = await resp.json();
              if (url) setDocSourceUrl(url);
            }
          } catch {}
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [src, isCsv, isText, isPdf, isImage, ext, docTextSrc, docHtmlSrc]);

  if (!name) {
    return <div className="p-6 text-sm text-zinc-700">Missing file name</div>;
  }

  return (
    <div className="h-screen w-screen bg-zinc-50">
      <div className="h-12 flex items-center justify-between px-4 border-b border-zinc-200 bg-white">
        <div className="text-sm text-zinc-700 truncate">{name}</div>
        <div className="flex items-center gap-2">
          {workingUrl ? (
            <a
              href={workingUrl}
              target="_blank"
              rel="noreferrer"
              className={`text-xs font-medium text-white px-3 py-1.5 rounded-lg ${getWorkingColor(workingUrl)}`}
            >
              Open working doc
            </a>
          ) : null}
          <button
            className="text-xs rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50"
            onClick={() => {
              setLinkValue(workingUrl || "");
              setLinkOpen(true);
            }}
          >
            {workingUrl ? "Edit link" : "Link working doc"}
          </button>
        </div>
      </div>
      <div className="h-[calc(100vh-3rem)] w-full overflow-auto">
        {error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : loading ? (
          <div className="p-6">
            <div className="h-8 w-40 bg-zinc-200 rounded animate-pulse mb-3" />
            <div className="h-64 bg-white border border-zinc-200 rounded animate-pulse" />
          </div>
        ) : isImage && src ? (
          <div className="h-full w-full flex items-center justify-center p-4">
            {!frameLoaded && (
              <div className="absolute h-64 w-64 bg-white border border-zinc-200 rounded animate-pulse" />
            )}
            <img
              alt={name}
              src={src}
              className="max-w-full max-h-full rounded-lg border border-zinc-200 bg-white"
              onLoad={() => setFrameLoaded(true)}
            />
          </div>
        ) : isPdf && src ? (
          <div className="relative w-full h-full">
            {!frameLoaded && (
              <div className="absolute inset-4 bg-white border border-zinc-200 rounded animate-pulse" />
            )}
            <object data={src} type="application/pdf" className="w-full h-full">
              <iframe title={name} src={src} className="w-full h-full" onLoad={() => setFrameLoaded(true)} />
            </object>
          </div>
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
        ) : ext === "docx" ? (
          <div className="p-4 md:p-6">
            <div className="max-w-4xl mx-auto bg-white rounded-xl border border-zinc-200 shadow-soft">
              {textContent && textContent.trim().startsWith("<") ? (
                <div className="p-5 md:p-6">
                  <article className="prose prose-zinc max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: textContent }} />
                  </article>
                </div>
              ) : docSourceUrl ? (
                <div className="relative w-full h-[80vh]">
                  {!frameLoaded && (
                    <div className="absolute inset-4 bg-white border border-zinc-200 rounded animate-pulse" />
                  )}
                  <iframe
                    title={name || "doc"}
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(docSourceUrl)}`}
                    className="w-full h-full rounded-b-xl"
                    onLoad={() => setFrameLoaded(true)}
                  />
                </div>
              ) : textContent !== null ? (
                <div className="p-5 md:p-6 whitespace-pre-wrap text-[13px] leading-7 text-zinc-800">
                  {textContent}
                </div>
              ) : error ? (
                <div className="p-6 text-sm text-red-600">{error}</div>
              ) : null}
            </div>
          </div>
        ) : (isText) && textContent !== null ? (
          <div className="p-4 md:p-6">
            <div className="max-w-3xl mx-auto bg-white rounded-xl border border-zinc-200 shadow-soft">
              <div className="p-5 md:p-6 whitespace-pre-wrap text-[13px] leading-7 text-zinc-800">
                {ext === "json" ? (() => {
                  try {
                    return JSON.stringify(JSON.parse(textContent || ""), null, 2);
                  } catch {
                    return textContent;
                  }
                })() : textContent}
              </div>
            </div>
          </div>
        ) : src ? (
          <div className="relative w-full h-full">
            {!frameLoaded && (
              <div className="absolute inset-4 bg-white border border-zinc-200 rounded animate-pulse" />
            )}
            <iframe
              title={name}
              src={src}
              className="w-full h-full"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              onLoad={() => setFrameLoaded(true)}
            />
          </div>
        ) : null}
      </div>

      {linkOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-zinc-900/30" onClick={() => setLinkOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-[min(92vw,520px)] rounded-xl border border-zinc-200 bg-white shadow-soft p-4">
              <div className="text-sm font-medium text-zinc-800">Link working document</div>
              <input
                className="mt-3 w-full border border-zinc-200 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                placeholder="https://docs.google.com/... or https://..."
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                <button className="text-xs rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-50" onClick={() => setLinkOpen(false)}>Cancel</button>
                <button
                  className="text-xs rounded-md px-2 py-1 bg-brand text-white hover:bg-brand-700 disabled:opacity-50"
                  disabled={!/^https?:\/\//i.test(linkValue)}
                  onClick={async () => {
                    const labelSlug = currentAssoc?.labelSlug || (name ? normalizeFile(name) : "");
                    if (!labelSlug) return;
                    await fetch("/api/files/associations", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ labelSlug, workingUrl: linkValue }),
                    });
                    setLinkOpen(false);
                    mutateAssoc();
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


