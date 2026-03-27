import type { Player } from "../types/room";

interface Props {
  players: Player[];
  phase: "voting" | "revealed";
  scaleValues: string[];
  currentStoryId: string | null;
  onSetEstimate: (storyId: string, value: string) => void;
}

export default function ResultsSummary({
  players,
  phase,
  scaleValues,
  currentStoryId,
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

  // Find the closest scale value to the average
  const estimateOptions = scaleValues.filter(
    (v) => v !== "?" && v !== "pass"
  );

  return (
    <div className="flex flex-col items-center gap-3 border-t border-surface-lighter py-4">
      {average !== null && (
        <p className="text-sm text-text-muted">
          Average: <span className="font-bold text-white">{average.toFixed(1)}</span>
        </p>
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">Set estimate:</span>
        <div className="flex gap-1">
          {estimateOptions.map((value) => (
            <button
              key={value}
              onClick={() => onSetEstimate(currentStoryId, value)}
              className="rounded border border-surface-lighter px-2 py-1 text-xs text-text-muted transition-colors hover:border-primary hover:text-white"
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
