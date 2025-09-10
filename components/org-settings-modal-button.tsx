"use client";
import { useEffect, useRef, useState } from "react";

export default function OrgSettingsModalButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // optional: could fetch current org name/logo via /api/orgs and current id cookie
  }, [open]);

  async function handleUpload(file: File) {
    setBusy(true);
    try {
      const res = await fetch(`/api/uploads?filename=${encodeURIComponent(file.name)}`, { method: "POST", body: file });
      const { url } = await res.json();
      setLogoUrl(url);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await fetch("/api/orgs/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name || undefined, logoUrl: logoUrl || undefined }) });
      setOpen(false);
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm w-full p-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 text-left">Org settings</button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-zinc-900/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-[min(92vw,520px)] rounded-xl border border-zinc-200 bg-white shadow-soft p-4">
              <div className="text-sm font-semibold text-zinc-800 mb-3">Organisation Settings</div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200">
                  {logoUrl ? (<img src={logoUrl} alt="logo" className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">No logo</div>)}
                </div>
                <div className="flex items-center gap-2">
                  <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                  <button className="text-xs rounded-md bg-brand text-white px-3 py-1.5" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? "Uploading…" : "Upload logo"}</button>
                </div>
              </div>
              <div className="mt-4">
                <label className="text-xs text-zinc-600">Organisation name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border border-zinc-200 rounded-md px-2 py-1 text-sm" />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button className="text-xs rounded-md border border-zinc-200 px-2 py-1" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
                <button className="text-xs rounded-md bg-blue-600 text-white px-3 py-1.5" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


