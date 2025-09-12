"use client";

import useSWR from "swr";
import {
  CheckedSquare,
  InfoIcon,
  LoaderIcon,
  TrashIcon,
  UncheckedSquare,
  UploadIcon,
} from "./icons";
import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { fetcher } from "@/utils/functions";
import cx from "classnames";
import { motion } from "framer-motion";
import { useOnClickOutside, useWindowSize } from "usehooks-ts";
import { dataRoomStructure } from "./data-room-structure";

export const Files = ({
  selectedFilePathnames,
  setSelectedFilePathnames,
  setIsFilesVisible,
  hasUserDeselected,
  onUserDeselected,
}: {
  selectedFilePathnames: string[];
  setSelectedFilePathnames: Dispatch<SetStateAction<string[]>>;
  setIsFilesVisible: Dispatch<SetStateAction<boolean>>;
  hasUserDeselected?: boolean;
  onUserDeselected?: () => void;
}) => {
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => { setIsHydrated(true); }, []);
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
  const [deleteQueue, setDeleteQueue] = useState<Array<string>>([]);
  const {
    data: files,
    mutate,
    isLoading,
  } = useSWR<
    Array<{
      pathname: string;
      url?: string;
    }>
  >("api/files/list", fetcher, {
    fallbackData: [],
  });

  const { width } = useWindowSize();
  const isDesktop = width > 768;

  const drawerRef = useRef(null);
  useOnClickOutside([drawerRef], () => {
    setIsFilesVisible(false);
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFilesVisible(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIsFilesVisible]);

  function normalize(name: string): string {
    return name
      .toLowerCase()
      .replace(/\.[a-z0-9]{1,6}$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  // Additional synonyms to improve matching (e.g., PRD vs Product Roadmap)
  function synonyms(normalizedLabel: string): string[] {
    const list = [normalizedLabel];
    if (normalizedLabel.includes("product-roadmap")) list.push("roadmap", "prd", "product-requirements", "product-requirements-doc", "product-requirements-document");
    if (normalizedLabel.includes("cap-table")) list.push("captable", "cap-table-history");
    return list;
  }

  // Server-side associations for stable mappings across devices
  const { data: assocRows } = useSWR<
    Array<{ orgId: string; labelSlug: string; fileName: string }>
  >("/api/files/associations", fetcher, { fallbackData: [] });
  const associations = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of assocRows || []) map[row.labelSlug] = row.fileName;
    return map;
  }, [assocRows]);

  const uploadedSet = new Set((files || []).map((f) => f.pathname));

  const items = dataRoomStructure
    .flatMap((section) => section.documents)
    .map((label) => {
      const norm = normalize(label);
      const assoc = associations[norm];
      // try association -> fuzzy -> synonym fuzzy
      let matched = assoc && uploadedSet.has(assoc) ? assoc : undefined;
      if (!matched) {
        matched = (files || []).find((f) => normalize(f.pathname).includes(norm))?.pathname;
      }
      if (!matched) {
        const syns = synonyms(norm);
        matched = (files || []).find((f) => {
          const nf = normalize(f.pathname);
          return syns.some((s) => nf.includes(s));
        })?.pathname;
      }
      return { label, fileName: matched || null };
    });

  // Ensure all uploaded items are selected by default (and kept in sync)
  useEffect(() => {
    if (hasUserDeselected) return;
    const allUploaded = items.filter((i) => i.fileName).map((i) => i.fileName!) as string[];
    if (allUploaded.length === 0) return;
    const have = new Set(selectedFilePathnames);
    let changed = false;
    for (const f of allUploaded) {
      if (!have.has(f)) {
        have.add(f);
        changed = true;
      }
    }
    if (changed) {
      setSelectedFilePathnames(Array.from(have));
    }
  }, [items, selectedFilePathnames, setSelectedFilePathnames]);

  if (!isHydrated) {
    return (
      <motion.div className="fixed bg-zinc-900/30 h-dvh w-dvw top-0 left-0 z-40 flex flex-row justify-center items-center">
        <motion.div className="fixed p-4 flex flex-col gap-4 bg-white z-30 shadow-soft border border-zinc-200 w-[680px] h-[480px] rounded-xl">
          <div className="h-6 w-40 bg-zinc-200 rounded animate-pulse" />
          <div className="flex-1 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 bg-zinc-100 rounded animate-pulse" />
            ))}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed bg-zinc-900/30 h-dvh w-dvw top-0 left-0 z-40 flex flex-row justify-center items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={cx(
          "fixed p-4 flex flex-col gap-4 bg-white z-30 shadow-soft border border-zinc-200",
          { "w-dvw h-96 bottom-0 right-0 rounded-t-lg": !isDesktop },
          { "w-[680px] h-[480px] rounded-xl": isDesktop },
        )}
        initial={{
          y: "100%",
          scale: isDesktop ? 0.96 : 1,
          opacity: 1,
        }}
        animate={{ y: "0%", scale: 1, opacity: 1 }}
        exit={{
          y: "100%",
          scale: isDesktop ? 0.96 : 1,
          opacity: 1,
        }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        ref={drawerRef}
      >
        <div className="flex flex-row justify-between items-center">
          <div className="text-sm flex flex-row gap-3">
            <div className="text-zinc-900">Select items to include</div>
          </div>

          <div className="flex flex-row items-center gap-2">
            <input
              name="file"
              ref={inputFileRef}
              type="file"
              required
              className="opacity-0 pointer-events-none w-1"
              accept=".pdf,.docx,.txt,.md,.markdown,.html,.htm,.csv,.json,.png,.jpg,.jpeg,.webp,.gif,.tif,.tiff,.bmp"
              multiple={false}
              onChange={async (event) => {
                const file = event.target.files![0];

                if (file) {
                  setUploadQueue((currentQueue) => [...currentQueue, file.name]);

                  await fetch(`/api/files/upload?filename=${file.name}`, {
                    method: "POST",
                    body: file,
                  });

                  setUploadQueue((currentQueue) =>
                    currentQueue.filter((filename) => filename !== file.name),
                  );

                  mutate([...(files || []), { pathname: file.name }]);
                }
              }}
            />

            <div
              className="bg-brand text-white hover:bg-brand-700 flex flex-row gap-2 items-center text-sm rounded-md p-1.5 px-3 cursor-pointer shadow-soft"
              onClick={() => {
                inputFileRef.current?.click();
              }}
            >
              <UploadIcon />
              <div>Upload a file</div>
            </div>

            <button
              className="text-xs rounded-md border border-zinc-200 px-2 py-1.5 text-zinc-700 hover:bg-zinc-50"
              onClick={() => setIsFilesVisible(false)}
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex flex-col h-full overflow-y-scroll">
          {isLoading ? (
            <div className="flex flex-col">
              {[44, 32, 52].map((item) => (
                <div
                  key={item}
                  className="flex flex-row gap-4 p-2 border-b border-zinc-100 items-center"
                >
                  <div className="size-4 bg-zinc-200 animate-pulse" />
                  <div
                    className={`w-${item} h-4 bg-zinc-200 animate-pulse`}
                  />
                  <div className="h-[24px] w-1" />
                </div>
              ))}
            </div>
          ) : null}

          {!isLoading &&
          items.length === 0 &&
          uploadQueue.length === 0 &&
          deleteQueue.length === 0 ? (
            <div className="flex flex-col gap-4 items-center justify-center h-full">
              <div className="flex flex-row gap-2 items-center text-zinc-500 text-sm">
                <InfoIcon />
                <div>No files found</div>
              </div>
            </div>
          ) : null}

          {items
            .filter((i) => i.fileName)
            .map((item) => (
            <div
              key={item.label}
              className={`flex flex-row p-2 border-b border-zinc-100 ${
                item.fileName && selectedFilePathnames.includes(item.fileName)
                  ? "bg-brand/5"
                  : ""
              }`}
            >
              <div
                className="flex flex-row items-center justify-between w-full gap-4"
                onClick={() => {
                  if (!item.fileName) return;
                  setSelectedFilePathnames((currentSelections) => {
                    if (currentSelections.includes(item.fileName!)) {
                      onUserDeselected && onUserDeselected();
                      return currentSelections.filter(
                        (path) => path !== item.fileName,
                      );
                    } else {
                      return [...currentSelections, item.fileName!];
                    }
                  });
                }}
              >
                <div
                  className={cx(
                    "cursor-pointer",
                    item.fileName &&
                      selectedFilePathnames.includes(item.fileName) &&
                      !deleteQueue.includes(item.fileName)
                      ? "text-brand"
                      : "text-zinc-500",
                  )}
                >
                  {item.fileName && deleteQueue.includes(item.fileName) ? (
                    <div className="animate-spin">
                      <LoaderIcon />
                    </div>
                  ) : item.fileName && selectedFilePathnames.includes(item.fileName) ? (
                    <CheckedSquare />
                  ) : (
                    <UncheckedSquare />
                  )}
                </div>

                <div className="flex flex-row justify-between w-full">
                  <div className="text-sm text-zinc-700">
                    {item.label}
                  </div>
                </div>
              </div>

              {(() => {
                if (!item.fileName) return null;
                const file = (files || []).find((f) => f.pathname === item.fileName);
                if (!file) return null;
                return (
                  <div
                    className="text-zinc-500 hover:bg-red-50 hover:text-red-600 p-1 px-2 cursor-pointer rounded-md"
                    onClick={async () => {
                      setDeleteQueue((currentQueue) => [
                        ...currentQueue,
                        file.pathname,
                      ]);

                      await fetch(`/api/files/delete?fileurl=${file.url}`, {
                        method: "DELETE",
                      });

                      setDeleteQueue((currentQueue) =>
                        currentQueue.filter(
                          (filename) => filename !== file.pathname,
                        ),
                      );

                      setSelectedFilePathnames((currentSelections) =>
                        currentSelections.filter((path) => path !== file.pathname),
                      );
                      onUserDeselected && onUserDeselected();

                      mutate((files || []).filter((f) => f.pathname !== file.pathname));
                    }}
                  >
                    <TrashIcon />
                  </div>
                );
              })()}
            </div>
          ))}

          {uploadQueue.map((fileName) => (
            <div
              key={fileName}
              className="flex flex-row justify-between p-2 gap-4 items-center"
            >
              <div className="text-zinc-500">
                <div className="animate-spin">
                  <LoaderIcon />
                </div>
              </div>

              <div className="flex flex-row justify-between w-full">
                <div className="text-sm text-zinc-500">
                  {fileName}
                </div>
              </div>

              <div className="h-[24px] w-2" />
            </div>
          ))}
        </div>

        <div className="flex flex-row justify-end">
          <div className="text-zinc-500 text-sm">
            {`${selectedFilePathnames.length}/${items.filter((i) => i.fileName).length}`} Selected
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
