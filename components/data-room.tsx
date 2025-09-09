"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dataRoomStructure, slugify } from "./data-room-structure";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import { fetcher } from "@/utils/functions";
import cx from "classnames";
import { CheckIcon, UploadIcon } from "@/components/icons";

type FileEntry = { pathname: string; url?: string };
type CustomDataRoom = {
  added: Record<string, string[]>; // custom items
  hidden: Record<string, string[]>; // base (and custom) items that are hidden (greyed out)
};

export function DataRoom() {
  const { data: files, mutate } = useSWR<FileEntry[]>(
    "/api/files/list",
    fetcher,
    {
      fallbackData: [],
    },
  );

  const [associations, setAssociations] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("data-room-associations") || "{}",
      );
      setAssociations(stored);
    } catch {}
  }, []);

  const uploadedSet = useMemo(
    () => new Set(files?.map((f) => f.pathname)),
    [files],
  );

  function normalize(name: string): string {
    return name
      .toLowerCase()
      .replace(/\.[a-z0-9]{1,6}$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  function findMatchingFileName(doc: string): string | undefined {
    const normDoc = normalize(doc);
    // 1) explicit association
    const assoc = associations[normDoc];
    if (assoc && uploadedSet.has(assoc)) return assoc;
    // 2) fuzzy contains
    return files?.find((f) => normalize(f.pathname).includes(normDoc))?.pathname;
  }

  function isDocUploaded(doc: string): boolean {
    return Boolean(findMatchingFileName(doc));
  }

  function handleUploaded(doc: string, fileName: string) {
    const normDoc = normalize(doc);
    const next = { ...associations, [normDoc]: fileName };
    setAssociations(next);
    try {
      localStorage.setItem("data-room-associations", JSON.stringify(next));
    } catch {}
    mutate();
  }

  // CRUD: customizable structure persisted locally
  function loadCustom(): CustomDataRoom {
    try {
      const raw = JSON.parse(
        localStorage.getItem("data-room-custom-structure") || "{}",
      );
      // migrate older "removed" to new "hidden"
      const hidden = raw.hidden || raw.removed || {};
      return {
        added: raw.added || {},
        hidden,
      } as CustomDataRoom;
    } catch {
      return { added: {}, hidden: {} } as CustomDataRoom;
    }
  }
  function saveCustom(next: CustomDataRoom) {
    localStorage.setItem("data-room-custom-structure", JSON.stringify(next));
  }
  const [custom, setCustom] = useState<CustomDataRoom>(() => loadCustom());
  function addItem(category: string, label: string) {
    const next: CustomDataRoom = {
      added: { ...custom.added },
      hidden: { ...custom.hidden },
    };
    const arr = next.added[category] || [];
    if (!arr.includes(label)) arr.push(label);
    next.added[category] = arr;
    setCustom(next);
    saveCustom(next);
  }
  function removeCustomItem(category: string, label: string) {
    const next: CustomDataRoom = {
      added: { ...custom.added },
      hidden: { ...custom.hidden },
    };
    next.added[category] = (next.added[category] || []).filter((x) => x !== label);
    setCustom(next);
    saveCustom(next);
  }
  function toggleHidden(category: string, label: string) {
    const next: CustomDataRoom = {
      added: { ...custom.added },
      hidden: { ...custom.hidden },
    };
    const set = new Set(next.hidden[category] || []);
    if (set.has(label)) set.delete(label);
    else set.add(label);
    next.hidden[category] = Array.from(set);
    setCustom(next);
    saveCustom(next);
  }
  function getDocsAll(category: string): string[] {
    const base = dataRoomStructure.find((s) => s.category === category)
      ?.documents || [];
    const added = custom.added[category] || [];
    return Array.from(new Set([...base, ...added]));
  }
  function isHidden(category: string, label: string): boolean {
    return new Set(custom.hidden[category] || []).has(label);
  }
  function getDocsForCategory(category: string): string[] {
    // visible docs for readiness calculation
    return getDocsAll(category).filter((d) => !isHidden(category, d));
  }

  return (
    <div className="px-4 md:px-8 pt-20">
      {/* Overall readiness header with animated progress */}
      <OverallProgress isDocUploaded={isDocUploaded} getDocsForCategory={getDocsForCategory} />

      <div className="flex items-center justify-between mb-3 mt-6">
        <h2 className="text-lg font-semibold text-zinc-800">Data Room Checklist</h2>
        <div className="text-sm text-zinc-500">{Array.from(uploadedSet).length} uploaded</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {dataRoomStructure.map((section, idx) => {
          const docs = getDocsForCategory(section.category);
          const allDocs = getDocsAll(section.category);
          const doneCount = docs.filter((d) => isDocUploaded(d)).length;
          return (
          <motion.div
            key={section.category}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.02 * idx }}
            className="rounded-xl border border-zinc-200 bg-white shadow-soft"
          >
            <div className="px-4 py-3 border-b border-zinc-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    className={`w-3 h-3 rounded-full ${
                      doneCount === docs.length && docs.length > 0
                        ? "bg-gradient-to-r from-emerald-500 to-green-600"
                        : doneCount > docs.length * 0.7
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                        : doneCount > docs.length * 0.5
                        ? "bg-gradient-to-r from-amber-500 to-orange-600"
                        : "bg-gradient-to-r from-brand to-brand-700"
                    }`}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: idx * 0.2 }}
                  />
                  <h3 className="text-sm font-semibold text-zinc-800">{section.category}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <AddItemButton onAdd={(label) => addItem(section.category, label)} />
                  <div className="text-right">
                    <motion.div 
                      className={`text-lg font-bold ${
                        doneCount === docs.length && docs.length > 0
                          ? "text-emerald-700"
                          : doneCount > docs.length * 0.7
                          ? "text-blue-700"
                          : doneCount > docs.length * 0.5
                          ? "text-amber-700"
                          : "text-brand"
                      }`}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: idx * 0.1 }}
                    >
                      {Math.round((doneCount / Math.max(1, docs.length)) * 100)}%
                    </motion.div>
                    <div className="text-xs text-zinc-500 -mt-1">
                      {doneCount}/{docs.length} items
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-zinc-100 overflow-hidden relative shadow-inner">
                <motion.div
                  className={`h-full rounded-full shadow-sm ${
                    doneCount === docs.length && docs.length > 0
                      ? "bg-gradient-to-r from-emerald-500 to-green-600"
                      : doneCount > docs.length * 0.7
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                      : doneCount > docs.length * 0.5
                      ? "bg-gradient-to-r from-amber-500 to-orange-600"
                      : "bg-gradient-to-r from-brand to-brand-700"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(doneCount / Math.max(1, docs.length)) * 100}%` }}
                  transition={{ type: "tween", ease: "easeOut", duration: 1.4, delay: 0.3 + idx * 0.1 }}
                />
                {/* Enhanced shimmer effect */}
                <motion.div
                  className="absolute inset-0 opacity-20"
                  initial={{ backgroundPositionX: "-200%" }}
                  animate={{ backgroundPositionX: "200%" }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 8, 
                    ease: "linear",
                    delay: 1 + idx * 0.3 
                  }}
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)",
                    backgroundSize: "200px 100%",
                  }}
                />
                {/* Completion pulse effect */}
                {doneCount === docs.length && docs.length > 0 && (
                  <motion.div
                    className="absolute inset-0 bg-white rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.2, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 2 + idx * 0.2 }}
                  />
                )}
              </div>
            </div>

            <ul className="p-2 space-y-1">
              {allDocs.map((doc, idx) => (
                <DataRoomItem
                  key={doc}
                  label={doc}
                  isUploaded={isDocUploaded(doc)}
                  attachedName={findMatchingFileName(doc)}
                  attachedUrl={(files || []).find((f) => f.pathname === findMatchingFileName(doc))?.url}
                  uploadKey={`${slugify(section.category)}__${slugify(doc)}`}
                  onUploaded={handleUploaded}
                  hidden={isHidden(section.category, doc)}
                  onToggleHidden={() => toggleHidden(section.category, doc)}
                  onRemoveCustom={() => removeCustomItem(section.category, doc)}
                  isCustom={(custom.added[section.category] || []).includes(doc)}
                  onRefetch={() => mutate()}
                />)
              )}
            </ul>
          </motion.div>
        );})}
      </div>
      <DangerZone files={files || []} onCleared={() => {
        setAssociations({});
        localStorage.removeItem("data-room-associations");
        mutate();
      }} />
    </div>
  );
}

function OverallProgress({
  isDocUploaded,
  getDocsForCategory,
}: {
  isDocUploaded: (doc: string) => boolean;
  getDocsForCategory: (category: string) => string[];
}) {
  const total = dataRoomStructure.reduce(
    (acc, s) => acc + getDocsForCategory(s.category).length,
    0,
  );
  const done = dataRoomStructure.reduce(
    (acc, s) => acc + getDocsForCategory(s.category).filter((d) => isDocUploaded(d)).length,
    0,
  );
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const getStatusColor = (pct: number) => {
    if (pct >= 90) return { bg: "from-emerald-500 to-green-600", text: "text-emerald-700" };
    if (pct >= 70) return { bg: "from-blue-500 to-indigo-600", text: "text-blue-700" };
    if (pct >= 50) return { bg: "from-amber-500 to-orange-600", text: "text-amber-700" };
    return { bg: "from-red-500 to-rose-600", text: "text-red-700" };
  };

  const statusColor = getStatusColor(pct);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <motion.div
            className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${statusColor.bg}`}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="text-sm font-medium text-zinc-700">Data Room Readiness</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-500">{done}/{total} items</div>
          <motion.div 
            className={`text-xl font-bold ${statusColor.text}`}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {pct}%
          </motion.div>
        </div>
      </div>
      <div className="h-3 w-full rounded-full bg-zinc-100 overflow-hidden relative shadow-inner">
        <motion.div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${statusColor.bg} shadow-sm`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.2 }}
        />
        <motion.div
          className="absolute inset-0 opacity-30"
          initial={{ backgroundPositionX: "-100%" }}
          animate={{ backgroundPositionX: "200%" }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)",
            backgroundSize: "200px 100%",
          }}
        />
      </div>
    </div>
  );
}

function DataRoomItem({
  label,
  isUploaded,
  uploadKey,
  attachedName,
  attachedUrl,
  onUploaded,
  hidden,
  onToggleHidden,
  onRemoveCustom,
  isCustom,
  onRefetch,
}: {
  label: string;
  isUploaded: boolean;
  uploadKey: string;
  attachedName?: string;
  attachedUrl?: string;
  onUploaded: (docLabel: string, fileName: string) => void;
  hidden: boolean;
  onToggleHidden: () => void;
  onRemoveCustom: () => void;
  isCustom: boolean;
  onRefetch: () => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const viewerHref = attachedName
    ? `?name=${encodeURIComponent(attachedName)}`
    : undefined;

  const content = (
    <motion.div
      className={cx(
        "flex items-center justify-between py-3 px-3 rounded-lg transition-colors",
        hidden
          ? "bg-zinc-50/50 border border-zinc-200/60 opacity-60"
          : isUploaded
          ? "bg-gradient-to-r from-green-50/80 to-emerald-50/80 border border-green-200/60"
          : "bg-white border border-zinc-200/60",
      )}
      whileHover={viewerHref ? { y: -1 } : undefined}
    >
      {/* Simple status indicator */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {viewerHref ? (
          <a
            href={viewerHref}
            className="flex items-center gap-3 min-w-0 flex-1"
          >
            <div
              className={cx(
                "w-2 h-2 rounded-full flex-shrink-0",
                hidden
                  ? "bg-zinc-400"
                  : isUploaded
                  ? "bg-green-500"
                  : "bg-amber-500",
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cx(
                    "text-sm font-medium truncate",
                    hidden ? "text-zinc-500" : "text-zinc-700",
                  )}
                >
                  {label}
                </span>
                {isCustom && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-600 flex-shrink-0">
                    Custom
                  </span>
                )}
              </div>
              {isUploaded && attachedName ? (
                <div className="text-xs text-zinc-500 truncate mt-0.5">
                  {attachedName}
                </div>
              ) : !hidden ? (
                <div className="text-xs text-zinc-500 mt-0.5">Required</div>
              ) : null}
            </div>
          </a>
        ) : (
          <>
            <div
              className={cx(
                "w-2 h-2 rounded-full flex-shrink-0",
                hidden
                  ? "bg-zinc-400"
                  : isUploaded
                  ? "bg-green-500"
                  : "bg-amber-500",
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cx(
                    "text-sm font-medium truncate",
                    hidden ? "text-zinc-500" : "text-zinc-700",
                  )}
                >
                  {label}
                </span>
                {isCustom && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-600 flex-shrink-0">
                    Custom
                  </span>
                )}
              </div>
              {isUploaded && attachedName ? (
                <div className="text-xs text-zinc-500 truncate mt-0.5">
                  {attachedName}
                </div>
              ) : !hidden ? (
                <div className="text-xs text-zinc-500 mt-0.5">Required</div>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Simplified action area */}
      <div className="flex items-center gap-2 ml-3">
        <button
          onClick={() => setIsModalOpen(true)}
          className={cx(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            isUploaded
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-brand text-white hover:bg-brand/90"
          )}
        >
          {isUploaded ? "Replace" : "Upload"}
        </button>
        
        {/* More options button */}
        {true && (
          <div className="relative">
            <button
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            
            {/* Dropdown menu */}
            {showDropdown && (
              <>
                {/* Backdrop to close dropdown */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowDropdown(false)}
                />
                
                <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg py-1 z-20 min-w-24">
                  {isUploaded && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmClear(true);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      Clear
                    </button>
                  )}
                  {isCustom ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveCustom();
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleHidden();
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
                    >
                      {hidden ? "Show" : "Hide"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <UploadModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        targetLabel={label}
        onUploaded={(fileName) => onUploaded(label, fileName)}
        onRefetch={onRefetch}
      />

      <ConfirmModal
        open={confirmClear}
        title="Remove the uploaded file?"
        description="This deletes the file and its embeddings for this item."
        confirmLabel="Delete"
        tone="danger"
        onClose={() => setConfirmClear(false)}
        onConfirm={async () => {
          if (!attachedName) return setConfirmClear(false);
          try {
            const res = await fetch(`/api/files/list`);
            const all: FileEntry[] = await res.json();
            const file = all.find((f) => f.pathname === attachedName);
            if (file && (file as any).url) {
              await fetch(`/api/files/delete?fileurl=${(file as any).url}`, {
                method: "DELETE",
              });
            }
          } catch {}
          // clear local association mapping
          const norm = label
            .toLowerCase()
            .replace(/\.[a-z0-9]{1,6}$/i, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
          try {
            const map = JSON.parse(
              localStorage.getItem("data-room-associations") || "{}",
            );
            delete map[norm];
            localStorage.setItem("data-room-associations", JSON.stringify(map));
          } catch {}
          setConfirmClear(false);
          onRefetch();
        }}
      />
    </motion.div>
  );

  return <li>{content}</li>;
}

// StatusDot removed in favor of bold icon and background color

function UploadModal({
  open,
  onClose,
  targetLabel,
  onUploaded,
  onRefetch,
}: {
  open: boolean;
  onClose: () => void;
  targetLabel: string;
  onUploaded: (fileName: string) => void;
  onRefetch: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // Get file type icon
  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📋';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
        return '🖼️';
      case 'zip':
      case 'rar':
        return '🗜️';
      case 'txt':
      case 'md':
        return '📄';
      default:
        return '📎';
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate upload progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
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
      
      // Small delay for smooth transition
      setTimeout(() => {
        setUploaded(true);
        setFileName(file.name);
        onUploaded(file.name);
        onRefetch();
      }, 300);
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Upload failed:', error);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
      }, 500);
    }
  };

  return (
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
              layoutId="upload-modal"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-100 bg-gradient-to-r from-brand/5 to-brand/10">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-800">
                    Upload Document
                  </h3>
                  <p className="text-sm text-zinc-600 mt-1">
                    {targetLabel}
                  </p>
                </div>
                <button 
                  className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" 
                  onClick={onClose}
                >
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

                {/* Upload Area */}
                <motion.div
                  className={cx(
                    "relative h-64 rounded-xl border-2 border-dashed transition-all duration-300 overflow-hidden",
                    isDragOver 
                      ? "border-brand bg-brand/10 scale-[1.02]"
                      : uploaded 
                        ? "border-green-300 bg-green-50" 
                        : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
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
                              <motion.span 
                                className="text-xs font-medium text-brand"
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
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
                        <motion.div
                          key="uploaded"
                          initial={{ opacity: 0, scale: 0.5, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.5, y: -20 }}
                          className="text-center"
                        >
                          <motion.div
                            className="text-6xl mb-4"
                            animate={{ 
                              scale: [1, 1.1, 1],
                              rotate: [0, 5, -5, 0]
                            }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                          >
                            {fileName && getFileIcon(fileName)}
                          </motion.div>
                          <motion.div
                            className="inline-flex items-center gap-2 text-green-600 font-medium mb-2"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 0.5 }}
                          >
                            <CheckIcon size={20} />
                            Upload Complete!
                          </motion.div>
                          {fileName && (
                            <div className="text-sm text-zinc-600 font-medium bg-white/80 px-3 py-1 rounded-lg border border-green-200">
                              {fileName}
                            </div>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="upload-prompt"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-center"
                        >
                          <motion.div
                            className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-brand to-brand/70 rounded-full flex items-center justify-center text-white"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <UploadIcon size={24} />
                          </motion.div>
                          <div className="text-lg font-medium text-zinc-700 mb-2">
                            {isDragOver ? "Drop your file here" : "Drag & drop your file"}
                          </div>
                          <div className="text-sm text-zinc-500 mb-4">
                            Support for PDF, DOC, XLS, PPT, Images and more
                          </div>
                          <motion.button
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand/80 text-white px-6 py-3 text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                            onClick={() => inputRef.current?.click()}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <UploadIcon size={18} />
                            Choose File
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Animated background pattern */}
                  {!isUploading && !uploaded && (
                    <motion.div
                      className="absolute inset-0 opacity-5 pointer-events-none"
                      animate={{
                        backgroundPosition: ["0% 0%", "100% 100%"],
                      }}
                      transition={{
                        duration: 20,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                      style={{
                        backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                        backgroundSize: "20px 20px",
                      }}
                    />
                  )}
                </motion.div>

                {/* Footer actions */}
                {uploaded && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 flex justify-end gap-3"
                  >
                    <motion.button
                      className="px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
                      onClick={() => {
                        setUploaded(false);
                        setFileName(null);
                        setUploadProgress(0);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Upload Another
                    </motion.button>
                    <motion.button
                      className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 shadow-lg transition-all duration-200"
                      onClick={onClose}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                    >
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
  );
}

function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  tone = "default",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-zinc-900/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <div className="w-[min(92vw,420px)] rounded-xl border border-zinc-200 bg-white shadow-soft p-4">
              <div className="text-sm font-medium text-zinc-800">{title}</div>
              {description ? (
                <div className="text-xs text-zinc-600 mt-1">{description}</div>
              ) : null}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  className="text-xs rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-50"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className={cx(
                    "text-xs rounded-md px-2 py-1",
                    tone === "danger"
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-brand text-white hover:bg-brand-700",
                  )}
                  onClick={onConfirm}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DangerZone({
  files,
  onCleared,
}: {
  files: FileEntry[];
  onCleared: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="my-8 mb-20 rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-red-700">Danger zone</div>
          <div className="text-xs text-red-600">This will remove all uploaded files and embeddings.</div>
        </div>
        <button
          className="text-xs rounded-md bg-red-600 text-white px-3 py-1.5 hover:bg-red-700"
          onClick={() => setOpen(true)}
        >
          Clear all
        </button>
      </div>

      <ConfirmAllModal
        open={open}
        input={input}
        setInput={setInput}
        busy={busy}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          if (input !== "DELETE ALL") return;
          setBusy(true);
          try {
            for (const f of files) {
              if ((f as any).url) {
                await fetch(`/api/files/delete?fileurl=${(f as any).url}`, {
                  method: "DELETE",
                });
              }
            }
            onCleared();
          } finally {
            setBusy(false);
            setOpen(false);
          }
        }}
      />
    </div>
  );
}

function ConfirmAllModal({
  open,
  input,
  setInput,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  input: string;
  setInput: (v: string) => void;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-zinc-900/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <div className="w-[min(92vw,520px)] rounded-xl border border-zinc-200 bg-white shadow-soft p-4">
              <div className="text-sm font-medium text-zinc-800">Confirm complete removal</div>
              <div className="text-xs text-zinc-600 mt-1">
                Type <span className="px-1 font-mono text-red-600">DELETE ALL</span> to delete all uploads and embeddings.
              </div>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="DELETE ALL"
                className="mt-3 w-full border border-zinc-200 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  className="text-xs rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-50"
                  onClick={onClose}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  className="text-xs rounded-md px-2 py-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  onClick={onConfirm}
                  disabled={busy || input !== "DELETE ALL"}
                >
                  {busy ? "Deleting…" : "Delete everything"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function AddItemButton({ onAdd }: { onAdd: (label: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  return (
    <>
      <button
        className="text-xs rounded-md border border-zinc-200 px-2 py-1 hover:border-brand hover:text-brand"
        onClick={() => setOpen(true)}
      >
        + Add
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 bg-zinc-900/30 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <div className="w-[min(92vw,420px)] rounded-xl border border-zinc-200 bg-white shadow-soft p-4">
                <div className="text-sm font-medium text-zinc-800">Add checklist item</div>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Document name"
                  className="mt-3 w-full border border-zinc-200 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none"
                />
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    className="text-xs rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-50"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="text-xs rounded-md px-2 py-1 bg-brand text-white hover:bg-brand-700 disabled:opacity-50"
                    onClick={() => {
                      if (value.trim().length === 0) return;
                      onAdd(value.trim());
                      setValue("");
                      setOpen(false);
                    }}
                    disabled={value.trim().length === 0}
                  >
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}


