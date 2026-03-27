import VoteCard from "./VoteCard";

interface Props {
  scale: string[];
  myVote: string | null;
  phase: "voting" | "revealed";
  hasCurrentStory: boolean;
  onVote: (value: string) => void;
}

export default function VotingArea({ scale, myVote, phase, hasCurrentStory, onVote }: Props) {
  if (!hasCurrentStory) {
    return (
      <div className="flex flex-1 items-center justify-center text-text-muted">
        <p>Add a story to start estimating</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <p className="text-sm text-text-muted">
        {phase === "voting"
          ? myVote
            ? "Vote cast! Waiting for others..."
            : "Pick your estimate"
          : "Votes revealed!"}
      </p>
      <div className="flex flex-wrap justify-center gap-2 px-4">
        {scale.map((value) => (
          <VoteCard
            key={value}
            value={value}
            selected={myVote === value}
            disabled={phase === "revealed"}
            onClick={() => onVote(value)}
          />
        ))}
      </div>
    </div>
  );
}
