import type { PageText, TextChunk } from "@/domain/models";
import type { TextChunker } from "@/domain/ports";

const SEPARATORS = ["\n\n", "\n", ". ", " ", ""];

export class RecursiveTextChunker implements TextChunker {
  constructor(
    private readonly chunkSize: number,
    private readonly chunkOverlap: number,
  ) {
    if (chunkOverlap >= chunkSize) {
      throw new Error("Chunk overlap must be smaller than chunk size");
    }
  }

  split(pages: PageText[]): TextChunk[] {
    const chunks: TextChunk[] = [];
    for (const page of pages) {
      const text = normalize(page.text);
      if (!text) continue;
      for (const content of this.splitText(text)) {
        chunks.push({ index: chunks.length, page: page.page, content });
      }
    }
    return chunks;
  }

  private splitText(text: string): string[] {
    const pieces = this.splitRecursively(text, SEPARATORS);
    return this.mergeWithOverlap(pieces);
  }

  private splitRecursively(text: string, separators: string[]): string[] {
    if (text.length <= this.chunkSize) return [text];

    const [separator, ...rest] = separators;
    if (separator === "") {
      const slices: string[] = [];
      for (let start = 0; start < text.length; start += this.chunkSize) {
        slices.push(text.slice(start, start + this.chunkSize));
      }
      return slices;
    }

    return text
      .split(separator)
      .filter((part) => part.length > 0)
      .flatMap((part, index, parts) => {
        const withSeparator = index < parts.length - 1 ? part + separator : part;
        return this.splitRecursively(withSeparator, rest);
      });
  }

  private mergeWithOverlap(pieces: string[]): string[] {
    const chunks: string[] = [];
    let current = "";

    for (const piece of pieces) {
      if (current.length + piece.length > this.chunkSize && current.length > 0) {
        chunks.push(current.trim());
        const overlap = this.tail(current);
        current = overlap.length + piece.length > this.chunkSize ? "" : overlap;
      }
      current += piece;
    }

    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  private tail(text: string): string {
    if (this.chunkOverlap === 0) return "";
    const slice = text.slice(-this.chunkOverlap);
    const boundary = slice.search(/\s/);
    return boundary === -1 ? slice : slice.slice(boundary + 1);
  }
}

function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
