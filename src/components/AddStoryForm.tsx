import { useState, useRef, useEffect } from "react";

interface Props {
  onAdd: (title: string) => void;
  onOpenBulkImport: () => void;
  error?: string;
}

export default function AddStoryForm({ onAdd, onOpenBulkImport, error }: Props) {
  const [title, setTitle] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim());
      setTitle("");
    }
  }

  return (
    <div className="p-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a story..."
          className="min-w-0 flex-1 rounded-lg border-2 border-surface-lighter bg-surface px-3 py-1.5 text-sm text-text outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
        >
          Add
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg border border-surface-lighter p-1.5 text-text-muted transition-colors hover:border-primary hover:text-white"
            title="More options"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 4h14v2H3V4zm0 5h14v2H3V9zm0 5h14v2H3v-2z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-surface-lighter bg-surface-light py-1 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenBulkImport();
                }}
                className="w-full px-3 py-2 text-left text-sm text-text-muted transition-colors hover:bg-surface-lighter hover:text-white"
              >
                Bulk Import
              </button>
            </div>
          )}
        </div>
      </form>
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
