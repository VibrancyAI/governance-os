"use client";

import { motion } from "framer-motion";
import { BotIcon } from "./icons";

export const ThinkingIndicator = () => {
  return (
    <motion.div
      className="flex flex-row gap-4 px-4 w-full md:w-[600px] md:px-0 mb-6"
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -10, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.div 
        className="size-8 flex flex-col justify-center items-center flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm"
        animate={{ 
          scale: [1, 1.05, 1]
        }}
        transition={{ 
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <BotIcon />
      </motion.div>

      <div className="flex flex-col gap-2 w-full min-w-0">
        <motion.div
          className="bg-white/80 border border-slate-200/60 shadow-sm p-4 rounded-2xl backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-blue-500 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-slate-600">
              Analyzing your data room...
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

