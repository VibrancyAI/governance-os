"use client";

import useSWR from "swr";
import { fetcher } from "@/utils/functions";
import { motion } from "framer-motion";

export function FilesGallery() {
  const { data: files, isLoading } = useSWR<Array<{ pathname: string; url?: string }>>(
    "/api/files/list",
    fetcher,
    { fallbackData: [] },
  );

  return (
    <div className="px-4 md:px-8 pt-16">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-zinc-800">Your Files</h2>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-zinc-50 border border-zinc-200 animate-pulse" />
          ))}
        </div>
      ) : files && files.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
          {files.map((f, idx) => (
            <motion.div
              key={f.pathname}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.02 * idx }}
              className="group rounded-lg border border-zinc-200 bg-white p-3 hover:border-brand hover:shadow-soft transition-colors"
            >
              <div className="text-sm text-zinc-700 truncate">{f.pathname}</div>
              {f.url ? (
                <div className="text-xs text-zinc-500 truncate mt-1">{f.url}</div>
              ) : null}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-zinc-500 mt-6">No files uploaded yet. Use the Upload in the file manager to add some.</div>
      )}
    </div>
  );
}


