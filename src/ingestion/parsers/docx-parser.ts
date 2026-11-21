import mammoth from "mammoth";
import type { PageText } from "@/domain/models";
import type { DocumentParser } from "@/domain/ports";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class DocxParser implements DocumentParser {
  supports(fileName: string, mimeType: string): boolean {
    return mimeType === DOCX_MIME || fileName.toLowerCase().endsWith(".docx");
  }

  async parse(buffer: Buffer): Promise<PageText[]> {
    const { value } = await mammoth.extractRawText({ buffer });
    return [{ page: null, text: value }];
  }
}
