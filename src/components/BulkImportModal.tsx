import { useState } from "react";

interface Props {
  onImport: (titles: string[]) => void;
  onClose: () => void;
}

function parseLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function BulkImportModal({ onImport, onClose }: Props) {
  const [text, setText] = useState("");

  const lines = parseLines(text);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length > 0) {
      onImport(lines);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-lg flex-col rounded-xl bg-surface-light p-6"
      >
        <h2 className="mb-4 text-xl font-bold">Bulk Import Stories</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Paste stories here, one per line...\n\nExample:\nUser login flow\nDashboard redesign\nPROJ-123 Payment integration"}
          autoFocus
          rows={10}
          className="mb-3 w-full resize-y rounded-lg border-2 border-surface-lighter bg-surface px-4 py-3 text-sm text-text outline-none focus:border-primary"
        />
        <p className="mb-4 text-sm text-text-muted">
          {lines.length === 0
            ? "No stories to import"
            : `${lines.length} stor${lines.length === 1 ? "y" : "ies"} to import`}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-surface-lighter px-4 py-2 text-sm text-text-muted transition-colors hover:border-primary hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={lines.length === 0}
            className="flex-1 rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
          >
            Import {lines.length > 0 ? `${lines.length} stor${lines.length === 1 ? "y" : "ies"}` : ""}
          </button>
        </div>
      </form>
    </div>
  );
}
