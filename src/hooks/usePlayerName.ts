import { useState, useCallback } from "react";
import { nanoid } from "nanoid";

const NAME_KEY = "pointless-player-name";
const ID_KEY = "pointless-player-id";

function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = nanoid(12);
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function usePlayerName() {
  const [name, setNameState] = useState(() => localStorage.getItem(NAME_KEY) ?? "");
  const playerId = useState(() => getOrCreatePlayerId())[0];

  const setName = useCallback((newName: string) => {
    localStorage.setItem(NAME_KEY, newName);
    setNameState(newName);
  }, []);

  return { name, playerId, setName };
}
