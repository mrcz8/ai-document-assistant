import { UpstreamServiceError } from "@/domain/errors";
import type { ChatModel, ChatTurn, EmbeddingProvider } from "@/domain/ports";

interface OllamaOptions {
  baseUrl: string;
  chatModel: string;
  embedModel: string;
}

const EMBED_BATCH_SIZE = 16;
const DOCUMENT_PREFIX = "search_document: ";
const QUERY_PREFIX = "search_query: ";

export class OllamaClient implements EmbeddingProvider, ChatModel {
  constructor(private readonly options: OllamaOptions) {}

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let start = 0; start < texts.length; start += EMBED_BATCH_SIZE) {
      const batch = texts.slice(start, start + EMBED_BATCH_SIZE).map((text) => DOCUMENT_PREFIX + text);
      vectors.push(...(await this.embed(batch)));
    }
    return vectors;
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([QUERY_PREFIX + text]);
    return vector;
  }

  async complete(turns: ChatTurn[]): Promise<string> {
    const body = await this.post<{ message: { content: string } }>("/api/chat", {
      model: this.options.chatModel,
      messages: turns,
      stream: false,
      options: { temperature: 0.1, num_ctx: 8192 },
    });
    return body.message.content.trim();
  }

  private async embed(input: string[]): Promise<number[][]> {
    const body = await this.post<{ embeddings: number[][] }>("/api/embed", {
      model: this.options.embedModel,
      input,
    });
    return body.embeddings;
  }

  private async post<T>(path: string, payload: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetch(new URL(path, this.options.baseUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new UpstreamServiceError(`Cannot reach Ollama at ${this.options.baseUrl}. Is it running?`);
    }

    if (!response.ok) {
      const detail = await response.text();
      throw new UpstreamServiceError(`Ollama ${path} failed (${response.status}): ${detail}`);
    }

    return (await response.json()) as T;
  }
}
