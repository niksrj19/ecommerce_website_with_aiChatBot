export class DocumentChunker {
  static chunkText(text: string, chunkSize = 512, overlap = 50): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let i = 0;

    while (i < words.length) {
      const chunk = words.slice(i, i + chunkSize).join(" ");
      chunks.push(chunk);
      i += chunkSize - overlap;
    }

    return chunks;
  }
}