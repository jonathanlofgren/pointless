import { useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useRoom } from "../hooks/useRoom";
import { usePlayerName } from "../hooks/usePlayerName";
import NameEntryForm from "../components/NameEntryForm";
import RoomHeader from "../components/RoomHeader";
import StoryList from "../components/StoryList";
import VotingArea from "../components/VotingArea";
import PlayerList from "../components/PlayerList";
import RevealButton from "../components/RevealButton";
import ResultsSummary from "../components/ResultsSummary";
import CompletedStoryView from "../components/CompletedStoryView";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const scaleId = searchParams.get("scale") ?? undefined;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [optimisticVote, setOptimisticVote] = useState<string | null>(null);
  const [viewingStoryId, setViewingStoryId] = useState<string | null>(null);
  const lastRoundKey = useRef("");

  const { name, playerId, setName, suggestedName } = usePlayerName(roomId!);
  const {
    state,
    connected,
    vote,
    reveal,
    clearVotes,
    addStory,
    selectStory,
    setEstimate,
    removeStory,
    reEstimate,
  } = useRoom(roomId!, name, playerId, scaleId);

  const handleVote = useCallback((value: string) => {
    setOptimisticVote(value);
    vote(value);
  }, [vote]);

  const handleClearVotes = useCallback(() => {
    setOptimisticVote(null);
    clearVotes();
  }, [clearVotes]);

  const handleSelectStory = useCallback((id: string) => {
    const story = state.stories.find((s) => s.id === id);
    if (story?.finalEstimate !== null) {
      setViewingStoryId(id);
      setSidebarOpen(false);
    } else {
      setOptimisticVote(null);
      setViewingStoryId(null);
      selectStory(id);
      setSidebarOpen(false);
    }
  }, [selectStory, state.stories]);

  const handleReEstimate = useCallback((storyId: string) => {
    setOptimisticVote(null);
    setViewingStoryId(null);
    reEstimate(storyId);
  }, [reEstimate]);

  const handleSetEstimate = useCallback((storyId: string, value: string) => {
    setEstimate(storyId, value);
    // Server will auto-advance to next story
  }, [setEstimate]);

  // Clear optimistic vote when voting round changes
  const roundKey = `${state.currentStoryId}:${state.phase}`;
  if (roundKey !== lastRoundKey.current) {
    lastRoundKey.current = roundKey;
    if (optimisticVote !== null) {
      setOptimisticVote(null);
    }
  }

  // If viewing a completed story that got re-estimated, clear the viewing state
  if (viewingStoryId) {
    const vs = state.stories.find((s) => s.id === viewingStoryId);
    if (!vs || vs.finalEstimate === null) {
      setViewingStoryId(null);
    }
  }

  if (!name) {
    return <NameEntryForm onSubmit={setName} suggestedName={suggestedName} />;
  }

  const myPlayer = state.players.find((p) => p.id === playerId);
  const serverVote = myPlayer?.vote === "hidden" ? null : myPlayer?.vote ?? null;
  const myVote = serverVote ?? optimisticVote;
  const connectedPlayers = state.players.filter((p) => p.isConnected);

  const currentStory = state.stories.find(
    (s) => s.id === state.currentStoryId
  );
  const viewingStory = viewingStoryId
    ? state.stories.find((s) => s.id === viewingStoryId)
    : null;

  const displayStory = viewingStory ?? currentStory;
  const isViewingCompleted = !!viewingStory && viewingStory.finalEstimate !== null;

  const completedCount = state.stories.filter((s) => s.finalEstimate !== null).length;

  return (
    <div className="flex h-dvh flex-col">
      <RoomHeader
        roomId={roomId!}
        scale={state.scale}
        playerCount={connectedPlayers.length}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        storyCount={state.stories.length}
        connected={connected}
      />
      <div className="flex min-h-0 flex-1">
        <div
          className={`${
            sidebarOpen ? "block" : "hidden"
          } absolute inset-y-0 left-0 z-40 w-72 pt-[53px] lg:relative lg:block lg:pt-0`}
        >
          <StoryList
            stories={state.stories}
            currentStoryId={state.currentStoryId}
            viewingStoryId={viewingStoryId}
            players={state.players}
            scaleName={state.scale.label}
            error={state.lastError}
            onAdd={addStory}
            onSelect={handleSelectStory}
            onRemove={removeStory}
          />
        </div>
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          {displayStory && (
            <div className="border-b border-surface-lighter px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{displayStory.title}</h2>
                {completedCount > 0 && !isViewingCompleted && (
                  <span className="text-xs text-text-muted">
                    ({completedCount}/{state.stories.length} estimated)
                  </span>
                )}
                {isViewingCompleted && (
                  <button
                    onClick={() => setViewingStoryId(null)}
                    className="text-xs text-primary hover:underline"
                  >
                    Back to voting
                  </button>
                )}
              </div>
            </div>
          )}

          {isViewingCompleted && viewingStory ? (
            <CompletedStoryView
              story={viewingStory}
              players={state.players}
              onReEstimate={handleReEstimate}
            />
          ) : currentStory?.finalEstimate ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <span className="text-sm font-medium uppercase tracking-wider text-success">
                Agreed Estimate
              </span>
              <span className="flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-success bg-success/10 text-5xl font-bold text-success">
                {currentStory.finalEstimate}
              </span>
              <span className="text-sm text-text-muted">Moving to next story...</span>
            </div>
          ) : (
            <>
              <VotingArea
                scale={state.scale.values}
                myVote={myVote}
                phase={state.phase}
                hasCurrentStory={!!state.currentStoryId}
                onVote={handleVote}
              />
              <PlayerList
                players={state.players}
                phase={state.phase}
                currentPlayerId={playerId}
              />
              <ResultsSummary
                players={state.players}
                phase={state.phase}
                scaleValues={state.scale.values}
                currentStoryId={state.currentStoryId}
                onSetEstimate={handleSetEstimate}
              />
              <RevealButton
                phase={state.phase}
                players={state.players}
                hasCurrentStory={!!state.currentStoryId}
                onReveal={reveal}
                onClear={handleClearVotes}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
