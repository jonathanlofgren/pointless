import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { PointScale } from "../types/room";

interface Props {
  roomId: string;
  scale: PointScale;
  playerCount: number;
  onToggleSidebar: () => void;
  storyCount: number;
  connected: boolean;
}

export default function RoomHeader({ roomId, scale, playerCount, onToggleSidebar, storyCount, connected }: Props) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const inviteUrl = `${window.location.origin}/room/${roomId}`;

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
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
        {!connected && (
          <span className="rounded-md bg-danger/20 px-2 py-0.5 text-xs text-danger">
            Reconnecting...
          </span>
        )}
      </div>
      <div className="relative flex items-center gap-2">
        <button
          onClick={() => setShowQR(!showQR)}
          className="rounded-lg border border-surface-lighter p-1.5 text-text-muted transition-colors hover:border-primary hover:text-white"
          title="Show QR code"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-2h-2v3h-3v2h3v3h2v-3h3v-2h-3v-3zm0 0h2v-2h-2v2zm-4 6h2v-2h-2v2zm4 0h2v-2h-2v2z"/>
          </svg>
        </button>
        <button
          onClick={copyLink}
          className="rounded-lg border border-surface-lighter px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-primary hover:text-white"
        >
          {copied ? "Copied!" : "Copy Invite Link"}
        </button>

        {showQR && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowQR(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-2 flex flex-col items-center gap-3 rounded-xl bg-surface-light p-5 shadow-xl">
              <p className="text-sm font-medium">Scan to join</p>
              <div className="rounded-lg bg-white p-3">
                <QRCodeSVG value={inviteUrl} size={180} />
              </div>
              <p className="max-w-[200px] break-all text-center text-xs text-text-muted">
                {inviteUrl}
              </p>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
