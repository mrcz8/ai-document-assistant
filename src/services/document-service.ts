import { NotFoundError, UnsupportedFileError, ValidationError } from "@/domain/errors";
import type { StoredDocument } from "@/domain/models";
import type { FileStorage, TaskScheduler } from "@/domain/ports";
import type { ParserFactory } from "@/ingestion/parsers/parser-factory";
import type { DocumentRepository } from "@/repositories/document-repository";
import type { CollectionService } from "./collection-service";
import type { IngestionService } from "./ingestion-service";

const MAX_FILE_BYTES = 50 * 1024 * 1024;

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export class DocumentService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly collections: CollectionService,
    private readonly storage: FileStorage,
    private readonly parsers: ParserFactory,
    private readonly ingestion: IngestionService,
    private readonly scheduler: TaskScheduler,
  ) {}

  async list(collectionId: string): Promise<StoredDocument[]> {
    await this.collections.get(collectionId);
    return this.documents.findByCollection(collectionId);
  }

  async upload(collectionId: string, files: UploadedFile[]): Promise<StoredDocument[]> {
    await this.collections.get(collectionId);
    if (files.length === 0) {
      throw new ValidationError("Select at least one file to upload");
    }
    files.forEach((file) => this.assertAcceptable(file));

    const created: StoredDocument[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const storagePath = await this.storage.save(file.name, buffer);
      const document = await this.documents.create({
        collectionId,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        storagePath,
        sizeBytes: file.size,
      });
      this.scheduler.schedule(() => this.ingestion.ingest(document));
      created.push(document);
    }
    return created;
  }

  async reindex(id: string): Promise<StoredDocument> {
    const document = await this.get(id);
    await this.documents.markProcessing(id);
    this.scheduler.schedule(() => this.ingestion.ingest(document));
    return { ...document, status: "processing", error: null };
  }

  async remove(id: string): Promise<void> {
    const document = await this.get(id);
    await this.documents.delete(id);
    await this.storage.remove(document.storagePath);
  }

  private async get(id: string): Promise<StoredDocument> {
    const document = await this.documents.findById(id);
    if (!document) throw new NotFoundError("Document", id);
    return document;
  }

  private assertAcceptable(file: UploadedFile): void {
    if (!this.parsers.isSupported(file.name, file.type)) {
      throw new UnsupportedFileError(file.name);
    }
    if (file.size === 0) {
      throw new ValidationError(`'${file.name}' is empty`);
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new ValidationError(`'${file.name}' is larger than 50 MB`);
    }
  }
}
