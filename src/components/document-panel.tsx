"use client";

import { type DragEvent, useCallback, useEffect, useRef, useState } from "react";
import type { StoredDocument } from "@/domain/models";
import { api, errorMessage } from "@/lib/api-client";

const ACCEPTED = ".pdf,.docx,.txt,.md,.markdown";
const POLL_INTERVAL_MS = 2000;

interface Props {
  collectionId: string;
  onChange: () => void;
  onError: (message: string) => void;
}

export function DocumentPanel({ collectionId, onChange, onError }: Props) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(
    () =>
      api
        .listDocuments(collectionId)
        .then(setDocuments)
        .catch((error) => onError(errorMessage(error))),
    [collectionId, onError],
  );

  useEffect(() => {
    let active = true;
    api
      .listDocuments(collectionId)
      .then((list) => active && setDocuments(list))
      .catch((error) => active && onError(errorMessage(error)));
    return () => {
      active = false;
    };
  }, [collectionId, onError]);

  const processing = documents.some((document) => document.status === "processing");

  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [processing, refresh]);

  async function upload(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    try {
      await api.uploadDocuments(collectionId, files);
      await refresh();
      onChange();
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      await refresh();
      onChange();
    } catch (error) {
      onError(errorMessage(error));
    }
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    upload(Array.from(event.dataTransfer.files));
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Documents</h2>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
        disabled={uploading}
        className={`rounded-lg border-2 border-dashed px-4 py-5 text-center text-sm transition ${
          dragging
            ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
        }`}
      >
        <span className="block font-medium">{uploading ? "Uploading…" : "Drop files or click to upload"}</span>
        <span className="mt-1 block text-xs text-zinc-500">PDF, DOCX, TXT, Markdown · max 50 MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED}
        className="hidden"
        onChange={(event) => upload(Array.from(event.target.files ?? []))}
      />

      <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto">
        {documents.length === 0 && <li className="px-1 text-sm text-zinc-500">No documents yet.</li>}
        {documents.map((document) => (
          <li key={document.id} className="group rounded-md px-2 py-2 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60">
            <div className="flex items-center gap-2">
              <StatusDot status={document.status} />
              <span className="flex-1 truncate text-sm" title={document.fileName}>
                {document.fileName}
              </span>
              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <IconButton label="Re-index" onClick={() => run(() => api.reindexDocument(document.id))}>
                  ↻
                </IconButton>
                <IconButton label="Delete" danger onClick={() => run(() => api.deleteDocument(document.id))}>
                  ✕
                </IconButton>
              </div>
            </div>
            <p className={`ml-4 mt-0.5 text-xs ${document.status === "failed" ? "text-red-600" : "text-zinc-500"}`}>
              {describe(document)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function describe(document: StoredDocument): string {
  if (document.status === "processing") return "Indexing…";
  if (document.status === "failed") return document.error ?? "Indexing failed";
  const pages = document.pageCount > 1 ? `${document.pageCount} pages · ` : "";
  return `${pages}${document.chunkCount} chunks · ${formatSize(document.sizeBytes)}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusDot({ status }: { status: StoredDocument["status"] }) {
  const color = {
    processing: "bg-amber-500 animate-pulse",
    ready: "bg-emerald-500",
    failed: "bg-red-500",
  }[status];
  return <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} aria-label={status} />;
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded px-1.5 text-xs text-zinc-500 ${danger ? "hover:text-red-600" : "hover:text-zinc-900 dark:hover:text-zinc-100"}`}
    >
      {children}
    </button>
  );
}
