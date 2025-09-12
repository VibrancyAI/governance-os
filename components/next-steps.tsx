"use client";

import useSWR from "swr";
import { fetcher } from "@/utils/functions";
import { useMemo, useState } from "react";

export function NextSteps({ perspective = "founder" as "founder" | "investor_diligence" | "acquirer_mna", onUploadClick }: { perspective?: "founder" | "investor_diligence" | "acquirer_mna"; onUploadClick?: () => void }) {
  const { data } = useSWR<{ topGaps: Array<{ slug: string; reasons: string[] }> }>(`/api/coverage?perspective=${perspective}`, fetcher, { fallbackData: { topGaps: [] } });
  const { data: members } = useSWR<Array<{ orgId: string; userEmail: string; role: string }>>("/api/orgs/members", fetcher, { fallbackData: [] });

  const [assigningSlug, setAssigningSlug] = useState<string | null>(null);
  const emails = useMemo(() => (members || []).map((m) => m.userEmail), [members]);

  if (!data?.topGaps || data.topGaps.length === 0) return null;

  return (
    <div className="w-full max-w-[900px] mx-auto px-4 md:px-0">
      <div className="mb-2 text-sm text-slate-500">Next steps</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.topGaps.slice(0, 6).map((g) => (
          <div key={g.slug} className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-800">{g.slug}</div>
            {g.reasons?.[0] && (
              <div className="text-xs text-slate-500 mt-1">{g.reasons[0]}</div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button
                className="text-xs rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                onClick={() => onUploadClick?.()}
              >
                Upload evidence
              </button>
              <div className="relative">
                {assigningSlug === g.slug ? (
                  <select
                    className="text-xs rounded-md border border-slate-200 px-2 py-1.5 text-slate-700 bg-white"
                    defaultValue=""
                    onChange={async (e) => {
                      const email = e.target.value;
                      if (!email) return;
                      await fetch("/api/tasks/assignments", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ labelSlug: g.slug, assigneeEmail: email }),
                      });
                      setAssigningSlug(null);
                    }}
                  >
                    <option value="" disabled>Assign to…</option>
                    {emails.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    className="text-xs rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                    onClick={() => setAssigningSlug(g.slug)}
                  >
                    Assign owner
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
