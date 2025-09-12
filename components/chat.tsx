"use client";

import { Message } from "ai";
import { useChat } from "ai/react";
import { useEffect, useState, useMemo } from "react";
import { Files } from "@/components/files";
import { AnimatePresence, motion } from "framer-motion";
import { FileIcon } from "@/components/icons";
import { Message as PreviewMessage } from "@/components/message";
import { ThinkingIndicator } from "@/components/thinking-indicator";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { Session } from "next-auth";
import useSWR from "swr";
import { fetcher } from "@/utils/functions";
// Inline action rows are rendered inside each assistant message via ActionMessage
import { UploadModal } from "@/components/upload-modal";
import { dataRoomStructure, slugify } from "@/components/data-room-structure";

const suggestionsByPerspective: Record<string, { label: string; action: string }[]> = {
  founder: [
    { label: "Audit my data room for investor readiness", action: "Audit our data room for investor readiness. List missing or weak items and a priority plan to fix them." },
    { label: "Draft use of proceeds and milestones", action: "Based on our docs, draft a clear use of proceeds and milestone plan for a Seed/Series A." },
    { label: "Tighten narrative (problem/solution/market)", action: "Write a crisp problem/solution/market narrative using our materials; call out gaps to address." },
  ],
  investor_diligence: [
    { label: "Diligence: what's missing and key risks?", action: "Perform investor diligence. List missing data room materials, key risks, red flags, and questions for founders." },
    { label: "Unit economics + retention review", action: "Evaluate unit economics and retention from our docs; note assumptions and what needs more evidence." },
    { label: "Competitor and moat check", action: "Summarize competition and our differentiation; indicate what's needed to substantiate a moat." },
  ],
  acquirer_mna: [
    { label: "M&A readiness: missing items and risks", action: "Assess M&A readiness. List missing materials (contracts, IP, security), integration risks, and deal blockers." },
    { label: "Synergies and integration outline", action: "From our docs, draft likely synergies and an initial integration outline; call out info gaps." },
    { label: "Revenue quality and churn review", action: "Review revenue quality and churn from available docs; list missing evidence and buyer questions." },
  ],
};

function stripUiJsonBlocks(text: string): string {
  if (!text) return text;
  return text.replace(/```ui-json[\s\S]*?```/gi, "").replace(/```json[\s\S]*?```/gi, "").trim();
}

export function Chat({
  id,
  initialMessages,
  session,
  isWidget = false,
  onMessagesChange,
}: {
  id: string;
  initialMessages: Array<Message>;
  session: Session | null;
  isWidget?: boolean;
  onMessagesChange?: (messages: Array<Message>) => void;
}) {
  const [selectedFilePathnames, setSelectedFilePathnames] = useState<
    Array<string>
  >([]);
  const [isFilesVisible, setIsFilesVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [perspective, setPerspective] = useState<
    "founder" | "investor_diligence" | "acquirer_mna"
  >("founder");
  const [hasUserDeselected, setHasUserDeselected] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [chatUploadSlug, setChatUploadSlug] = useState<string | null>(null);

  function slugToLabel(slug: string): string {
    for (const section of dataRoomStructure) {
      for (const d of section.documents) {
        if (slugify(d) === slug) return d;
      }
    }
    return slug.replace(/-/g, " ");
  }

  useEffect(() => {
    if (isMounted !== false && session && session.user) {
      localStorage.setItem(
        `${session.user.email}/selected-file-pathnames`,
        JSON.stringify(selectedFilePathnames),
      );
    }
  }, [selectedFilePathnames, isMounted, session]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (session && session.user) {
      // load user deselection preference
      try {
        const flag = localStorage.getItem(
          `${session.user.email}/has-user-deselected`,
        );
        setHasUserDeselected(flag === "true");
      } catch {}

      setSelectedFilePathnames(
        JSON.parse(
          localStorage.getItem(
            `${session.user.email}/selected-file-pathnames`,
          ) || "[]",
        ),
      );
    }
  }, [session]);

  // Auto-open the file selector once per chat for visibility before passing files
  useEffect(() => {
    if (!isMounted || !session || !session.user) return;
    try {
      const key = `${session.user.email}/chat/${id}/opened-files-modal`;
      if (!localStorage.getItem(key)) {
        setIsFilesVisible(true);
        localStorage.setItem(key, "true");
      }
    } catch {}
  }, [isMounted, session, id]);

  // Load all files and default-select them if nothing selected yet
  const { data: allFiles } = useSWR<Array<{ pathname: string }>>(
    session ? "api/files/list" : null,
    fetcher,
    { fallbackData: [] },
  );

  useEffect(() => {
    if (
      isMounted &&
      session &&
      session.user &&
      allFiles &&
      allFiles.length > 0 &&
      !hasUserDeselected
    ) {
      // Default: select all uploaded files until the user deselects something
      const uploaded = allFiles.map((f) => f.pathname);
      setSelectedFilePathnames(uploaded);
    }
  }, [isMounted, session, allFiles, hasUserDeselected]);

  const { messages, handleSubmit, input, setInput, append, isLoading } = useChat({
    body: { id, selectedFilePathnames, perspective },
    initialMessages,
    onFinish: () => {
      if (!isWidget) {
        window.history.replaceState({}, "", `/${id}`);
      }
    },
  });

  useEffect(() => {
    if (onMessagesChange) onMessagesChange(messages);
  }, [messages, onMessagesChange]);

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const lastAssistantText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return String(messages[i].content || "");
    }
    return undefined;
  }, [messages]);

  // If assistant didn't provide ui-json, synthesize next steps from uploaded/not uploaded items
  // by reading /api/files/list and data room structure. This keeps action cards useful even with plain text.
  // We compute a simple heuristic list here (client-side only, no extra DB calls).

  return (
    <div className={`flex flex-col h-full ${isWidget ? "pb-4" : "pb-0"} bg-gradient-to-br from-slate-50 via-white to-blue-50/30`}>
      {/* Header with perspective selector */}
      <motion.div 
        className={`flex-shrink-0 border-b border-slate-200/50 bg-white/70 backdrop-blur-sm ${isWidget ? "px-3 py-3" : "px-6 py-4"}`}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100/80 backdrop-blur-sm border border-slate-200/60 p-1.5 shadow-sm">
            {[
              { key: "founder", label: "Founder", color: "from-blue-500 to-blue-600", icon: "🚀" },
              { key: "investor_diligence", label: "Investor", color: "from-emerald-500 to-emerald-600", icon: "💼" },
              { key: "acquirer_mna", label: "Acquirer", color: "from-purple-500 to-purple-600", icon: "🏢" },
            ].map((p) => (
              <motion.button
                key={p.key}
                onClick={() => setPerspective(p.key as any)}
                type="button"
                className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  perspective === p.key
                    ? `text-white shadow-md`
                    : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {perspective === p.key && (
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-r ${p.color} rounded-lg`}
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 text-xs">{p.icon}</span>
                <span className="relative z-10">{p.label}</span>
              </motion.button>
            ))}
          </div>
          
          <div />
        </div>
      </motion.div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 flex justify-center overflow-hidden">
          <div className={`w-full max-w-4xl flex flex-col ${isWidget ? "px-3" : "px-6"}`}>

            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
            >
              {messages.length === 0 && (
                <motion.div 
                  className="space-y-6 py-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">
                      AI Data Room Advisor
                    </h2>
                    <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
                      Get expert guidance on your data room readiness. I&apos;ll analyze your documents, identify gaps, and provide actionable recommendations.
                    </p>
                  </motion.div>
                  
                  <motion.div
                    className="grid gap-3 max-w-2xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                  >
                    <h3 className="text-sm font-semibold text-slate-700 text-center mb-2">
                      Popular {perspective === "founder" ? "founder" : perspective === "investor_diligence" ? "investor" : "M&A"} questions
                    </h3>
                    {(suggestionsByPerspective[perspective] || []).map((suggestedAction, index) => (
                      <motion.button
                        key={index}
                        onClick={() => append({ role: "user", content: suggestedAction.action })}
                        className="text-left border border-slate-200 rounded-xl p-4 bg-white/60 hover:bg-white hover:shadow-md hover:border-blue-300 transition-all duration-200 group"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.1, duration: 0.3 }}
                        whileHover={{ scale: 1.01, x: 4 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mt-2.5 group-hover:bg-blue-500 transition-colors" />
                          <div className="flex-1">
                            <span className="font-medium text-slate-800 group-hover:text-blue-700 transition-colors block">
                              {suggestedAction.label}
                            </span>
                            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                              {suggestedAction.action.length > 80 
                                ? suggestedAction.action.substring(0, 80) + "..." 
                                : suggestedAction.action
                              }
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                </motion.div>
              )}

              {messages.map((message, index) => (
                <motion.div
                  key={`${id}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <PreviewMessage
                    role={message.role}
                    content={String(message.content || "")}
                    showActions={message.role === "assistant" && (index !== messages.length - 1 || !isLoading)}
                    onAction={(a: any) => {
                      if (a?.type === "upload" && a?.slug) {
                        setChatUploadSlug(a.slug);
                      } else if (a?.type === "assign" && a?.slug) {
                        setShowInsights(true);
                      } else if (a?.type === "generate" && a?.slug) {
                        append({ role: "user", content: `Generate a high-quality template for ${a.slug}.` });
                      } else if (a?.type === "question" && a?.text) {
                        append({ role: "user", content: a.text });
                      }
                    }}
                  />
                </motion.div>
              ))}

              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ThinkingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Action cards - shown with delay after response */}
            {/* No separate ActionCards block. Actions render inline inside assistant messages. */}
          </div>
        </div>

        {/* Insights panel removed as per request */}

        {/* Input area */}
        <motion.div
          className={`border-t border-slate-200/50 bg-white/70 backdrop-blur-sm ${isWidget ? "p-3" : "p-6"}`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <form
            className="flex gap-3 items-end max-w-4xl mx-auto"
            onSubmit={handleSubmit}
          >
            <div className="flex-1 relative">
              <motion.input
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-12 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-sm resize-none"
                placeholder="Ask me anything about your data room..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                whileFocus={{ scale: 1.005 }}
                transition={{ duration: 0.2 }}
              />
              
              <AnimatePresence>
                {input && !isLoading && (
                  <motion.button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Send
                  </motion.button>
                )}
              </AnimatePresence>
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
                </div>
              )}
            </div>

            <motion.button
              type="button"
              onClick={() => setIsFilesVisible(true)}
              className="relative bg-white border border-slate-200 rounded-xl w-12 h-12 flex items-center justify-center text-slate-600 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/50 transition-all shadow-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FileIcon />
              {selectedFilePathnames?.length > 0 && (
                <motion.div
                  className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium border-2 border-white"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  {selectedFilePathnames.length}
                </motion.div>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>

      <AnimatePresence>
        {isFilesVisible && (
          <Files
            setIsFilesVisible={setIsFilesVisible}
            selectedFilePathnames={selectedFilePathnames}
            setSelectedFilePathnames={setSelectedFilePathnames}
            hasUserDeselected={hasUserDeselected}
            onUserDeselected={() => {
              if (!hasUserDeselected) {
                setHasUserDeselected(true);
                if (session && session.user) {
                  try {
                    localStorage.setItem(
                      `${session.user.email}/has-user-deselected`,
                      "true",
                    );
                  } catch {}
                }
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Shared upload modal for chat-triggered actions (single instance) */}
      {Boolean(chatUploadSlug) && (
        <UploadModal
          open={true}
          targetLabel={slugToLabel(chatUploadSlug || "")}
          onClose={() => setChatUploadSlug(null)}
          onUploaded={async (fileName) => {
            try {
              await fetch("/api/files/associations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ labelSlug: chatUploadSlug, fileName }),
              });
            } finally {
              setChatUploadSlug(null);
            }
          }}
          onRefetch={() => { /* chat doesn't manage list state; no-op */ }}
        />
      )}
    </div>
  );
}
