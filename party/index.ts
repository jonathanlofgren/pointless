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
  | { type: "next-story" }
  | { type: "re-estimate"; storyId: string };

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

interface PersistedState {
  players: [string, Player][];
  connectionToPlayer: [string, string][];
  stories: Story[];
  currentStoryId: string | null;
  scale: PointScale;
  phase: "voting" | "revealed";
}

// --- Server ---

export default class PokerRoom implements Party.Server {
  options: Party.ServerOptions = { hibernate: true };

  players: Map<string, Player> = new Map();
  connectionToPlayer: Map<string, string> = new Map();
  stories: Story[] = [];
  currentStoryId: string | null = null;
  scale: PointScale = SCALES[0];
  phase: "voting" | "revealed" = "voting";
  autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly room: Party.Room) {}

  async onStart() {
    const saved = await this.room.storage.get<PersistedState>("state");
    if (saved) {
      this.players = new Map(saved.players);
      this.connectionToPlayer = new Map(saved.connectionToPlayer ?? []);
      this.stories = saved.stories;
      this.currentStoryId = saved.currentStoryId;
      this.scale = saved.scale;
      this.phase = saved.phase;

      const activeConnectionIds = new Set<string>();
      for (const conn of this.room.getConnections()) {
        activeConnectionIds.add(conn.id);
      }
      for (const player of this.players.values()) {
        let connected = false;
        for (const [connId, pId] of this.connectionToPlayer) {
          if (pId === player.id && activeConnectionIds.has(connId)) {
            connected = true;
            break;
          }
        }
        player.isConnected = connected;
      }
      for (const [connId] of this.connectionToPlayer) {
        if (!activeConnectionIds.has(connId)) {
          this.connectionToPlayer.delete(connId);
        }
      }
    }
  }

  async saveState() {
    const state: PersistedState = {
      players: Array.from(this.players.entries()),
      connectionToPlayer: Array.from(this.connectionToPlayer.entries()),
      stories: this.stories,
      currentStoryId: this.currentStoryId,
      scale: this.scale,
      phase: this.phase,
    };
    await this.room.storage.put("state", state);
  }

  getPlayerId(connection: Party.Connection): string | null {
    const playerId = this.connectionToPlayer.get(connection.id);
    if (!playerId) {
      this.send(connection, { type: "error", message: "Please rejoin" });
      this.send(connection, { type: "sync", state: this.getClientState() });
      return null;
    }
    return playerId;
  }

  // Returns state safe for clients — scrubs vote values during voting phase
  getClientState(): RoomState {
    return {
      players: Array.from(this.players.values()).map((p) =>
        this.phase === "voting" && p.vote !== null
          ? { ...p, vote: "hidden" }
          : p
      ),
      stories: this.stories,
      currentStoryId: this.currentStoryId,
      scale: this.scale,
      phase: this.phase,
    };
  }

  // Returns state for a specific player — their own vote is visible, others are hidden
  getClientStateFor(playerId: string): RoomState {
    return {
      players: Array.from(this.players.values()).map((p) => {
        if (this.phase === "voting" && p.vote !== null && p.id !== playerId) {
          return { ...p, vote: "hidden" };
        }
        return p;
      }),
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

  private clearAllVotes() {
    this.phase = "voting";
    for (const player of this.players.values()) {
      player.vote = null;
    }
  }

  private findNextPendingStory(excludeId?: string): Story | undefined {
    return this.stories.find(
      (s) => s.finalEstimate === null && s.id !== (excludeId ?? this.currentStoryId)
    );
  }

  private cancelAutoAdvance() {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }

  onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url);
    const scaleParam = url.searchParams.get("scale");
    if (scaleParam && this.players.size === 0) {
      this.scale = getScaleById(scaleParam);
    }

    this.send(connection, { type: "sync", state: this.getClientState() });
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
        this.handleAddStory(sender, msg.title);
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
      case "re-estimate":
        this.handleReEstimate(msg.storyId);
        break;
    }
  }

  onClose(connection: Party.Connection) {
    const playerId = this.connectionToPlayer.get(connection.id);
    if (playerId) {
      const player = this.players.get(playerId);
      if (player) {
        let hasOtherConnection = false;
        for (const [connId, pId] of this.connectionToPlayer) {
          if (pId === playerId && connId !== connection.id) {
            hasOtherConnection = true;
            break;
          }
        }
        if (!hasOtherConnection) {
          player.isConnected = false;
          this.broadcast({ type: "player-left", playerId });
        }
      }
      this.connectionToPlayer.delete(connection.id);
      this.saveState();
    }
  }

  onError(connection: Party.Connection) {
    this.onClose(connection);
  }

  // --- Handlers ---

  handleJoin(connection: Party.Connection, playerId: string, name: string) {
    const existing = this.players.get(playerId);
    if (existing) {
      existing.name = name;
      existing.isConnected = true;
      this.connectionToPlayer.set(connection.id, playerId);
      this.send(connection, { type: "sync", state: this.getClientStateFor(playerId) });
      this.broadcast({ type: "player-joined", player: { ...existing, vote: existing.vote ? "hidden" : null } }, [connection.id]);
    } else {
      const player: Player = {
        id: playerId,
        name,
        vote: null,
        isConnected: true,
      };
      this.players.set(playerId, player);
      this.connectionToPlayer.set(connection.id, playerId);
      this.send(connection, { type: "sync", state: this.getClientStateFor(playerId) });
      this.broadcast({ type: "player-joined", player }, [connection.id]);
    }
    this.saveState();
  }

  handleVote(sender: Party.Connection, value: string) {
    if (this.phase === "revealed") return;
    if (!this.currentStoryId) return;

    const playerId = this.getPlayerId(sender);
    if (!playerId) return;

    const player = this.players.get(playerId);
    if (!player) return;

    // Validate vote value against the scale
    if (!this.scale.values.includes(value)) return;

    player.vote = value;
    this.broadcast({ type: "player-voted", playerId }, [sender.id]);
    // Send voter their own state (they can see their own vote, others hidden)
    this.send(sender, { type: "sync", state: this.getClientStateFor(playerId) });
    this.saveState();
  }

  handleReveal() {
    if (this.phase === "revealed") return;
    if (!this.currentStoryId) return;

    const hasVotes = Array.from(this.players.values()).some(
      (p) => p.isConnected && p.vote !== null
    );
    if (!hasVotes) return;

    this.phase = "revealed";

    const votes: Record<string, string> = {};
    for (const player of this.players.values()) {
      if (player.vote !== null) {
        votes[player.id] = player.vote;
      }
    }

    const story = this.stories.find((s) => s.id === this.currentStoryId);
    if (story) {
      story.votes = votes;
    }

    this.broadcast({ type: "votes-revealed", votes, storyId: this.currentStoryId });
    this.saveState();
  }

  handleClearVotes() {
    this.cancelAutoAdvance();
    this.clearAllVotes();
    this.broadcast({ type: "votes-cleared" });
    this.saveState();
  }

  handleAddStory(sender: Party.Connection, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;

    if (this.stories.some((s) => s.title.toLowerCase() === trimmed.toLowerCase())) {
      this.send(sender, { type: "error", message: "A story with that name already exists" });
      return;
    }

    const story: Story = {
      id: nanoid(),
      title: trimmed,
      finalEstimate: null,
      votes: {},
    };
    this.stories.push(story);

    if (!this.currentStoryId) {
      this.currentStoryId = story.id;
      this.broadcast({ type: "story-added", story });
      this.broadcast({ type: "story-selected", storyId: story.id });
    } else {
      this.broadcast({ type: "story-added", story });
    }
    this.saveState();
  }

  handleSelectStory(storyId: string) {
    const story = this.stories.find((s) => s.id === storyId);
    if (!story) return;

    this.cancelAutoAdvance();
    this.currentStoryId = storyId;
    this.clearAllVotes();

    this.broadcast({ type: "story-selected", storyId });
    this.broadcast({ type: "votes-cleared" });
    this.saveState();
  }

  handleSetEstimate(storyId: string, value: string) {
    const story = this.stories.find((s) => s.id === storyId);
    if (!story) return;

    story.finalEstimate = value;
    this.broadcast({ type: "story-estimated", storyId, value });
    this.saveState();

    // Auto-advance after a short delay so everyone sees the agreed estimate
    if (this.currentStoryId === storyId) {
      this.cancelAutoAdvance();
      this.autoAdvanceTimer = setTimeout(() => {
        this.autoAdvanceTimer = null;
        if (this.currentStoryId !== storyId) return;

        const nextStory = this.findNextPendingStory(storyId);
        if (nextStory) {
          this.handleSelectStory(nextStory.id);
        } else {
          this.currentStoryId = null;
          this.clearAllVotes();
          this.broadcast({ type: "story-selected", storyId: "" });
          this.broadcast({ type: "votes-cleared" });
          this.saveState();
        }
      }, 2000);
    }
  }

  handleRemoveStory(storyId: string) {
    this.stories = this.stories.filter((s) => s.id !== storyId);

    if (this.currentStoryId === storyId) {
      this.cancelAutoAdvance();
      this.currentStoryId = null;
      this.clearAllVotes();
    }

    this.broadcast({ type: "story-removed", storyId });
    this.saveState();
  }

  handleReEstimate(storyId: string) {
    const story = this.stories.find((s) => s.id === storyId);
    if (!story) return;

    story.finalEstimate = null;
    story.votes = {};
    this.broadcast({ type: "story-estimated", storyId, value: "" });
    this.handleSelectStory(storyId);
  }

  handleNextStory() {
    const nextStory = this.findNextPendingStory();
    if (nextStory) {
      this.handleSelectStory(nextStory.id);
    }
  }

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
