import { extractText, getDocumentProxy } from "unpdf";
import type { PageText } from "@/domain/models";
import type { DocumentParser } from "@/domain/ports";

export class PdfParser implements DocumentParser {
  supports(fileName: string, mimeType: string): boolean {
    return mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf");
  }

  async parse(buffer: Buffer): Promise<PageText[]> {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: false });
    return text.map((pageText, index) => ({ page: index + 1, text: pageText }));
  }
}
