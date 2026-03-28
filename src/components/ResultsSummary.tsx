import type { Player } from "../types/room";

interface Props {
  players: Player[];
  phase: "voting" | "revealed";
  scaleValues: string[];
  currentStoryId: string | null;
  isOwner: boolean;
  onSetEstimate: (storyId: string, value: string) => void;
}

export default function ResultsSummary({
  players,
  phase,
  scaleValues,
  currentStoryId,
  isOwner,
  onSetEstimate,
}: Props) {
  if (phase !== "revealed" || !currentStoryId) return null;

  const votes = players
    .filter((p) => p.vote !== null && p.vote !== "pass" && p.vote !== "?")
    .map((p) => p.vote!);

  const numericVotes = votes
    .map((v) => parseFloat(v))
    .filter((v) => !isNaN(v));

  const average =
    numericVotes.length > 0
      ? numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
      : null;

  const estimateOptions = scaleValues.filter(
    (v) => v !== "?" && v !== "pass"
  );

  return (
    <div className="flex flex-col items-center gap-4 border-t border-surface-lighter py-6">
      {average !== null && (
        <p className="text-lg text-text-muted">
          Average: <span className="text-2xl font-bold text-white">{average.toFixed(1)}</span>
        </p>
      )}
      {isOwner && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-text-muted">Set estimate</span>
          <div className="flex flex-wrap justify-center gap-2">
            {estimateOptions.map((value) => (
              <button
                key={value}
                onClick={() => onSetEstimate(currentStoryId, value)}
                className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-surface-lighter text-lg font-bold text-text-muted transition-all hover:border-primary hover:bg-primary/10 hover:text-white"
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
