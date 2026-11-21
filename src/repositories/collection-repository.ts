import type { Collection } from "@/domain/models";
import type { Database } from "@/infrastructure/database/database";

interface CollectionRow {
  id: string;
  name: string;
  document_count: string;
  created_at: Date;
}

const SELECT_COLLECTIONS = `
  SELECT c.id, c.name, c.created_at, COUNT(d.id) AS document_count
  FROM collections c
  LEFT JOIN documents d ON d.collection_id = c.id
`;

export class CollectionRepository {
  constructor(private readonly db: Database) {}

  async findAll(): Promise<Collection[]> {
    const rows = await this.db.query<CollectionRow>(
      `${SELECT_COLLECTIONS} GROUP BY c.id ORDER BY c.created_at`,
    );
    return rows.map(toCollection);
  }

  async findById(id: string): Promise<Collection | null> {
    const rows = await this.db.query<CollectionRow>(
      `${SELECT_COLLECTIONS} WHERE c.id = $1 GROUP BY c.id`,
      [id],
    );
    return rows[0] ? toCollection(rows[0]) : null;
  }

  async findByName(name: string): Promise<Collection | null> {
    const rows = await this.db.query<CollectionRow>(
      `${SELECT_COLLECTIONS} WHERE lower(c.name) = lower($1) GROUP BY c.id`,
      [name],
    );
    return rows[0] ? toCollection(rows[0]) : null;
  }

  async create(name: string): Promise<Collection> {
    const [row] = await this.db.query<CollectionRow>(
      `INSERT INTO collections (name) VALUES ($1)
       RETURNING id, name, created_at, 0 AS document_count`,
      [name],
    );
    return toCollection(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.query(`DELETE FROM collections WHERE id = $1`, [id]);
  }
}

function toCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    documentCount: Number(row.document_count),
    createdAt: row.created_at.toISOString(),
  };
}
