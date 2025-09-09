"use client";

import { motion } from "framer-motion";
import { BotIcon, UserIcon } from "./icons";
import { ReactNode } from "react";
import { Markdown } from "./markdown";

export const Message = ({
  role,
  content,
}: {
  role: string;
  content: string | ReactNode;
}) => {
  const isAssistant = role === "assistant";
  
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
          <Markdown>{content as string}</Markdown>
        </motion.div>
      </div>
    </motion.div>
  );
};
