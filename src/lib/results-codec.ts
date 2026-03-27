import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

export interface ExportedResults {
  scale: string;
  stories: Array<{
    title: string;
    estimate: string | null;
    votes: Record<string, string>; // playerName -> vote
  }>;
  exportedAt: string;
}

export function encodeResults(results: ExportedResults): string {
  const json = JSON.stringify(results);
  return compressToEncodedURIComponent(json);
}

export function decodeResults(compressed: string): ExportedResults {
  const clean = compressed.startsWith("#") ? compressed.slice(1) : compressed;
  const json = decompressFromEncodedURIComponent(clean);
  if (!json) throw new Error("Invalid or corrupted results data");
  return JSON.parse(json);
}
