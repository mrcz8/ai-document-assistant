import type { ChatAnswer, ChatMessage, Collection, StoredDocument } from "@/domain/models";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(body.error ?? `Request failed (${response.status})`, response.status);
  }
  return body as T;
}

function json(method: string, payload: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

export const api = {
  listCollections: () => request<Collection[]>("/api/collections"),
  createCollection: (name: string) => request<Collection>("/api/collections", json("POST", { name })),
  deleteCollection: (id: string) => request<void>(`/api/collections/${id}`, { method: "DELETE" }),

  listDocuments: (collectionId: string) => request<StoredDocument[]>(`/api/collections/${collectionId}/documents`),
  uploadDocuments: (collectionId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    return request<StoredDocument[]>(`/api/collections/${collectionId}/documents`, { method: "POST", body: form });
  },
  deleteDocument: (id: string) => request<void>(`/api/documents/${id}`, { method: "DELETE" }),
  reindexDocument: (id: string) => request<StoredDocument>(`/api/documents/${id}/reindex`, { method: "POST" }),

  ask: (collectionId: string, sessionId: string, question: string) =>
    request<ChatAnswer>("/api/chat", json("POST", { collectionId, sessionId, question })),
  history: (sessionId: string) => request<ChatMessage[]>(`/api/chat/${sessionId}`),
  clearHistory: (sessionId: string) => request<void>(`/api/chat/${sessionId}`, { method: "DELETE" }),
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}
