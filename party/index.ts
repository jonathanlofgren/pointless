import type * as Party from "partykit/server";

// --- Types (duplicated from src/types to avoid import issues with PartyKit build) ---

interface Player {
  id: string;
  name: string;
  vote: string | null;
  isConnected: boolean;
}

interface Story {
  id: string;
  title: string;
  finalEstimate: string | null;
  votes: Record<string, string>;
}

interface PointScale {
  id: string;
  label: string;
  values: string[];
}

interface RoomState {
  players: Player[];
  stories: Story[];
  currentStoryId: string | null;
  scale: PointScale;
  phase: "voting" | "revealed";
}

type ClientMessage =
  | { type: "join"; name: string; playerId: string }
  | { type: "vote"; value: string }
  | { type: "reveal" }
  | { type: "clear-votes" }
  | { type: "add-story"; title: string }
  | { type: "select-story"; storyId: string }
  | { type: "set-estimate"; storyId: string; value: string }
  | { type: "remove-story"; storyId: string }
  | { type: "next-story" };

type ServerMessage =
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

// --- Scales ---

const SCALES: PointScale[] = [
  { id: "fibonacci", label: "Fibonacci", values: ["0", "1", "2", "3", "5", "8", "13", "21", "?", "pass"] },
  { id: "tshirt", label: "T-Shirt", values: ["XS", "S", "M", "L", "XL", "?", "pass"] },
  { id: "linear", label: "Linear", values: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "?", "pass"] },
  { id: "powers", label: "Powers of 2", values: ["1", "2", "4", "8", "16", "32", "?", "pass"] },
];

function getScaleById(id: string): PointScale {
  return SCALES.find((s) => s.id === id) ?? SCALES[0];
}

function nanoid(len = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return id;
}

// --- Server ---

export default class PokerRoom implements Party.Server {
  options: Party.ServerOptions = { hibernate: true };

  players: Map<string, Player> = new Map();
  // Map connection ID -> player ID for routing
  connectionToPlayer: Map<string, string> = new Map();
  stories: Story[] = [];
  currentStoryId: string | null = null;
  scale: PointScale = SCALES[0];
  phase: "voting" | "revealed" = "voting";

  constructor(readonly room: Party.Room) {}

  getState(): RoomState {
    return {
      players: Array.from(this.players.values()),
      stories: this.stories,
      currentStoryId: this.currentStoryId,
      scale: this.scale,
      phase: this.phase,
    };
  }

  broadcast(msg: ServerMessage, exclude?: string[]) {
    this.room.broadcast(JSON.stringify(msg), exclude);
  }

  send(connection: Party.Connection, msg: ServerMessage) {
    connection.send(JSON.stringify(msg));
  }

  onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    // Set scale from query param if this is the first connection (room creator)
    const url = new URL(ctx.request.url);
    const scaleParam = url.searchParams.get("scale");
    if (scaleParam && this.players.size === 0) {
      this.scale = getScaleById(scaleParam);
    }

    // Send full state sync
    this.send(connection, { type: "sync", state: this.getState() });
  }

  onMessage(message: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(message as string);
    } catch {
      this.send(sender, { type: "error", message: "Invalid JSON" });
      return;
    }

    switch (msg.type) {
      case "join":
        this.handleJoin(sender, msg.playerId, msg.name);
        break;
      case "vote":
        this.handleVote(sender, msg.value);
        break;
      case "reveal":
        this.handleReveal();
        break;
      case "clear-votes":
        this.handleClearVotes();
        break;
      case "add-story":
        this.handleAddStory(msg.title);
        break;
      case "select-story":
        this.handleSelectStory(msg.storyId);
        break;
      case "set-estimate":
        this.handleSetEstimate(msg.storyId, msg.value);
        break;
      case "remove-story":
        this.handleRemoveStory(msg.storyId);
        break;
      case "next-story":
        this.handleNextStory();
        break;
    }
  }

  onClose(connection: Party.Connection) {
    const playerId = this.connectionToPlayer.get(connection.id);
    if (playerId) {
      const player = this.players.get(playerId);
      if (player) {
        player.isConnected = false;
        this.broadcast({ type: "player-left", playerId });
      }
      this.connectionToPlayer.delete(connection.id);
    }
  }

  onError(connection: Party.Connection) {
    this.onClose(connection);
  }

  // --- Handlers ---

  handleJoin(connection: Party.Connection, playerId: string, name: string) {
    const existing = this.players.get(playerId);
    if (existing) {
      // Reconnecting player — update connection mapping and mark connected
      existing.name = name;
      existing.isConnected = true;
      this.connectionToPlayer.set(connection.id, playerId);
      // Send full sync to reconnecting player
      this.send(connection, { type: "sync", state: this.getState() });
      // Notify others
      this.broadcast({ type: "player-joined", player: existing }, [connection.id]);
    } else {
      // New player
      const player: Player = {
        id: playerId,
        name,
        vote: null,
        isConnected: true,
      };
      this.players.set(playerId, player);
      this.connectionToPlayer.set(connection.id, playerId);
      // Send full state to new player
      this.send(connection, { type: "sync", state: this.getState() });
      // Broadcast to others
      this.broadcast({ type: "player-joined", player }, [connection.id]);
    }
  }

  handleVote(sender: Party.Connection, value: string) {
    if (this.phase === "revealed") return;
    if (!this.currentStoryId) return;

    const playerId = this.connectionToPlayer.get(sender.id);
    if (!playerId) return;

    const player = this.players.get(playerId);
    if (!player) return;

    player.vote = value;
    this.broadcast({ type: "player-voted", playerId }, [sender.id]);
    // Send confirmation back to voter with their own vote visible
    this.send(sender, { type: "sync", state: this.getState() });
  }

  handleReveal() {
    if (this.phase === "revealed") return;
    if (!this.currentStoryId) return;

    // Check if anyone has voted
    const hasVotes = Array.from(this.players.values()).some(
      (p) => p.isConnected && p.vote !== null
    );
    if (!hasVotes) return;

    this.phase = "revealed";

    // Collect votes for the story
    const votes: Record<string, string> = {};
    for (const player of this.players.values()) {
      if (player.vote !== null) {
        votes[player.id] = player.vote;
      }
    }

    // Save votes to the story
    const story = this.stories.find((s) => s.id === this.currentStoryId);
    if (story) {
      story.votes = votes;
    }

    this.broadcast({ type: "votes-revealed", votes, storyId: this.currentStoryId });
  }

  handleClearVotes() {
    this.phase = "voting";
    for (const player of this.players.values()) {
      player.vote = null;
    }
    this.broadcast({ type: "votes-cleared" });
  }

  handleAddStory(title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;

    const story: Story = {
      id: nanoid(),
      title: trimmed,
      finalEstimate: null,
      votes: {},
    };
    this.stories.push(story);

    // Auto-select if no current story
    if (!this.currentStoryId) {
      this.currentStoryId = story.id;
      this.broadcast({ type: "story-added", story });
      this.broadcast({ type: "story-selected", storyId: story.id });
    } else {
      this.broadcast({ type: "story-added", story });
    }
  }

  handleSelectStory(storyId: string) {
    const story = this.stories.find((s) => s.id === storyId);
    if (!story) return;

    this.currentStoryId = storyId;
    this.phase = "voting";
    for (const player of this.players.values()) {
      player.vote = null;
    }

    this.broadcast({ type: "story-selected", storyId });
    this.broadcast({ type: "votes-cleared" });
  }

  handleSetEstimate(storyId: string, value: string) {
    const story = this.stories.find((s) => s.id === storyId);
    if (!story) return;

    story.finalEstimate = value;
    this.broadcast({ type: "story-estimated", storyId, value });
  }

  handleRemoveStory(storyId: string) {
    this.stories = this.stories.filter((s) => s.id !== storyId);

    if (this.currentStoryId === storyId) {
      this.currentStoryId = null;
      this.phase = "voting";
      for (const player of this.players.values()) {
        player.vote = null;
      }
    }

    this.broadcast({ type: "story-removed", storyId });
  }

  handleNextStory() {
    // Find next unestimated story
    const nextStory = this.stories.find(
      (s) => s.finalEstimate === null && s.id !== this.currentStoryId
    );

    if (nextStory) {
      this.handleSelectStory(nextStory.id);
    }
  }

  // HTTP endpoint for room metadata
  async onRequest(req: Party.Request) {
    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          playerCount: this.players.size,
          scale: this.scale,
          storyCount: this.stories.length,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
    return new Response("Method not allowed", { status: 405 });
  }
}
