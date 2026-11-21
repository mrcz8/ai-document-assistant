"use client";

import { useCallback, useEffect, useState } from "react";
import type { Collection } from "@/domain/models";
import { api, errorMessage } from "@/lib/api-client";
import { ChatPanel } from "./chat-panel";
import { CollectionSidebar } from "./collection-sidebar";
import { DocumentPanel } from "./document-panel";
import { ThemeToggle } from "./theme-toggle";

export function AppShell() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyCollections = useCallback((list: Collection[]) => {
    setCollections(list);
    setSelectedId((current) => (current && list.some((item) => item.id === current) ? current : list[0]?.id ?? null));
  }, []);

  const loadCollections = useCallback(
    () =>
      api
        .listCollections()
        .then(applyCollections)
        .catch((failure) => setError(errorMessage(failure))),
    [applyCollections],
  );

  useEffect(() => {
    api
      .listCollections()
      .then(applyCollections)
      .catch((failure) => setError(errorMessage(failure)));
  }, [applyCollections]);

  const showError = useCallback((message: string) => setError(message), []);

  async function createCollection(name: string) {
    try {
      const created = await api.createCollection(name);
      await loadCollections();
      setSelectedId(created.id);
    } catch (failure) {
      setError(errorMessage(failure));
      throw failure;
    }
  }

  async function deleteCollection(collection: Collection) {
    const confirmed = window.confirm(
      `Delete "${collection.name}" and its ${collection.documentCount} document(s)? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await api.deleteCollection(collection.id);
      await loadCollections();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  const selected = collections.find((collection) => collection.id === selectedId) ?? null;

  return (
    <div className="flex h-dvh overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <aside className="flex w-80 shrink-0 flex-col gap-8 border-r border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold tracking-tight">DocMind</p>
            <p className="text-xs text-zinc-500">Local AI document assistant</p>
          </div>
          <ThemeToggle />
        </div>
        <CollectionSidebar
          collections={collections}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={createCollection}
          onDelete={deleteCollection}
        />
        {selected && (
          <DocumentPanel key={selected.id} collectionId={selected.id} onChange={loadCollections} onError={showError} />
        )}
      </aside>

      <main className="relative min-w-0 flex-1">
        {selected ? (
          <ChatPanel key={selected.id} collection={selected} onError={showError} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            Create a collection to get started.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="absolute right-6 top-6 flex max-w-sm items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
              ✕
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
