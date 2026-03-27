import type { RoomState, Player, Story } from "./room";

// Client -> Server
export type ClientMessage =
  | { type: "join"; name: string; playerId: string }
  | { type: "vote"; value: string }
  | { type: "reveal" }
  | { type: "clear-votes" }
  | { type: "add-story"; title: string }
  | { type: "select-story"; storyId: string }
  | { type: "set-estimate"; storyId: string; value: string }
  | { type: "remove-story"; storyId: string }
  | { type: "next-story" }
  | { type: "re-estimate"; storyId: string };

// Server -> Client
export type ServerMessage =
  | { type: "sync"; state: RoomState }
  | { type: "player-joined"; player: Player }
  | { type: "player-left"; playerId: string }
  | { type: "player-voted"; playerId: string }
  | { type: "votes-revealed"; votes: Record<string, string>; storyId: string }
  | { type: "votes-cleared" }
  | { type: "story-added"; story: Story }
  | { type: "story-selected"; storyId: string }
  | { type: "story-estimated"; storyId: string; value: string }
  | { type: "story-removed"; storyId: string }
  | { type: "error"; message: string };
