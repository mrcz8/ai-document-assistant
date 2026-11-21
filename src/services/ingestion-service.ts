import type { StoredDocument } from "@/domain/models";
import type { EmbeddingProvider, FileStorage, TextChunker } from "@/domain/ports";
import type { ParserFactory } from "@/ingestion/parsers/parser-factory";
import type { ChunkRepository } from "@/repositories/chunk-repository";
import type { DocumentRepository } from "@/repositories/document-repository";

export class IngestionService {
  constructor(
    private readonly storage: FileStorage,
    private readonly parsers: ParserFactory,
    private readonly chunker: TextChunker,
    private readonly embeddings: EmbeddingProvider,
    private readonly documents: DocumentRepository,
    private readonly chunks: ChunkRepository,
  ) {}

  async ingest(document: StoredDocument): Promise<void> {
    try {
      const buffer = await this.storage.read(document.storagePath);
      const pages = await this.parsers.create(document.fileName, document.mimeType).parse(buffer);
      const textChunks = this.chunker.split(pages);

      if (textChunks.length === 0) {
        throw new Error("No readable text found. Scanned PDFs need OCR before upload.");
      }

      const vectors = await this.embeddings.embedDocuments(textChunks.map((chunk) => chunk.content));
      const embedded = textChunks.map((chunk, index) => ({ ...chunk, embedding: vectors[index] }));

      await this.chunks.replaceForDocument(document.id, document.collectionId, embedded);
      await this.documents.markReady(document.id, pages.length, embedded.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown ingestion error";
      await this.documents.markFailed(document.id, message);
    }
  }
}
