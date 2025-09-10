"use client";

import { Message } from "ai";
import { useChat } from "ai/react";
import { useEffect, useState } from "react";
import { Files } from "@/components/files";
import { AnimatePresence, motion } from "framer-motion";
import { FileIcon } from "@/components/icons";
import { Message as PreviewMessage } from "@/components/message";
import { ThinkingIndicator } from "@/components/thinking-indicator";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { Session } from "next-auth";
import useSWR from "swr";
import { fetcher } from "@/utils/functions";

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

export function Chat({
  id,
  initialMessages,
  session,
  isWidget = false,
}: {
  id: string;
  initialMessages: Array<Message>;
  session: Session | null;
  isWidget?: boolean;
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

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  return (
    <div className={`flex flex-row justify-center ${isWidget ? "pb-4 h-full" : "pb-24 h-dvh"} bg-gradient-to-br from-slate-50 via-white to-blue-50/30`}>
      <div className={`flex flex-col justify-between items-center ${isWidget ? "w-full gap-3" : "gap-6"}`}>
        {/* Perspective selector */}
        <motion.div 
          className={`w-full ${isWidget ? "max-w-[680px] px-3 pt-3" : "md:max-w-[600px] px-4 md:px-0 pt-6"}`}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100/80 backdrop-blur-sm border border-slate-200/60 p-1.5 shadow-sm">
            {[
              { key: "founder", label: "Founder", color: " from-blue-500 to-blue-600" },
              { key: "investor_diligence", label: "Investor", color: "from-emerald-500 to-emerald-600" },
              { key: "acquirer_mna", label: "Acquirer", color: "from-purple-500 to-purple-600" },
            ].map((p) => (
              <motion.button
                key={p.key}
                onClick={() => setPerspective(p.key as any)}
                type="button"
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
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
                <span className="relative z-10">{p.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
        <div
          ref={messagesContainerRef}
          className={`flex flex-col gap-2 h-full ${isWidget ? "w-full px-3" : "w-dvw px-4"} items-center overflow-y-scroll scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent`}
        >
          {messages.map((message, index) => (
            <PreviewMessage
              key={`${id}-${index}`}
              role={message.role}
              content={message.content}
            />
          ))}
          <AnimatePresence>
            {isLoading && <ThinkingIndicator />}
          </AnimatePresence>
          <div
            ref={messagesEndRef}
            className="flex-shrink-0 min-w-[24px] min-h-[24px]"
          />
        </div>

        {messages.length === 0 && (
          <motion.div 
            className="grid grid-cols-1 gap-3 w-full px-4 md:px-0 mx-auto md:max-w-[600px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <motion.div
              className="text-center mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Get started with these suggestions
              </h3>
              <p className="text-sm text-slate-500">
                Ask anything about your data room or try one of these popular questions
              </p>
            </motion.div>
            {(suggestionsByPerspective[perspective] || []).map((suggestedAction, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + 0.1 * index, duration: 0.3 }}
                key={index}
              >
                <motion.button
                  onClick={async () => {
                    append({
                      role: "user",
                      content: suggestedAction.action,
                    });
                  }}
                  className="w-full text-left border border-slate-200 text-slate-700 rounded-xl p-4 text-sm bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-md hover:border-blue-300 transition-all duration-200 group"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 group-hover:bg-blue-500 transition-colors" />
                    <div>
                      <span className="font-medium text-slate-800 group-hover:text-blue-700 transition-colors">
                        {suggestedAction.label}
                      </span>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {suggestedAction.action.length > 80 
                          ? suggestedAction.action.substring(0, 80) + "..." 
                          : suggestedAction.action
                        }
                      </p>
                    </div>
                  </div>
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}

        <motion.form
          className={`flex flex-row gap-3 relative items-center w-full ${isWidget ? "max-w-[680px] px-3" : "md:max-w-[600px] max-w-[calc(100dvw-32px)] px-4 md:px-0"}`}
          onSubmit={handleSubmit}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="relative flex-1">
            <motion.input
              className="w-full bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl px-4 py-3 outline-none text-slate-800 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-slate-400 shadow-sm hover:shadow-md focus:shadow-lg"
              placeholder="Ask me anything about your data room..."
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
              }}
              whileFocus={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            />
            {input && (
              <motion.button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors shadow-sm"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Send
              </motion.button>
            )}
          </div>

          <motion.div
            className="relative text-sm bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl size-12 flex-shrink-0 flex flex-row items-center justify-center cursor-pointer hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50/50 transition-all shadow-sm hover:shadow-md"
            onClick={() => {
              setIsFilesVisible(!isFilesVisible);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FileIcon />
            {selectedFilePathnames?.length > 0 && (
              <motion.div
                className="absolute text-xs -top-1 -right-1 bg-blue-500 size-5 rounded-full flex flex-row justify-center items-center border-2 border-white text-white font-medium"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 500 }}
              >
                {selectedFilePathnames.length}
              </motion.div>
            )}
          </motion.div>
        </motion.form>
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
    </div>
  );
}
