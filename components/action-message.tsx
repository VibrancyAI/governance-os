"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { dataRoomStructure, slugify } from "@/components/data-room-structure";
import { DataRoomItem } from "@/components/data-room";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/utils/functions";

export function ActionMessage({ content, onAction }: { content: string; onAction: (a: { type: string; slug?: string; text?: string }) => void; }) {
  // Extract ui-json from a single assistant message and render inline actions
  const { actions, startOptions } = useMemo(() => {
    const match = content?.match(/```ui-json[\s\S]*?```/i) || content?.match(/```[\s\S]*?```/);
    if (!match) return { actions: [] as Array<any>, startOptions: [] as Array<any> };
    try {
      const code = match[0].replace(/^```ui-json\n?/i, "").replace(/^```\n?/, "").replace(/```$/, "");
      const parsed = JSON.parse(code);
      const rawActions = Array.isArray(parsed?.view?.suggestedActions) ? parsed.view.suggestedActions : [];
      const rawOptions = Array.isArray(parsed?.view?.startOptions) ? parsed.view.startOptions : [];
      const seen = new Set<string>();
      const dedup = (arr: Array<any>) => arr.filter((a) => {
        const key = `${a.type || ""}:${(a.slug || "").toLowerCase()}:${(a.title || a.text || "").toLowerCase()}`;
        if (seen.has(key)) return false; seen.add(key); return true;
      });
      return { actions: dedup(rawActions), startOptions: dedup(rawOptions) };
    } catch {
      return { actions: [] as Array<any>, startOptions: [] as Array<any> };
    }
  }, [content]);

  const sanitizedText = useMemo(() => {
    return String(content || "")
      .replace(/```ui-json[\s\S]*?```/gi, "")
      .replace(/```json[\s\S]*?```/gi, "")
      .trim();
  }, [content]);

  function slugToLabel(slug: string): string {
    for (const section of dataRoomStructure) {
      for (const d of section.documents) {
        if (slugify(d) === slug) return d;
      }
    }
    return slug.replace(/-/g, " ");
  }

  const known = useMemo(() => {
    return dataRoomStructure.flatMap((s) => s.documents.map((d) => ({ label: d, slug: slugify(d) })));
  }, []);

  function normalizeText(t?: string): string {
    return (t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function resolveSlugFromAction(a: { type: string; slug?: string; title?: string; text?: string }): string | undefined {
    const candidate = (a.slug || "").toLowerCase();
    if (known.some((k) => k.slug === candidate)) return candidate;
    const hay = normalizeText(a.title) + " " + normalizeText(a.text) + " " + normalizeText(a.slug);
    let best: { slug: string; score: number } | null = null;
    for (const k of known) {
      const label = normalizeText(k.label);
      // simple token overlap score
      const tokens = Array.from(new Set(label.split(" ").filter((w) => w.length >= 3)));
      let score = 0;
      for (const tok of tokens) if (hay.includes(tok)) score += 1;
      if (score > 0 && (!best || score > best.score)) best = { slug: k.slug, score };
    }
    return best?.slug;
  }

  const needsFallbackText = sanitizedText.length < 8;

  // Collate unique item slugs from actions (upload/assign) so each item renders once
  const itemSlugs = useMemo(() => {
    const out = new Set<string>();
    for (const a of actions) {
      if (a?.type !== "upload" && a?.type !== "assign") continue;
      const s = a?.type === "assign" ? resolveSlugFromAction(a) : a?.slug;
      if (s) out.add(String(s).toLowerCase());
    }
    return Array.from(out);
  }, [actions]);

  const [assignSlug, setAssignSlug] = useState<string | null>(null);
  const { data: members = [] } = useSWR<Array<{ orgId: string; userEmail: string; role: string }>>(
    assignSlug ? "/api/orgs/members" : null,
    fetcher,
    { fallbackData: [] }
  );
  const emails = Array.from(new Set(members.map((m) => m.userEmail)));
  const { data: profiles = [] } = useSWR<Array<{ email: string; displayName?: string; avatarUrl?: string }>>(
    assignSlug && emails.length > 0 ? `/api/profiles?emails=${encodeURIComponent(emails.join(","))}` : null,
    fetcher,
    { fallbackData: [] }
  );
  const profileByEmail: Record<string, { displayName?: string; avatarUrl?: string }> = {};
  for (const p of profiles) profileByEmail[p.email] = { displayName: (p as any).displayName, avatarUrl: (p as any).avatarUrl } as any;
  const { data: assignments = [] } = useSWR<Array<{ orgId: string; labelSlug: string; assigneeEmail?: string }>>(
    assignSlug ? "/api/tasks/assignments" : null,
    fetcher,
    { fallbackData: [] }
  );
  const { mutate } = useSWRConfig();
  const initiallyAssigned = new Set(
    (assignments || [])
      .filter((a) => a.labelSlug === assignSlug && a.assigneeEmail)
      .map((a) => a.assigneeEmail as string),
  );
  const [selected, setSelected] = useState<Set<string>>(initiallyAssigned);

  return (
    <div className="my-2 space-y-2">
      {/* Only render concrete items; no start-cards, no extra prose here */}

      {/* Render one item per unique slug (prevents duplicates across upload/assign) */}
      <ul className="list-none p-0 m-0 space-y-2">
        {itemSlugs.length === 0 ? null : itemSlugs.map((slug, i) => (
          <motion.li key={slug} className="list-none" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
            <DataRoomItem
              label={slugToLabel(slug)}
              isUploaded={false}
              uploadKey={`chat__${slug}`}
              onUploaded={() => { /* cards update via server association; chat does not need local state */ }}
              attachedName={undefined}
              attachedUrl={undefined}
              hidden={false}
              onToggleHidden={() => {}}
              onRemoveCustom={() => {}}
              isCustom={false}
              onRefetch={() => {}}
              onAssocChanged={() => {}}
              assignedEmails={[]}
              onAssign={async (email) => {
                await fetch("/api/tasks/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labelSlug: slug, assigneeEmail: email }) });
              }}
              onUnassign={async (email) => {
                await fetch(`/api/tasks/assignments?labelSlug=${encodeURIComponent(slug)}&assigneeEmail=${encodeURIComponent(email)}`, { method: "DELETE" });
              }}
              members={[]}
              profilesByEmail={{}}
            />
          </motion.li>
        ))}
      </ul>

      {/* Inline assign selector */}
      {assignSlug && (
        <div className="border border-slate-200 rounded-lg p-3 bg-white/90">
          <div className="text-xs font-medium text-slate-600 mb-2">Assign to</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {emails.map((email) => {
              const p = profileByEmail[email] || {} as any;
              const label = p.displayName || email.split("@")[0];
              const initials = label.split(/[\s._-]/).filter(Boolean).slice(0,2).map((s: string) => s[0]?.toUpperCase() || "").join("") || label.slice(0,2).toUpperCase();
              return (
                <button
                  key={email}
                  onClick={() => {
                    const next = new Set(selected);
                    if (next.has(email)) next.delete(email); else next.add(email);
                    setSelected(next);
                  }}
                  className={`flex items-center gap-2 text-left border rounded-md px-2 py-1.5 transition-colors ${selected.has(email) ? "border-blue-300 bg-blue-50/50" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[10px] font-semibold text-slate-700">
                    {p.avatarUrl ? (<img src={p.avatarUrl} alt={label} className="w-full h-full object-cover" />) : initials}
                  </div>
                  <div className="text-xs text-slate-700 truncate">{label}</div>
                  <div className="text-[10px] text-slate-400 truncate">{email}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button className="text-xs text-slate-500 hover:text-slate-700" onClick={() => setAssignSlug(null)}>Cancel</button>
            <button
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={selected.size === 0 && initiallyAssigned.size === 0}
              onClick={async () => {
                if (!assignSlug) return;
                const toAdd: string[] = [];
                const toRemove: string[] = [];
                const current = new Set(initiallyAssigned);
                for (const email of selected) if (!current.has(email)) toAdd.push(email);
                for (const email of current) if (!selected.has(email)) toRemove.push(email);
                try {
                  await Promise.all([
                    ...toAdd.map((email) => fetch("/api/tasks/assignments", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ labelSlug: assignSlug, assigneeEmail: email }),
                    })),
                    ...toRemove.map((email) => fetch(`/api/tasks/assignments?labelSlug=${encodeURIComponent(assignSlug)}&assigneeEmail=${encodeURIComponent(email)}`, { method: "DELETE" })),
                  ]);
                  mutate("/api/tasks/assignments");
                } finally {
                  setAssignSlug(null);
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


