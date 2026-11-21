export type DocumentStatus = "processing" | "ready" | "failed";

export type MessageRole = "user" | "assistant";

export interface Collection {
  id: string;
  name: string;
  documentCount: number;
  createdAt: string;
}

export interface StoredDocument {
  id: string;
  collectionId: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  sizeBytes: number;
  status: DocumentStatus;
  error: string | null;
  pageCount: number;
  chunkCount: number;
  uploadedAt: string;
  indexedAt: string | null;
}

export interface PageText {
  page: number | null;
  text: string;
}

export interface TextChunk {
  index: number;
  page: number | null;
  content: string;
}

export interface EmbeddedChunk extends TextChunk {
  embedding: number[];
}

export interface RetrievedChunk {
  documentId: string;
  fileName: string;
  page: number | null;
  content: string;
  similarity: number;
}

export interface Source {
  index: number;
  documentId: string;
  fileName: string;
  page: number | null;
  excerpt: string;
  similarity: number;
}

export interface ChatMessage {
  id: number;
  sessionId: string;
  collectionId: string;
  role: MessageRole;
  content: string;
  sources: Source[];
  createdAt: string;
}

export interface ChatAnswer {
  answer: string;
  sources: Source[];
  grounded: boolean;
}
