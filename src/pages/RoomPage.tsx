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

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const scaleId = searchParams.get("scale") ?? undefined;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [optimisticVote, setOptimisticVote] = useState<string | null>(null);
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
    nextStory,
  } = useRoom(roomId!, name, playerId, scaleId);

  const handleVote = useCallback((value: string) => {
    setOptimisticVote(value);
    vote(value);
  }, [vote]);

  const handleClearVotes = useCallback(() => {
    setOptimisticVote(null);
    clearVotes();
  }, [clearVotes]);

  const handleNextStory = useCallback(() => {
    setOptimisticVote(null);
    nextStory();
  }, [nextStory]);

  const handleSelectStory = useCallback((id: string) => {
    setOptimisticVote(null);
    selectStory(id);
    setSidebarOpen(false);
  }, [selectStory]);

  // Clear optimistic vote when voting round changes (re-vote, next story, etc.)
  const roundKey = `${state.currentStoryId}:${state.phase}`;
  if (roundKey !== lastRoundKey.current) {
    lastRoundKey.current = roundKey;
    if (optimisticVote !== null) {
      setOptimisticVote(null);
    }
  }

  if (!name) {
    return <NameEntryForm onSubmit={setName} suggestedName={suggestedName} />;
  }

  const myPlayer = state.players.find((p) => p.id === playerId);
  const serverVote = myPlayer?.vote === "hidden" ? null : myPlayer?.vote ?? null;
  const myVote = serverVote ?? optimisticVote;
  const connectedPlayers = state.players.filter((p) => p.isConnected);
  const hasNextStory = state.stories.some(
    (s) => s.finalEstimate === null && s.id !== state.currentStoryId
  );

  const currentStory = state.stories.find(
    (s) => s.id === state.currentStoryId
  );

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
        {/* Sidebar — always visible on lg, toggleable on smaller */}
        <div
          className={`${
            sidebarOpen ? "block" : "hidden"
          } absolute inset-y-0 left-0 z-40 w-72 pt-[53px] lg:relative lg:block lg:pt-0`}
        >
          <StoryList
            stories={state.stories}
            currentStoryId={state.currentStoryId}
            players={state.players}
            scaleName={state.scale.label}
            error={state.lastError}
            onAdd={addStory}
            onSelect={handleSelectStory}
            onRemove={removeStory}
          />
        </div>
        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          {currentStory && (
            <div className="border-b border-surface-lighter px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{currentStory.title}</h2>
                {completedCount > 0 && (
                  <span className="text-xs text-text-muted">
                    ({completedCount}/{state.stories.length} estimated)
                  </span>
                )}
              </div>
            </div>
          )}
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
            onSetEstimate={setEstimate}
          />
          <RevealButton
            phase={state.phase}
            players={state.players}
            hasCurrentStory={!!state.currentStoryId}
            onReveal={reveal}
            onClear={handleClearVotes}
            onNext={handleNextStory}
            hasNextStory={hasNextStory}
          />
        </main>
      </div>
    </div>
  );
}
