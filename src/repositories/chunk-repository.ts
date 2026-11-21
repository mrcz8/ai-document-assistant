import type { EmbeddedChunk, RetrievedChunk } from "@/domain/models";
import { type Database, toVectorLiteral } from "@/infrastructure/database/database";

interface RetrievedRow {
  document_id: string;
  file_name: string;
  page: number | null;
  content: string;
  similarity: number;
}

export interface SimilarityQuery {
  collectionId: string;
  embedding: number[];
  limit: number;
}

export class ChunkRepository {
  constructor(private readonly db: Database) {}

  async replaceForDocument(documentId: string, collectionId: string, chunks: EmbeddedChunk[]): Promise<void> {
    await this.db.transaction(async (client) => {
      await client.query(`DELETE FROM chunks WHERE document_id = $1`, [documentId]);
      for (const chunk of chunks) {
        await client.query(
          `INSERT INTO chunks (document_id, collection_id, chunk_index, page, content, embedding)
           VALUES ($1, $2, $3, $4, $5, $6::vector)`,
          [documentId, collectionId, chunk.index, chunk.page, chunk.content, toVectorLiteral(chunk.embedding)],
        );
      }
    });
  }

  async searchSimilar(query: SimilarityQuery): Promise<RetrievedChunk[]> {
    const rows = await this.db.query<RetrievedRow>(
      `SELECT c.document_id, d.file_name, c.page, c.content,
              1 - (c.embedding <=> $2::vector) AS similarity
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE c.collection_id = $1 AND d.status = 'ready'
       ORDER BY c.embedding <=> $2::vector
       LIMIT $3`,
      [query.collectionId, toVectorLiteral(query.embedding), query.limit],
    );

    return rows.map((row) => ({
      documentId: row.document_id,
      fileName: row.file_name,
      page: row.page,
      content: row.content,
      similarity: Number(row.similarity),
    }));
  }
}
