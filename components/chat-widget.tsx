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
            className="fixed bottom-20 right-4 w-[min(95vw,680px)] h-[85vh] bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-blue-500/10"
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <div className="h-full min-h-0 flex flex-col">
              <motion.div
                className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 bg-gradient-to-r from-blue-500/5 via-white/50 to-transparent backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <div className="text-sm font-semibold text-slate-800">AI Assistant</div>
                </div>
                <motion.button
                  className="text-slate-500 hover:text-slate-700 text-sm px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
                  onClick={() => setIsOpen(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ✕
                </motion.button>
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
        className="rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-blue-700 size-14 flex items-center justify-center transition-all duration-200"
        initial={false}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ 
          boxShadow: [
            "0 4px 14px 0 rgba(59, 130, 246, 0.3)",
            "0 6px 20px 0 rgba(59, 130, 246, 0.4)",
            "0 4px 14px 0 rgba(59, 130, 246, 0.3)"
          ]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        aria-label="Open chat"
      >
        <FileIcon size={20} />
      </motion.button>
    </div>
  );
}


