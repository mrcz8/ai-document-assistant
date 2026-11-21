"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { Collection, Source } from "@/domain/models";
import { useChatSession } from "@/hooks/use-chat-session";
import { api, errorMessage } from "@/lib/api-client";

interface DisplayMessage {
  key: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
}

interface Props {
  collection: Collection;
  onError: (message: string) => void;
}

export function ChatPanel({ collection, onError }: Props) {
  const { sessionId, reset } = useChatSession(collection.id);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .history(sessionId)
      .then((history) => {
        if (cancelled) return;
        setMessages(
          history.map((message) => ({
            key: String(message.id),
            role: message.role,
            content: message.content,
            sources: message.sources,
          })),
        );
      })
      .catch((error) => onError(errorMessage(error)));
    return () => {
      cancelled = true;
    };
  }, [sessionId, onError]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const text = question.trim();
    if (!text || thinking) return;

    setQuestion("");
    setMessages((current) => [...current, { key: crypto.randomUUID(), role: "user", content: text, sources: [] }]);
    setThinking(true);
    try {
      const answer = await api.ask(collection.id, sessionId, text);
      setMessages((current) => [
        ...current,
        { key: crypto.randomUUID(), role: "assistant", content: answer.answer, sources: answer.sources },
      ]);
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setThinking(false);
    }
  }

  async function clear() {
    try {
      await api.clearHistory(sessionId);
      reset();
      setMessages([]);
    } catch (error) {
      onError(errorMessage(error));
    }
  }

  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div>
          <h1 className="text-base font-semibold">{collection.name}</h1>
          <p className="text-xs text-zinc-500">
            Answers come only from the {collection.documentCount} document{collection.documentCount === 1 ? "" : "s"} in this collection
          </p>
        </div>
        <button
          type="button"
          onClick={clear}
          disabled={messages.length === 0}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          New chat
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {messages.length === 0 && !thinking && (
            <div className="mt-24 text-center text-zinc-500">
              <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">Ask about your documents</p>
              <p className="mt-1 text-sm">Upload files on the left, then ask a question. Every answer cites its source.</p>
            </div>
          )}
          {messages.map((message) => (
            <MessageBubble key={message.key} message={message} />
          ))}
          {thinking && <p className="animate-pulse text-sm text-zinc-500">Searching documents…</p>}
          <div ref={endRef} />
        </div>
      </div>

      <form onSubmit={send} className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleKey}
            rows={1}
            maxLength={2000}
            placeholder="Ask a question…"
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={thinking || !question.trim()}
            className="h-[44px] rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-zinc-900 px-4 py-2.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
        {message.content}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
      {message.sources.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sources</p>
          {message.sources.map((source) => (
            <details
              key={source.index}
              className="rounded-md border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-800"
            >
              <summary className="cursor-pointer select-none">
                <span className="font-mono text-zinc-500">[{source.index}]</span>{" "}
                <span className="font-medium">{source.fileName}</span>
                {source.page !== null && <span className="text-zinc-500"> · page {source.page}</span>}
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">{source.excerpt}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
