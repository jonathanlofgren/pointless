import { useState } from "react";
import type { PointScale } from "../types/room";

interface Props {
  roomId: string;
  scale: PointScale;
  playerCount: number;
  onToggleSidebar: () => void;
  storyCount: number;
}

export default function RoomHeader({ roomId, scale, playerCount, onToggleSidebar, storyCount }: Props) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <header className="flex items-center justify-between border-b border-surface-lighter px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded p-1 text-text-muted hover:text-white lg:hidden"
          title="Toggle stories"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
          {storyCount > 0 && (
            <span className="ml-1 text-xs">{storyCount}</span>
          )}
        </button>
        <h1 className="text-lg font-bold">Pointless</h1>
        <span className="rounded-md bg-surface-lighter px-2 py-0.5 text-xs text-text-muted">
          {scale.label}
        </span>
        <span className="hidden text-xs text-text-muted sm:inline">
          {playerCount} player{playerCount !== 1 ? "s" : ""}
        </span>
      </div>
      <button
        onClick={copyLink}
        className="rounded-lg border border-surface-lighter px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-primary hover:text-white"
      >
        {copied ? "Copied!" : "Copy Invite Link"}
      </button>
    </header>
  );
}
