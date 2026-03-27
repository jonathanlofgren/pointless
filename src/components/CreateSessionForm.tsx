import { useState } from "react";
import { SCALES } from "../lib/scales";

interface Props {
  onCreate: (scaleId: string) => void;
}

export default function CreateSessionForm({ onCreate }: Props) {
  const [scaleId, setScaleId] = useState("fibonacci");

  return (
    <div className="w-full max-w-md rounded-xl bg-surface-light p-6">
      <label className="mb-3 block text-sm font-medium text-text-muted">
        Point Scale
      </label>
      <div className="mb-6 grid grid-cols-2 gap-2">
        {SCALES.map((scale) => (
          <button
            key={scale.id}
            onClick={() => setScaleId(scale.id)}
            className={`rounded-lg border-2 px-3 py-2 text-sm transition-colors ${
              scaleId === scale.id
                ? "border-primary bg-primary/10 text-white"
                : "border-surface-lighter text-text-muted hover:border-primary/50"
            }`}
          >
            <div className="font-medium">{scale.label}</div>
            <div className="mt-1 text-xs opacity-70">
              {scale.values.slice(0, 5).join(", ")}...
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={() => onCreate(scaleId)}
        className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        Create Session
      </button>
    </div>
  );
}
