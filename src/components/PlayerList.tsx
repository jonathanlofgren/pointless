import type { Player } from "../types/room";

interface Props {
  players: Player[];
  phase: "voting" | "revealed";
  currentPlayerId: string;
}

export default function PlayerList({ players, phase, currentPlayerId }: Props) {
  const connected = players.filter((p) => p.isConnected);

  if (connected.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 px-4 py-6">
      {connected.map((player) => {
        const isMe = player.id === currentPlayerId;
        const hasVoted = player.vote !== null;
        const showVote = phase === "revealed" && hasVoted;

        return (
          <div
            key={player.id}
            className="flex flex-col items-center gap-2"
          >
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-xl border-2 text-xl font-bold transition-all ${
                showVote
                  ? "animate-card-reveal border-primary bg-primary/20 text-white"
                  : hasVoted
                    ? "border-success/50 bg-success/10 text-success"
                    : "border-surface-lighter text-text-muted"
              }`}
            >
              {showVote
                ? player.vote === "pass"
                  ? "☕"
                  : player.vote
                : hasVoted
                  ? "✓"
                  : "·"}
            </div>
            <span
              className={`max-w-36 truncate text-sm ${
                isMe ? "font-bold text-primary" : "text-text-muted"
              }`}
            >
              {player.name}
              {isMe ? " (you)" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
