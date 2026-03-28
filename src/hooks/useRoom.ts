import { useReducer, useCallback, useRef, useEffect, useState } from "react";
import usePartySocket from "partysocket/react";
import type { RoomState } from "../types/room";
import type { ServerMessage, ClientMessage } from "../types/messages";
import { PARTYKIT_HOST } from "../lib/constants";

const initialState: RoomState = {
  players: [],
  stories: [],
  currentStoryId: null,
  scale: { id: "fibonacci", label: "Fibonacci", values: [] },
  phase: "voting",
  ownerIds: [],
};

function roomReducer(state: RoomState, msg: ServerMessage): RoomState {
  switch (msg.type) {
    case "sync":
      return msg.state;

    case "player-joined":
      return {
        ...state,
        players: [
          ...state.players.filter((p) => p.id !== msg.player.id),
          msg.player,
        ],
      };

    case "player-left":
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === msg.playerId ? { ...p, isConnected: false } : p
        ),
      };

    case "player-voted":
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === msg.playerId ? { ...p, vote: "hidden" } : p
        ),
      };

    case "votes-revealed":
      return {
        ...state,
        phase: "revealed",
        players: state.players.map((p) => ({
          ...p,
          vote: msg.votes[p.id] ?? null,
        })),
        stories: state.stories.map((s) =>
          s.id === msg.storyId ? { ...s, votes: msg.votes } : s
        ),
      };

    case "votes-cleared":
      return {
        ...state,
        phase: "voting",
        players: state.players.map((p) => ({ ...p, vote: null })),
      };

    case "story-added":
      return {
        ...state,
        stories: [...state.stories, msg.story],
        lastError: undefined,
      };

    case "story-selected":
      return {
        ...state,
        currentStoryId: msg.storyId || null,
        phase: "voting",
        players: state.players.map((p) => ({ ...p, vote: null })),
      };

    case "story-estimated":
      return {
        ...state,
        stories: state.stories.map((s) =>
          s.id === msg.storyId
            ? { ...s, finalEstimate: msg.value || null }
            : s
        ),
      };

    case "story-removed": {
      const wasCurrentStory = state.currentStoryId === msg.storyId;
      return {
        ...state,
        stories: state.stories.filter((s) => s.id !== msg.storyId),
        currentStoryId: wasCurrentStory ? null : state.currentStoryId,
        phase: wasCurrentStory ? "voting" as const : state.phase,
        players: wasCurrentStory
          ? state.players.map((p) => ({ ...p, vote: null }))
          : state.players,
      };
    }

    case "error":
      console.error("Server error:", msg.message);
      return { ...state, lastError: msg.message };

    default:
      return state;
  }
}

export function useRoom(
  roomId: string,
  playerName: string,
  playerId: string,
  scaleId?: string
) {
  const [state, dispatch] = useReducer(roomReducer, initialState);
  const [connected, setConnected] = useState(false);
  const hasJoined = useRef(false);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const socket = usePartySocket({
    host: PARTYKIT_HOST,
    room: roomId,
    query: scaleId ? { scale: scaleId } : undefined,
    onOpen() {
      // Clear any pending disconnect indicator
      if (disconnectTimer.current) {
        clearTimeout(disconnectTimer.current);
        disconnectTimer.current = null;
      }
      setConnected(true);
      if (playerName) {
        const msg: ClientMessage = { type: "join", name: playerName, playerId };
        socket.send(JSON.stringify(msg));
        hasJoined.current = true;
      }
    },
    onMessage(event: MessageEvent) {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === "error" && msg.message === "Please rejoin") {
        if (playerName) {
          socket.send(JSON.stringify({ type: "join", name: playerName, playerId }));
        }
        return;
      }
      dispatch(msg);
    },
    onClose() {
      // Only show "Reconnecting" after 2s — brief drops during hibernation wake are normal
      if (!disconnectTimer.current) {
        disconnectTimer.current = setTimeout(() => setConnected(false), 2000);
      }
    },
    onError() {
      if (!disconnectTimer.current) {
        disconnectTimer.current = setTimeout(() => setConnected(false), 2000);
      }
    },
  });

  // Join when name becomes available (after name entry)
  useEffect(() => {
    if (playerName && socket.readyState === WebSocket.OPEN && !hasJoined.current) {
      const msg: ClientMessage = { type: "join", name: playerName, playerId };
      socket.send(JSON.stringify(msg));
      hasJoined.current = true;
    }
  }, [playerName, playerId, socket]);

  // Cleanup disconnect timer on unmount
  useEffect(() => {
    return () => {
      if (disconnectTimer.current) {
        clearTimeout(disconnectTimer.current);
      }
    };
  }, []);

  const send = useCallback(
    (msg: ClientMessage) => {
      socket.send(JSON.stringify(msg));
    },
    [socket]
  );

  const vote = useCallback((value: string) => send({ type: "vote", value }), [send]);
  const reveal = useCallback(() => send({ type: "reveal" }), [send]);
  const clearVotes = useCallback(() => send({ type: "clear-votes" }), [send]);
  const addStory = useCallback(
    (title: string) => send({ type: "add-story", title }),
    [send]
  );
  const selectStory = useCallback(
    (storyId: string) => send({ type: "select-story", storyId }),
    [send]
  );
  const setEstimate = useCallback(
    (storyId: string, value: string) =>
      send({ type: "set-estimate", storyId, value }),
    [send]
  );
  const removeStory = useCallback(
    (storyId: string) => send({ type: "remove-story", storyId }),
    [send]
  );
  const nextStory = useCallback(() => send({ type: "next-story" }), [send]);
  const reEstimate = useCallback(
    (storyId: string) => send({ type: "re-estimate", storyId }),
    [send]
  );

  const isOwner = state.ownerIds.includes(playerId);

  return {
    state,
    connected,
    isOwner,
    vote,
    reveal,
    clearVotes,
    addStory,
    selectStory,
    setEstimate,
    removeStory,
    nextStory,
    reEstimate,
  };
}
