"use client";
import { useEffect, useState } from "react";

export default function CurrentOrgName() {
  const [label, setLabel] = useState<string>("");
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/orgs", { cache: "no-store" });
        const data = await res.json();
        const current = data.currentOrgId as string | null;
        const row = (data.orgs as any[]).find((o) => o.orgId === current);
        const name = (row?.name || "").toString().trim();
        setLabel(name || (current ? `${current.slice(0,8)}…` : ""));
      } catch {}
    })();
  }, []);
  if (!label) return null;
  return <div className="text-xs text-blue-50 font-medium">{label}</div>;
}


