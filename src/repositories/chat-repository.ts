import type { ChatMessage, MessageRole, Source } from "@/domain/models";
import type { Database } from "@/infrastructure/database/database";

interface MessageRow {
  id: string;
  session_id: string;
  collection_id: string;
  role: MessageRole;
  content: string;
  sources: Source[];
  created_at: Date;
}

export interface NewMessage {
  sessionId: string;
  collectionId: string;
  role: MessageRole;
  content: string;
  sources?: Source[];
}

export class ChatRepository {
  constructor(private readonly db: Database) {}

  async findBySession(sessionId: string): Promise<ChatMessage[]> {
    const rows = await this.db.query<MessageRow>(
      `SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at, id`,
      [sessionId],
    );
    return rows.map(toMessage);
  }

  async findRecent(sessionId: string, limit: number): Promise<ChatMessage[]> {
    const rows = await this.db.query<MessageRow>(
      `SELECT * FROM (
         SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2
       ) recent ORDER BY created_at, id`,
      [sessionId, limit],
    );
    return rows.map(toMessage);
  }

  async append(message: NewMessage): Promise<ChatMessage> {
    const [row] = await this.db.query<MessageRow>(
      `INSERT INTO chat_messages (session_id, collection_id, role, content, sources)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING *`,
      [message.sessionId, message.collectionId, message.role, message.content, JSON.stringify(message.sources ?? [])],
    );
    return toMessage(row);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db.query(`DELETE FROM chat_messages WHERE session_id = $1`, [sessionId]);
  }
}

function toMessage(row: MessageRow): ChatMessage {
  return {
    id: Number(row.id),
    sessionId: row.session_id,
    collectionId: row.collection_id,
    role: row.role,
    content: row.content,
    sources: row.sources,
    createdAt: row.created_at.toISOString(),
  };
}
