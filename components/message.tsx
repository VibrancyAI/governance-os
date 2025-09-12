"use client";

import { motion } from "framer-motion";
import { BotIcon, UserIcon } from "./icons";
import { ReactNode, useMemo } from "react";
import { Markdown } from "./markdown";
import { ActionMessage } from "@/components/action-message";

export const Message = ({
  role,
  content,
  onAction,
  showActions = true,
}: {
  role: string;
  content: string | ReactNode;
  onAction?: (a: { type: string; slug?: string; text?: string }) => void;
  showActions?: boolean;
}) => {
  const isAssistant = role === "assistant";
  const raw = String(content || "");

  function sanitize(text: string): string {
    let out = text;
    out = out.replace(/```ui-json[\s\S]*?```/gi, "");
    out = out.replace(/```json[\s\S]*?```/gi, "");
    out = out.replace(/```ui-json[\s\S]*$/gi, "");
    out = out.replace(/```json[\s\S]*$/gi, "");
    out = out.replace(/```[\s\S]*?```/g, (block) => {
      const inner = block.replace(/^```[a-zA-Z-]*\n?/, "").replace(/```$/, "").trim();
      if (inner.startsWith("{") && (/"suggestedActions"/.test(inner) || /"view"/.test(inner))) return "";
      return block;
    });
    out = out.replace(/```[a-zA-Z-]*?[\s\S]*$/g, (block) => {
      const inner = block.replace(/^```[a-zA-Z-]*\n?/, "").trim();
      if (inner.startsWith("{") && inner.length < 50000) return "";
      return block;
    });
    out = out.replace(/(^|\n)\s*ui\s*\{[\s\S]*$/i, "");
    return out.trim();
  }

  const sanitized = useMemo(() => sanitize(raw), [raw]);
  const hasActions = useMemo(() => /```ui-json|"suggestedActions"/i.test(raw), [raw]);
  if (isAssistant && sanitized.length === 0 && !hasActions) {
    return null;
  }
  
  return (
    <motion.div
      className={`flex flex-row gap-4 px-4 w-full md:w-[600px] md:px-0 first-of-type:pt-8 mb-6`}
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.div 
        className={`size-8 flex flex-col justify-center items-center flex-shrink-0 rounded-full shadow-sm transition-all duration-200 ${
          isAssistant 
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white" 
            : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 border border-slate-300"
        }`}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.2 }}
      >
        {isAssistant ? <BotIcon /> : <UserIcon />}
      </motion.div>

      <div className="flex flex-col gap-2 w-full min-w-0">
        <motion.div
          className={`text-slate-800 text-sm leading-relaxed break-words rounded-2xl backdrop-blur-sm transition-all duration-200 ${
            isAssistant 
              ? "bg-white/80 border border-slate-200/60 shadow-sm p-4 hover:bg-white/90 hover:shadow-md" 
              : "bg-slate-50/80 border border-slate-200/60 shadow-sm p-4 hover:bg-slate-50/90"
          }`}
          initial={{ opacity: 0, scale: 0.98, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          {(() => {
            // Strip standalone markdown bullets to avoid stray lines between item cards
            const cleaned = sanitized.replace(/^\s*[-*]\s+.*$/gm, "").trim();
            return <Markdown>{cleaned}</Markdown>;
          })()}
          {isAssistant && onAction && showActions ? (
            <ActionMessage
              content={String(content || "")}
              onAction={(a) => onAction(a)}
            />
          ) : null}
        </motion.div>
      </div>
    </motion.div>
  );
};
