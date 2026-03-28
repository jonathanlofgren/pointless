import { useState } from "react";
import type { Story, Player } from "../types/room";
import { encodeResults, type ExportedResults } from "../lib/results-codec";
import AddStoryForm from "./AddStoryForm";

interface Props {
  stories: Story[];
  currentStoryId: string | null;
  viewingStoryId: string | null;
  players: Player[];
  scaleName: string;
  error?: string;
  isOwner: boolean;
  onAdd: (title: string) => void;
  onSelect: (storyId: string) => void;
  onRemove: (storyId: string) => void;
}

export default function StoryList({
  stories,
  currentStoryId,
  viewingStoryId,
  players,
  scaleName,
  error,
  isOwner,
  onAdd,
  onSelect,
  onRemove,
}: Props) {
  const pending = stories.filter(
    (s) => s.finalEstimate === null && s.id !== currentStoryId
  );
  const current = stories.find((s) => s.id === currentStoryId) ?? null;
  const completed = stories.filter((s) => s.finalEstimate !== null);

  return (
    <aside className="flex w-72 flex-col border-r border-surface-lighter bg-surface-light">
      <div className="border-b border-surface-lighter p-3">
        <h2 className="text-sm font-semibold text-text-muted">Stories</h2>
      </div>

      <AddStoryForm onAdd={onAdd} error={error} />

      <div className="flex-1 overflow-y-auto">
        {current && (
          <div className="px-3 pb-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">
              Now Estimating
            </p>
            <StoryItem
              story={current}
              isCurrent
              isOwner={isOwner}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          </div>
        )}

        {pending.length > 0 && (
          <div className="px-3 pb-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Up Next ({pending.length})
            </p>
            {pending.map((story) => (
              <StoryItem
                key={story.id}
                story={story}
                isCurrent={false}
                isOwner={isOwner}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div className="px-3 pb-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-success">
              Completed ({completed.length})
            </p>
            {completed.map((story) => (
              <StoryItem
                key={story.id}
                story={story}
                isCurrent={false}
                isViewing={story.id === viewingStoryId}
                isOwner={isOwner}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}

        {stories.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-text-muted">
            No stories yet. Add one above!
          </p>
        )}
      </div>

      {completed.length > 0 && <ExportButton stories={stories} players={players} scaleName={scaleName} />}
    </aside>
  );
}

function ExportButton({ stories, players, scaleName }: { stories: Story[]; players: Player[]; scaleName: string }) {
  const [copied, setCopied] = useState(false);

  function handleExport() {
    const playerMap = new Map(players.map((p) => [p.id, p.name]));
    const results: ExportedResults = {
      scale: scaleName,
      stories: stories.map((s) => ({
        title: s.title,
        estimate: s.finalEstimate,
        votes: Object.fromEntries(
          Object.entries(s.votes).map(([pid, vote]) => [
            playerMap.get(pid) ?? pid,
            vote,
          ])
        ),
      })),
      exportedAt: new Date().toISOString(),
    };

    const compressed = encodeResults(results);
    const url = `${window.location.origin}/results#${compressed}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="border-t border-surface-lighter p-3">
      <button
        onClick={handleExport}
        className="w-full rounded-lg border border-surface-lighter px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-primary hover:text-white"
      >
        {copied ? "Link Copied!" : "Export Results Link"}
      </button>
    </div>
  );
}

function StoryItem({
  story,
  isCurrent,
  isViewing,
  isOwner,
  onSelect,
  onRemove,
}: {
  story: Story;
  isCurrent: boolean;
  isViewing?: boolean;
  isOwner: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const isCompleted = story.finalEstimate !== null;
  const isClickable = !isCurrent && (isCompleted || isOwner);

  return (
    <div
      className={`group mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
        isCurrent
          ? "bg-accent/10 text-accent"
          : isViewing
            ? "bg-primary/10 text-primary"
            : isClickable
              ? isCompleted
                ? "cursor-pointer text-text-muted hover:bg-surface-lighter"
                : "cursor-pointer text-text hover:bg-surface-lighter"
              : "text-text"
      }`}
      onClick={() => isClickable && onSelect(story.id)}
    >
      <span className="min-w-0 flex-1 truncate">{story.title}</span>
      {isCompleted && (
        <span className="rounded bg-success/20 px-1.5 py-0.5 text-xs font-bold text-success">
          {story.finalEstimate}
        </span>
      )}
      {isOwner && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(story.id);
          }}
          className="hidden rounded text-text-muted hover:text-danger group-hover:block"
          title="Remove story"
        >
          &times;
        </button>
      )}
    </div>
  );
}
