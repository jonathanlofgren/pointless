interface Props {
  estimate: string;
  hasNextStory: boolean;
  onNext: () => void;
}

export default function EstimateConfirmation({
  estimate,
  hasNextStory,
  onNext,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-4 border-t border-surface-lighter py-6">
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-medium uppercase tracking-wider text-success">
          Agreed Estimate
        </span>
        <span className="flex h-16 w-16 items-center justify-center rounded-xl border-3 border-success bg-success/10 text-3xl font-bold text-success">
          {estimate}
        </span>
      </div>
      {hasNextStory && (
        <button
          onClick={onNext}
          className="rounded-lg bg-primary px-6 py-2 font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          Next Story
        </button>
      )}
    </div>
  );
}
