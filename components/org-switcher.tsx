"use client";
import { useEffect, useState } from "react";

type OrgRow = { orgId: string; role: string; name?: string | null };

export default function OrgSwitcher() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/orgs", { cache: "no-store" });
        const data = await res.json();
        const rows = (data.orgs || []).map((r: any) => ({ orgId: r.orgId, role: r.role, name: r.name || null }));
        setOrgs(rows);
        setCurrent(data.currentOrgId || (rows[0]?.orgId ?? null));
      } catch {}
    })();
  }, []);

  async function handleSwitch(nextId: string) {
    if (nextId === "__new__") {
      const name = prompt("Name your new organisation:", "New Organisation");
      if (!name) return;
      setBusy(true);
      try {
        await fetch("/api/orgs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        window.location.reload();
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!nextId) return;
    setBusy(true);
    try {
      await fetch("/api/orgs/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: nextId }),
      });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={current ?? ""}
      onChange={(e) => handleSwitch(e.target.value)}
      disabled={busy}
      className="text-xs bg-white/10 text-blue-50 border border-blue-400/40 rounded-md px-2 py-1 outline-none hover:bg-white/15"
    >
      {orgs.map((o: any) => (
        <option key={o.orgId} value={o.orgId} className="text-black">
          {(o.name || "").toString().trim() || `${o.orgId.slice(0, 8)}…`} ({o.role})
        </option>
      ))}
      <option value="__new__" className="text-black">+ Create new…</option>
    </select>
  );
}


