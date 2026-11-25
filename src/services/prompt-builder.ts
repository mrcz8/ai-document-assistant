import type { ChatMessage, RetrievedChunk } from "@/domain/models";
import type { ChatTurn } from "@/domain/ports";

export const NOT_FOUND_ANSWER = "I don't know. I couldn't find that in the documents in this collection.";

const SYSTEM_PROMPT = `You are AI Document Assistant, an assistant that answers questions using only the provided document excerpts.

Rules:
- Use only facts stated in the excerpts. Never use outside knowledge.
- Cite every claim with the excerpt number in square brackets, like [1] or [2][3].
- If the excerpts do not contain the answer, reply exactly: "${NOT_FOUND_ANSWER}"
- Be concise. Answer in the same language as the question.`;

export class PromptBuilder {
  private readonly turns: ChatTurn[] = [{ role: "system", content: SYSTEM_PROMPT }];
  private context = "";
  private question = "";

  withHistory(history: ChatMessage[]): this {
    for (const message of history) {
      this.turns.push({ role: message.role, content: message.content });
    }
    return this;
  }

  withContext(chunks: RetrievedChunk[]): this {
    this.context = chunks
      .map((chunk, index) => {
        const location = chunk.page ? `${chunk.fileName}, page ${chunk.page}` : chunk.fileName;
        return `[${index + 1}] (${location})\n${chunk.content}`;
      })
      .join("\n\n---\n\n");
    return this;
  }

  withQuestion(question: string): this {
    this.question = question;
    return this;
  }

  build(): ChatTurn[] {
    return [
      ...this.turns,
      {
        role: "user",
        content: `Document excerpts:\n\n${this.context}\n\nQuestion: ${this.question}`,
      },
    ];
  }
}
