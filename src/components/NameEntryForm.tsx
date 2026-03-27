import { useState } from "react";

interface Props {
  onSubmit: (name: string) => void;
  suggestedName?: string;
}

export default function NameEntryForm({ onSubmit, suggestedName }: Props) {
  const [name, setName] = useState(suggestedName ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSubmit(name.trim());
        }}
        className="w-full max-w-sm rounded-xl bg-surface-light p-6"
      >
        <h2 className="mb-4 text-xl font-bold">Join Session</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          autoFocus
          className="mb-4 w-full rounded-lg border-2 border-surface-lighter bg-surface px-4 py-2 text-text outline-none focus:border-primary"
          maxLength={30}
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-40"
        >
          Join
        </button>
      </form>
    </div>
  );
}
