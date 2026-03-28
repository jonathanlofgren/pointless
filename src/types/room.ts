export interface Player {
  id: string;
  name: string;
  vote: string | null;
  isConnected: boolean;
}

export interface Story {
  id: string;
  title: string;
  finalEstimate: string | null;
  votes: Record<string, string>; // playerId -> vote value (saved after reveal)
}

export interface PointScale {
  id: string;
  label: string;
  values: string[];
}

export interface RoomState {
  players: Player[];
  stories: Story[];
  currentStoryId: string | null;
  scale: PointScale;
  phase: "voting" | "revealed";
  ownerIds: string[];
  lastError?: string;
}
