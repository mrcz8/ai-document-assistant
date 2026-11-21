import type { PageText, TextChunk } from "./models";

export interface EmbeddingProvider {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatModel {
  complete(turns: ChatTurn[]): Promise<string>;
}

export interface DocumentParser {
  supports(fileName: string, mimeType: string): boolean;
  parse(buffer: Buffer): Promise<PageText[]>;
}

export interface TextChunker {
  split(pages: PageText[]): TextChunk[];
}

export interface FileStorage {
  save(fileName: string, buffer: Buffer): Promise<string>;
  read(storagePath: string): Promise<Buffer>;
  remove(storagePath: string): Promise<void>;
}

export interface TaskScheduler {
  schedule(task: () => Promise<void>): void;
}
