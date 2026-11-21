import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { config } from "@/config/env";

export class Database {
  private readonly pool: Pool;

  private constructor() {
    const env = config();
    this.pool = new Pool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_DATABASE,
      user: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      max: 10,
    });
  }

  static getInstance(): Database {
    const holder = globalThis as typeof globalThis & { __docmindDatabase?: Database };
    holder.__docmindDatabase ??= new Database();
    return holder.__docmindDatabase;
  }

  async query<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.pool.query<T>(sql, params);
    return result.rows;
  }

  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
