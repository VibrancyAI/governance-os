"use client";

import { Message } from "ai";
import { useChat } from "ai/react";
import { useEffect, useState } from "react";
import { Files } from "@/components/files";
import { AnimatePresence, motion } from "framer-motion";
import { FileIcon } from "@/components/icons";
import { Message as PreviewMessage } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { Session } from "next-auth";
import useSWR from "swr";
import { fetcher } from "@/utils/functions";

const suggestedActions = [
  {
    title: "What's the summary",
    label: "of these documents?",
    action: "what's the summary of these documents?",
  },
  {
    title: "Who is the author",
    label: "of these documents?",
    action: "who is the author of these documents?",
  },
];

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
    "founder_raising" | "investor_diligence" | "acquirer_mna"
  >("founder_raising");

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
      setSelectedFilePathnames(
        JSON.parse(
          localStorage.getItem(
            `${session.user.email}/selected-file-pathnames`,
          ) || "[]",
        ),
      );
    }
  }, [session]);

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
      selectedFilePathnames.length === 0
    ) {
      setSelectedFilePathnames(allFiles.map((f) => f.pathname));
    }
  }, [isMounted, session, allFiles, selectedFilePathnames.length]);

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
    <div className={`flex flex-row justify-center ${isWidget ? "pb-2 h-full" : "pb-24 h-dvh"} bg-white`}>
      <div className={`flex flex-col justify-between items-center gap-4 ${isWidget ? "w-full" : ""}`}>
        {/* Perspective selector */}
        <div className={`w-full ${isWidget ? "max-w-[680px]" : "md:max-w-[500px]"} px-4 md:px-0 pt-4`}>
          <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-50 border border-zinc-200 p-1">
            {[
              { key: "founder_raising", label: "Founder · Raising" },
              { key: "investor_diligence", label: "Investor" },
              { key: "acquirer_mna", label: "Acquirer" },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => setPerspective(p.key as any)}
                type="button"
                className={`px-2.5 py-1.5 text-sm rounded-md transition-colors ${
                  perspective === p.key
                    ? "bg-white text-brand shadow-soft"
                    : "text-zinc-600 hover:text-zinc-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div
          ref={messagesContainerRef}
          className={`flex flex-col gap-4 h-full ${isWidget ? "w-full" : "w-dvw"} items-center overflow-y-scroll px-4`}
        >
          {messages.map((message, index) => (
            <PreviewMessage
              key={`${id}-${index}`}
              role={message.role}
              content={message.content}
            />
          ))}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full md:w-[500px]">
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <div className="size-2 rounded-full bg-brand animate-bounce [animation-delay:-0.2s]" />
                <div className="size-2 rounded-full bg-brand animate-bounce" />
                <div className="size-2 rounded-full bg-brand animate-bounce [animation-delay:0.2s]" />
                <span className="ml-2">Assistant is typing…</span>
              </div>
            </motion.div>
          )}
          <div
            ref={messagesEndRef}
            className="flex-shrink-0 min-w-[24px] min-h-[24px]"
          />
        </div>

        {messages.length === 0 && (
          <div className="grid sm:grid-cols-2 gap-2 w-full px-4 md:px-0 mx-auto md:max-w-[500px]">
            {suggestedActions.map((suggestedAction, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                key={index}
                className={index > 1 ? "hidden sm:block" : "block"}
              >
                <button
                  onClick={async () => {
                    append({
                      role: "user",
                      content: suggestedAction.action,
                    });
                  }}
                  className="w-full text-left border border-zinc-200 text-zinc-700 rounded-lg p-2 text-sm hover:bg-zinc-50 transition-colors flex flex-col"
                >
                  <span className="font-medium">{suggestedAction.title}</span>
                  <span className="text-zinc-500">
                    {suggestedAction.label}
                  </span>
                </button>
              </motion.div>
            ))}
          </div>
        )}

        <form
          className={`flex flex-row gap-2 relative items-center w-full ${isWidget ? "max-w-[680px]" : "md:max-w-[500px] max-w-[calc(100dvw-32px)]"} px-4 md:px-0`}
          onSubmit={handleSubmit}
        >
          <input
            className="bg-white border border-zinc-200 rounded-md px-3 py-2 flex-1 outline-none text-zinc-800 focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all placeholder:text-zinc-400"
            placeholder="Send a message..."
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
            }}
          />

          <div
            className="relative text-sm bg-white border border-zinc-200 rounded-lg size-9 flex-shrink-0 flex flex-row items-center justify-center cursor-pointer hover:border-brand hover:text-brand transition-colors"
            onClick={() => {
              setIsFilesVisible(!isFilesVisible);
            }}
          >
            <FileIcon />
            <motion.div
              className="absolute text-xs -top-2 -right-2 bg-brand size-5 rounded-full flex flex-row justify-center items-center border-2 border-white text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              {selectedFilePathnames?.length}
            </motion.div>
          </div>
        </form>
      </div>

      <AnimatePresence>
        {isFilesVisible && (
          <Files
            setIsFilesVisible={setIsFilesVisible}
            selectedFilePathnames={selectedFilePathnames}
            setSelectedFilePathnames={setSelectedFilePathnames}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
