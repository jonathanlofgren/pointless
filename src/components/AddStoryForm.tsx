import { useState } from "react";

interface Props {
  onAdd: (title: string) => void;
}

export default function AddStoryForm({ onAdd }: Props) {
  const [title, setTitle] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title.trim());
      setTitle("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-3">
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
    </form>
  );
}
