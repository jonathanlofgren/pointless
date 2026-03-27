import type { Player } from "../types/room";

interface Props {
  phase: "voting" | "revealed";
  players: Player[];
  hasCurrentStory: boolean;
  onReveal: () => void;
  onClear: () => void;
}

export default function RevealButton({
  phase,
  players,
  hasCurrentStory,
  onReveal,
  onClear,
}: Props) {
  if (!hasCurrentStory) return null;

  const connectedPlayers = players.filter((p) => p.isConnected);
  const votedCount = connectedPlayers.filter((p) => p.vote !== null).length;
  const totalCount = connectedPlayers.length;

  if (phase === "voting") {
    return (
      <div className="flex flex-col items-center gap-2 pb-4">
        <span className="text-xs text-text-muted">
          {votedCount}/{totalCount} voted
        </span>
        <button
          onClick={onReveal}
          disabled={votedCount === 0}
          className="rounded-lg bg-accent px-6 py-2 font-semibold text-black transition-colors hover:bg-amber-400 disabled:opacity-40"
        >
          Reveal Cards
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 pb-4">
      <button
        onClick={onClear}
        className="rounded-lg border border-surface-lighter px-4 py-2 text-sm text-text-muted transition-colors hover:border-primary hover:text-white"
      >
        Re-vote
      </button>
    </div>
  );
}
