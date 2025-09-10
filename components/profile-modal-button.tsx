"use client";
import { useEffect, useRef, useState } from "react";

export default function ProfileModalButton() {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const data = await res.json();
        setDisplayName(data?.displayName || "");
        setAvatarUrl(data?.avatarUrl || null);
      } catch {}
    })();
  }, [open]);

  async function handleUpload(file: File) {
    setBusy(true);
    try {
      const res = await fetch(`/api/uploads?filename=${encodeURIComponent(file.name)}`, { method: "POST", body: file });
      const { url } = await res.json();
      setAvatarUrl(url);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName, avatarUrl }) });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm w-full p-1.5 rounded-md hover:bg-zinc-100 text-zinc-700 text-left">Profile</button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-zinc-900/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-[min(92vw,520px)] rounded-xl border border-zinc-200 bg-white shadow-soft p-4">
              <div className="text-sm font-semibold text-zinc-800 mb-3">Your Profile</div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200">
                  {avatarUrl ? (<img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">No photo</div>)}
                </div>
                <div className="flex items-center gap-2">
                  <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                  <button className="text-xs rounded-md bg-brand text-white px-3 py-1.5" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
                </div>
              </div>
              <div className="mt-4">
                <label className="text-xs text-zinc-600">Display name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 w-full border border-zinc-200 rounded-md px-2 py-1 text-sm" />
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


