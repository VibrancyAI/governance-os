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
  return (
    <motion.div
      className={`flex flex-row gap-3 px-4 w-full md:w-[500px] md:px-0 first-of-type:pt-12`}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="size-[28px] flex flex-col justify-center items-center flex-shrink-0 text-brand">
        {role === "assistant" ? <BotIcon /> : <UserIcon />}
      </div>

      <div className="flex flex-col gap-3 w-full">
        <motion.div
          className={`text-zinc-800 text-[13px] md:text-sm leading-5 md:leading-6 flex flex-col gap-2 break-words whitespace-pre-wrap rounded-xl border ${role === "assistant" ? "bg-zinc-50 border-zinc-200" : "bg-white border-zinc-200"} p-2.5`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <Markdown>{content as string}</Markdown>
        </motion.div>
      </div>
    </motion.div>
  );
};
