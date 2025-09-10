"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function InviteDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"operator" | "owner">("operator");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <>
      <button
        className="text-xs rounded-md bg-white/10 text-blue-50 hover:bg-white/20 border border-blue-400/40 px-2 py-1"
        onClick={() => setOpen(true)}
      >
        Invite
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 bg-zinc-900/30 z-40" onClick={() => setOpen(false)} />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <div className="w-[min(92vw,420px)] rounded-xl border border-zinc-200 bg-white shadow-soft p-4">
                <div className="text-sm font-medium text-zinc-800">Invite teammate</div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="mt-3 w-full border border-zinc-200 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                />
                <div className="mt-2">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full border border-zinc-200 rounded-md px-2 py-1 text-sm"
                  >
                    <option value="operator">Operator (files only)</option>
                    <option value="owner">Owner (full access)</option>
                  </select>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button className="text-xs rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-50" onClick={() => setOpen(false)}>Cancel</button>
                  <button
                    className="text-xs rounded-md px-2 py-1 bg-brand text-white hover:bg-brand-700 disabled:opacity-50"
                    disabled={busy || !/^[^@]+@[^@]+\.[^@]+$/.test(email)}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const res = await fetch("/api/orgs/invite", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email, role }),
                        });
                        if (res.ok) setSent(true);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? "Sending…" : sent ? "Sent" : "Send Invite"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}


