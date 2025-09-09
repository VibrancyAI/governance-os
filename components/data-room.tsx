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
            <div className="px-3 py-2.5 border-b border-zinc-200 flex items-center justify-between">
              <div className="text-sm font-medium text-zinc-700 flex items-center gap-2">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-brand/10 text-brand">●</span>
                {section.category}
              </div>
              <div className="flex items-center gap-2">
                <AddItemButton onAdd={(label) => addItem(section.category, label)} />
                <div className="text-xs text-zinc-500">
                  {doneCount}/{docs.length} required
                </div>
              </div>
            </div>
            <div className="px-3 pt-2">
              <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                <motion.div
                  className="h-full bg-brand rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(doneCount / Math.max(1, docs.length)) * 100}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              </div>
            </div>

            <ul className="p-2 space-y-2">
              {allDocs.map((doc) => (
                <DataRoomItem
                  key={doc}
                  label={doc}
                  isUploaded={isDocUploaded(doc)}
                  attachedName={findMatchingFileName(doc)}
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
  const pct = Math.round((done / total) * 100);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-zinc-700">Data Room Readiness</div>
        <div className="text-sm text-zinc-600">{pct}%</div>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden relative">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand to-brand-700"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        <motion.div
          className="absolute inset-0 opacity-20"
          initial={{ backgroundPositionX: 0 }}
          animate={{ backgroundPositionX: 200 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 50%, rgba(255,255,255,0) 100%)",
            backgroundSize: "200px 100%",
          }}
        />
      </div>
      <div className="mt-2 text-xs text-zinc-500">
        {done}/{total} required items
      </div>
    </div>
  );
}

function DataRoomItem({
  label,
  isUploaded,
  uploadKey,
  attachedName,
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
  onUploaded: (docLabel: string, fileName: string) => void;
  hidden: boolean;
  onToggleHidden: () => void;
  onRemoveCustom: () => void;
  isCustom: boolean;
  onRefetch: () => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <li
      className={cx(
        "flex items-center justify-between text-sm px-2 py-1.5 rounded-lg",
        hidden
          ? "bg-zinc-50 border border-zinc-200 opacity-60"
          : isUploaded
          ? "bg-green-50 border border-green-200"
          : "bg-red-50 border border-red-200",
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={cx(
            "inline-flex items-center justify-center size-5 rounded-full",
            hidden ? "text-zinc-500" : isUploaded ? "text-green-600" : "text-red-600",
          )}
        >
          {hidden ? "•" : isUploaded ? <CheckIcon /> : "!"}
        </span>
        <div className="min-w-0">
          <div className={cx("truncate", isUploaded ? "text-zinc-700" : "text-zinc-700")}>{label}</div>
          {isUploaded && attachedName ? (
            <div className="text-xs text-zinc-500 truncate">{attachedName}</div>
          ) : (
            <div className="text-[10px] uppercase tracking-wide text-zinc-600">Required</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsModalOpen(true)}
          className={cx(
            "text-xs inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors",
            isUploaded
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-red-500 text-white hover:bg-red-600",
          )}
        >
          <UploadIcon />
          {isUploaded ? "Replace" : "Upload"}
        </button>
        {isUploaded && (
          <button
            onClick={() => setConfirmClear(true)}
            className="text-xs inline-flex items-center gap-1 rounded-md px-2 py-1 border border-red-300 text-red-600 hover:bg-red-50"
          >
            Clear
          </button>
        )}
        {isCustom ? (
          <button
            onClick={onRemoveCustom}
            className="text-xs inline-flex items-center gap-1 rounded-md px-2 py-1 border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          >
            Remove
          </button>
        ) : (
          <button
            onClick={onToggleHidden}
            className={cx(
              "text-xs inline-flex items-center gap-1 rounded-md px-2 py-1 border",
              hidden
                ? "border-brand text-brand hover:bg-brand/10"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50",
            )}
          >
            {hidden ? "Show" : "Hide"}
          </button>
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
    </li>
  );
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
            <div className="w-[min(92vw,560px)] rounded-xl border border-zinc-200 bg-white shadow-soft p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-zinc-700">
                  Upload: {targetLabel}
                </div>
                <button className="text-zinc-500 text-sm" onClick={onClose}>
                  Close
                </button>
              </div>

              <input ref={inputRef} type="file" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsUploading(true);
                try {
                  await fetch(`/api/files/upload?filename=${encodeURIComponent(file.name)}` , {
                    method: "POST",
                    body: file,
                  });
                  setUploaded(true);
                  setFileName(file.name);
                  onUploaded(file.name);
                  onRefetch();
                } finally {
                  setIsUploading(false);
                }
              }} />

              <div
                className={cx(
                  "mt-2 h-40 rounded-lg border border-dashed flex items-center justify-center",
                  uploaded ? "border-green-300 bg-green-50" : "border-zinc-300 bg-zinc-50",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (!file) return;
                  setIsUploading(true);
                  try {
                    await fetch(`/api/files/upload?filename=${encodeURIComponent(file.name)}` , {
                      method: "POST",
                      body: file,
                    });
                    setUploaded(true);
                    setFileName(file.name);
                    onUploaded(file.name);
                    onRefetch();
                  } finally {
                    setIsUploading(false);
                  }
                }}
              >
                <div className="text-center">
                  <div className="text-sm text-zinc-700">Drag & drop file here</div>
                  <div className="text-xs text-zinc-500">or</div>
                  <button
                    className="mt-2 inline-flex items-center gap-2 rounded-md bg-brand text-white px-3 py-1.5 text-sm shadow-soft hover:bg-brand-700"
                    onClick={() => inputRef.current?.click()}
                  >
                    <UploadIcon /> Choose file
                  </button>

                  <AnimatePresence>
                    {isUploading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-2 text-xs text-zinc-500"
                      >
                        Uploading…
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {uploaded && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="mt-2 inline-flex items-center gap-1 text-green-600"
                      >
                        <CheckIcon /> Uploaded{fileName ? ` • ${fileName}` : ""}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
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
    <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4">
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


