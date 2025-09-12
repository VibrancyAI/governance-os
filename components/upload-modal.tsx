"use client";

import { AnimatePresence, motion } from "framer-motion";
import cx from "classnames";
import { Portal } from "@/components/portal";
import { UploadIcon, CheckIcon } from "@/components/icons";
import { useRef, useState } from "react";

export function UploadModal({
  open,
  onClose,
  targetLabel,
  onUploaded,
  onRefetch,
}: {
  open: boolean;
  onClose: () => void;
  targetLabel: string | null;
  onUploaded: (fileName: string) => void;
  onRefetch: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split(".").pop();
    switch (ext) {
      case "pdf":
        return "📄";
      case "doc":
      case "docx":
        return "📝";
      case "xls":
      case "xlsx":
        return "📊";
      case "ppt":
      case "pptx":
        return "📋";
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "webp":
        return "🖼️";
      case "zip":
      case "rar":
        return "🗜️";
      case "txt":
      case "md":
        return "📄";
      default:
        return "📎";
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 20;
      });
    }, 100);

    try {
      await fetch(`/api/files/upload?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        setUploaded(true);
        setFileName(file.name);
        onUploaded(file.name);
        onRefetch();
      }, 300);
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Upload failed:", error);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
      }, 500);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-[60]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <motion.div
                className="w-[min(92vw,640px)] max-h-[90vh] rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between p-6 border-b border-zinc-100 bg-gradient-to-r from-brand/5 to-brand/10">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-800">Upload Document</h3>
                    <p className="text-sm text-zinc-600 mt-1">{targetLabel || ""}</p>
                  </div>
                  <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" onClick={onClose}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6">
                  <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />

                  <motion.div
                    className={cx(
                      "relative h-64 rounded-xl border-2 border-dashed transition-all duration-300 overflow-hidden",
                      isDragOver
                        ? "border-brand bg-brand/10 scale-[1.02]"
                        : uploaded
                        ? "border-green-300 bg-green-50"
                        : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100",
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <AnimatePresence mode="wait">
                        {isUploading ? (
                          <motion.div
                            key="uploading"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="text-center"
                          >
                            <div className="relative mx-auto mb-4">
                              <motion.div
                                className="w-16 h-16 border-4 border-brand/20 border-t-brand rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <motion.span className="text-xs font-medium text-brand" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                                  {Math.round(uploadProgress)}%
                                </motion.span>
                              </div>
                            </div>
                            <div className="text-sm font-medium text-zinc-700 mb-2">Uploading...</div>
                            <div className="w-32 h-2 bg-zinc-200 rounded-full mx-auto overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-brand to-brand/80 rounded-full"
                                initial={{ width: "0%" }}
                                animate={{ width: `${uploadProgress}%` }}
                                transition={{ type: "spring", stiffness: 100 }}
                              />
                            </div>
                          </motion.div>
                        ) : uploaded ? (
                          <motion.div key="uploaded" initial={{ opacity: 0, scale: 0.5, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.5, y: -20 }} className="text-center">
                            <motion.div className="text-6xl mb-4" animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}>
                              {fileName && getFileIcon(fileName)}
                            </motion.div>
                            <motion.div className="inline-flex items-center gap-2 text-green-600 font-medium mb-2" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.5 }}>
                              <CheckIcon size={20} /> Upload Complete!
                            </motion.div>
                            {fileName && <div className="text-sm text-zinc-600 font-medium bg-white/80 px-3 py-1 rounded-lg border border-green-200">{fileName}</div>}
                          </motion.div>
                        ) : (
                          <motion.div key="upload-prompt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center">
                            <motion.div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-brand to-brand/70 rounded-full flex items-center justify-center text-white" whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.95 }}>
                              <UploadIcon size={24} />
                            </motion.div>
                            <div className="text-lg font-medium text-zinc-700 mb-2">{isDragOver ? "Drop your file here" : "Drag & drop your file"}</div>
                            <div className="text-sm text-zinc-500 mb-4">Support for PDF, DOC, XLS, PPT, Images and more</div>
                            <motion.button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand/80 text-white px-6 py-3 text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200" onClick={() => inputRef.current?.click()} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
                              <UploadIcon size={18} /> Choose File
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {!isUploading && !uploaded && (
                      <motion.div
                        className="absolute inset-0 opacity-5 pointer-events-none"
                        animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
                        style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "20px 20px" }}
                      />
                    )}
                  </motion.div>

                  {uploaded && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 flex justify-end gap-3">
                      <motion.button className="px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors" onClick={() => { setUploaded(false); setFileName(null); setUploadProgress(0); }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        Upload Another
                      </motion.button>
                      <motion.button className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 shadow-lg transition-all duration-200" onClick={onClose} whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>
                        Done
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}


