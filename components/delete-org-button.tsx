"use client";
import { useState } from "react";

export default function DeleteOrgButton({ currentOrgId, userEmail }: { currentOrgId: string | null; userEmail: string | null }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  if (!currentOrgId || !userEmail) return null;

  return (
    <>
      <button className="text-xs rounded-md bg-white/10 text-red-100 hover:bg-white/20 border border-red-400/40 px-2 py-1" onClick={() => setOpen(true)}>Delete org</button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-zinc-900/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-[min(92vw,480px)] rounded-xl border border-zinc-200 bg-white shadow-soft p-4">
              <div className="text-sm font-semibold text-zinc-800">Delete organisation</div>
              <div className="text-xs text-zinc-600 mt-1">Type <span className="px-1 font-mono text-red-600">DELETE</span> to confirm. This will permanently remove files, embeddings, invites, memberships for this org.</div>
              <input value={text} onChange={(e) => setText(e.target.value)} className="mt-3 w-full border border-zinc-200 rounded-md px-2 py-1 text-sm" placeholder="DELETE" />
              <div className="mt-3 flex items-center justify-end gap-2">
                <button className="text-xs rounded-md border border-zinc-200 px-2 py-1" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
                <button
                  className="text-xs rounded-md bg-red-600 text-white px-3 py-1.5 disabled:opacity-50"
                  disabled={busy || text !== "DELETE"}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await fetch("/api/orgs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId: currentOrgId }) });
                      window.location.href = "/";
                    } finally {
                      setBusy(false);
                    }
                  }}
                >{busy ? "Deleting…" : "Delete"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


