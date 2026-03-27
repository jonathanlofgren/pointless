import type { Story, Player } from "../types/room";

interface Props {
  story: Story;
  players: Player[];
  onReEstimate: (storyId: string) => void;
}

export default function CompletedStoryView({
  story,
  players,
  onReEstimate,
}: Props) {
  const playerMap = new Map(players.map((p) => [p.id, p.name]));
  const voteEntries = Object.entries(story.votes).map(([pid, vote]) => ({
    name: playerMap.get(pid) ?? pid,
    vote,
  }));

  const numericVotes = voteEntries
    .map((v) => parseFloat(v.vote))
    .filter((v) => !isNaN(v));
  const average =
    numericVotes.length > 0
      ? numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
      : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium uppercase tracking-wider text-success">
          Estimated
        </span>
        <span className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-success bg-success/10 text-4xl font-bold text-success">
          {story.finalEstimate}
        </span>
      </div>

      {voteEntries.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-text-muted">
            {average !== null && `Average: ${average.toFixed(1)} · `}
            {voteEntries.length} vote{voteEntries.length !== 1 ? "s" : ""}
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {voteEntries.map(({ name, vote }) => (
              <div
                key={name}
                className="flex items-center gap-1.5 rounded-lg bg-surface-lighter px-3 py-1.5 text-sm"
              >
                <span className="text-text-muted">{name}</span>
                <span className="font-bold text-white">
                  {vote === "pass" ? "☕" : vote}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => onReEstimate(story.id)}
        className="rounded-lg border border-surface-lighter px-4 py-2 text-sm text-text-muted transition-colors hover:border-primary hover:text-white"
      >
        Re-estimate this story
      </button>
    </div>
  );
}
