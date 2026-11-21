"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "docmind.sessions";

function readSessions(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeSessions(sessions: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {}
}

function resolveSession(collectionId: string): string {
  const sessions = readSessions();
  if (!sessions[collectionId]) {
    sessions[collectionId] = crypto.randomUUID();
    writeSessions(sessions);
  }
  return sessions[collectionId];
}

export function useChatSession(collectionId: string) {
  const [state, setState] = useState(() => ({ collectionId, sessionId: resolveSession(collectionId) }));

  if (state.collectionId !== collectionId) {
    setState({ collectionId, sessionId: resolveSession(collectionId) });
  }

  const reset = useCallback(() => {
    const sessions = readSessions();
    sessions[collectionId] = crypto.randomUUID();
    writeSessions(sessions);
    setState({ collectionId, sessionId: sessions[collectionId] });
  }, [collectionId]);

  return { sessionId: state.sessionId, reset };
}
