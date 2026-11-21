"use client";

import { type FormEvent, useState } from "react";
import type { Collection } from "@/domain/models";

interface Props {
  collections: Collection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onDelete: (collection: Collection) => Promise<void>;
}

export function CollectionSidebar({ collections, selectedId, onSelect, onCreate, onDelete }: Props) {
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onCreate(name);
      setName("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Collections</h2>

      <ul className="flex flex-col gap-1">
        {collections.map((collection) => {
          const active = collection.id === selectedId;
          return (
            <li key={collection.id} className="group flex items-center">
              <button
                type="button"
                onClick={() => onSelect(collection.id)}
                className={`flex flex-1 items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="truncate">{collection.name}</span>
                <span className={`ml-2 text-xs ${active ? "opacity-70" : "text-zinc-400"}`}>
                  {collection.documentCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(collection)}
                aria-label={`Delete ${collection.name}`}
                className="ml-1 rounded px-2 py-1 text-xs text-zinc-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={submit} className="flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New collection"
          maxLength={60}
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="rounded-md border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-200/70 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Add
        </button>
      </form>
    </section>
  );
}
