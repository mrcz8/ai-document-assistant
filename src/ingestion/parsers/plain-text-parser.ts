import type { PageText } from "@/domain/models";
import type { DocumentParser } from "@/domain/ports";

const EXTENSIONS = [".txt", ".md", ".markdown"];
const MIME_TYPES = ["text/plain", "text/markdown", "text/x-markdown"];

export class PlainTextParser implements DocumentParser {
  supports(fileName: string, mimeType: string): boolean {
    const name = fileName.toLowerCase();
    return MIME_TYPES.includes(mimeType) || EXTENSIONS.some((extension) => name.endsWith(extension));
  }

  async parse(buffer: Buffer): Promise<PageText[]> {
    return [{ page: null, text: buffer.toString("utf8") }];
  }
}
