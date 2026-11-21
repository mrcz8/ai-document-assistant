import type { DocumentStatus, StoredDocument } from "@/domain/models";
import type { Database } from "@/infrastructure/database/database";

interface DocumentRow {
  id: string;
  collection_id: string;
  file_name: string;
  mime_type: string;
  storage_path: string;
  size_bytes: string;
  status: DocumentStatus;
  error: string | null;
  page_count: number;
  chunk_count: number;
  uploaded_at: Date;
  indexed_at: Date | null;
}

export interface NewDocument {
  collectionId: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  sizeBytes: number;
}

export class DocumentRepository {
  constructor(private readonly db: Database) {}

  async findByCollection(collectionId: string): Promise<StoredDocument[]> {
    const rows = await this.db.query<DocumentRow>(
      `SELECT * FROM documents WHERE collection_id = $1 ORDER BY uploaded_at DESC`,
      [collectionId],
    );
    return rows.map(toDocument);
  }

  async findById(id: string): Promise<StoredDocument | null> {
    const rows = await this.db.query<DocumentRow>(`SELECT * FROM documents WHERE id = $1`, [id]);
    return rows[0] ? toDocument(rows[0]) : null;
  }

  async findStoragePathsByCollection(collectionId: string): Promise<string[]> {
    const rows = await this.db.query<{ storage_path: string }>(
      `SELECT storage_path FROM documents WHERE collection_id = $1`,
      [collectionId],
    );
    return rows.map((row) => row.storage_path);
  }

  async create(input: NewDocument): Promise<StoredDocument> {
    const [row] = await this.db.query<DocumentRow>(
      `INSERT INTO documents (collection_id, file_name, mime_type, storage_path, size_bytes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.collectionId, input.fileName, input.mimeType, input.storagePath, input.sizeBytes],
    );
    return toDocument(row);
  }

  async markProcessing(id: string): Promise<void> {
    await this.db.query(
      `UPDATE documents SET status = 'processing', error = NULL WHERE id = $1`,
      [id],
    );
  }

  async markReady(id: string, pageCount: number, chunkCount: number): Promise<void> {
    await this.db.query(
      `UPDATE documents
       SET status = 'ready', error = NULL, page_count = $2, chunk_count = $3, indexed_at = now()
       WHERE id = $1`,
      [id, pageCount, chunkCount],
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.db.query(
      `UPDATE documents SET status = 'failed', error = $2 WHERE id = $1`,
      [id, error],
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.query(`DELETE FROM documents WHERE id = $1`, [id]);
  }
}

function toDocument(row: DocumentRow): StoredDocument {
  return {
    id: row.id,
    collectionId: row.collection_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    storagePath: row.storage_path,
    sizeBytes: Number(row.size_bytes),
    status: row.status,
    error: row.error,
    pageCount: row.page_count,
    chunkCount: row.chunk_count,
    uploadedAt: row.uploaded_at.toISOString(),
    indexedAt: row.indexed_at?.toISOString() ?? null,
  };
}
