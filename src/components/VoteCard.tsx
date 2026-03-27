interface Props {
  value: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}

export default function VoteCard({ value, selected, disabled, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-20 w-14 items-center justify-center rounded-lg border-2 text-lg font-bold transition-all sm:h-24 sm:w-16 ${
        selected
          ? "border-primary bg-primary/20 text-white -translate-y-2 shadow-lg shadow-primary/25"
          : disabled
            ? "border-surface-lighter text-text-muted opacity-50"
            : "border-surface-lighter text-text-muted hover:border-primary/50 hover:text-white hover:-translate-y-1"
      }`}
    >
      {value === "pass" ? "☕" : value}
    </button>
  );
}
