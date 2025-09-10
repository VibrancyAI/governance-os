"use client";
import { useEffect, useRef, useState } from "react";

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        const data = await res.json();
        if (data?.displayName) setDisplayName(data.displayName);
        if (data?.avatarUrl) setAvatarUrl(data.avatarUrl);
      } catch {}
    })();
  }, []);

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
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, avatarUrl }),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 md:px-8 pt-20">
      <div className="max-w-xl bg-white rounded-xl border border-zinc-200 shadow-soft p-4">
        <div className="text-sm font-semibold text-zinc-800 mb-3">Your Profile</div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">No photo</div>
            )}
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
        <div className="mt-4 flex justify-end">
          <button className="text-xs rounded-md bg-blue-600 text-white px-3 py-1.5" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}


