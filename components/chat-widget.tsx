"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Chat } from "@/components/chat";
import { generateId } from "ai";
import { FileIcon } from "@/components/icons";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [id, setId] = useState<string>("");

  useEffect(() => {
    setId(generateId());
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-zinc-900/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-20 right-4 w-[min(92vw,560px)] h-[76vh] bg-white border border-zinc-200 rounded-2xl shadow-soft overflow-hidden ring-1 ring-brand/10"
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <div className="h-full min-h-0 flex flex-col">
              <motion.div
                className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-gradient-to-r from-brand/5 to-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-sm font-medium text-zinc-700">Assistant</div>
                <button
                  className="text-zinc-500 hover:text-zinc-700 text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  Close
                </button>
              </motion.div>
              <div className="flex-1 min-h-0">
                <Chat id={id} initialMessages={[]} session={null} isWidget />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(true)}
        className="rounded-full bg-brand text-white shadow-soft hover:bg-brand-700 size-12 flex items-center justify-center"
        initial={false}
        whileTap={{ scale: 0.96 }}
        aria-label="Open chat"
      >
        <FileIcon />
      </motion.button>
    </div>
  );
}


