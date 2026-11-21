import { z } from "zod";

const schema = z.object({
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(5433),
  DB_DATABASE: z.string().default("docmind"),
  DB_USERNAME: z.string().default("docmind"),
  DB_PASSWORD: z.string().default("secret"),
  OLLAMA_BASE_URL: z.url().default("http://localhost:11434"),
  OLLAMA_CHAT_MODEL: z.string().default("qwen2.5:7b"),
  OLLAMA_EMBED_MODEL: z.string().default("nomic-embed-text"),
  RETRIEVAL_TOP_K: z.coerce.number().int().min(1).max(20).default(5),
  RETRIEVAL_MIN_SIMILARITY: z.coerce.number().min(0).max(1).default(0.45),
  CHUNK_SIZE: z.coerce.number().int().min(200).default(3200),
  CHUNK_OVERLAP: z.coerce.number().int().min(0).default(400),
  STORAGE_DIR: z.string().default("./storage/uploads"),
});

export type AppConfig = z.infer<typeof schema>;

let cached: AppConfig | undefined;

export function config(): AppConfig {
  cached ??= schema.parse(process.env);
  return cached;
}
