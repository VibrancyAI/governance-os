"use client";

import { useMemo, useState } from "react";
import { dataRoomStructure, slugify } from "@/components/data-room-structure";
import { motion } from "framer-motion";

type UIJson = {
  view?: {
    summary?: string;
    suggestedActions?: Array<{ type: string; slug?: string; title?: string; text?: string }>;
    startCards?: Array<{ category: string; items: string[] }>;
  };
};

// local slugify removed; use the shared one from data-room-structure

export function ActionCards({ lastAssistantText, onUpload, onAssign, onGenerate, onAsk, disableFallback = false }: {
  lastAssistantText?: string;
  onUpload?: (slug: string) => void;
  onAssign?: (slug: string) => void;
  onGenerate?: (slug: string) => void;
  onAsk?: (text: string) => void;
  disableFallback?: boolean;
}) {
  const [uploadSlug, setUploadSlug] = useState<string | null>(null);
  const ui = useMemo<UIJson | null>(() => {
    // Try to parse ui-json from assistant text
    if (lastAssistantText) {
      const match = lastAssistantText.match(/```ui-json[\s\S]*?```/i) || lastAssistantText.match(/```[\s\S]*?```/);
      if (match) {
        const code = match[0].replace(/^```ui-json\n?/i, "").replace(/^```\n?/, "").replace(/```$/, "");
        try {
          return JSON.parse(code);
        } catch {}
      }
    }
    // Fallback UI when none provided: show category start cards and a few actions
    if (disableFallback) return null;
    const startCards = dataRoomStructure.slice(0, 6).map((c) => ({
      category: c.category,
      items: c.documents.slice(0, 4),
    }));
    const first = startCards[0]?.items?.[0];
    const firstSlug = first ? slugify(first) : undefined;
    return {
      view: {
        summary: "Let’s pick a place to start. Choose a category or action below.",
        startCards,
        suggestedActions: (
          firstSlug
            ? [
                { type: "upload", slug: firstSlug, title: `Upload evidence for ${firstSlug}` },
                { type: "generate", slug: firstSlug, title: `Generate template for ${firstSlug}` },
                { type: "question", text: "What should we prioritize first?" },
              ]
            : [{ type: "question", text: "What should we prioritize first?" }]
        ) as any,
      },
    };
  }, [lastAssistantText, disableFallback]);

  if (!ui?.view) return null;
  const v = ui.view;

  function slugToLabel(slug: string): string {
    for (const section of dataRoomStructure) {
      for (const d of section.documents) {
        if (slugify(d) === slug) return d;
      }
    }
    return slug.replace(/-/g, " ");
  }

  return (
    <div className="w-full max-w-[900px] mx-auto px-4 md:px-0">
      {v.summary && (
        <div className="mb-2 text-sm text-slate-600">{v.summary}</div>
      )}

      {/* Full-width actionable rows */}
      <div className="space-y-2">
        {(v.suggestedActions || []).map((a, i) => (
          <motion.button
            key={i}
            className="w-full text-left border border-slate-200 rounded-lg bg-white/90 p-3 hover:bg-white hover:shadow-sm transition-all"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => {
              if (a.type === "upload" && a.slug) {
                setUploadSlug(a.slug);
                onUpload?.(a.slug);
              } else if (a.type === "assign" && a.slug) onAssign?.(a.slug);
              else if (a.type === "generate" && a.slug) onGenerate?.(a.slug);
              else if (a.type === "question" && a.text) onAsk?.(a.text);
            }}
          >
            <div className="text-sm font-semibold text-slate-800">
              {a.title || a.text || slugToLabel(a.slug || "")}
            </div>
            <div className="text-xs text-slate-500 mt-1">{a.type}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
