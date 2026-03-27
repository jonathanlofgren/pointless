import { useState, useCallback } from "react";
import { nanoid } from "nanoid";

const NAME_KEY = "pointless-player-name";
const ID_KEY = "pointless-player-id";

// Each tab gets its own player ID (sessionStorage), so two tabs
// in the same browser are treated as two separate players.
// The name is stored in localStorage as a convenience pre-fill,
// but each room join always shows the name entry form.
function getOrCreatePlayerId(): string {
  let id = sessionStorage.getItem(ID_KEY);
  if (!id) {
    id = nanoid(12);
    sessionStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function usePlayerName(roomId: string) {
  // Key the joined state per room so navigating to a new room shows the form again
  const roomJoinedKey = `pointless-joined-${roomId}`;
  const [name, setNameState] = useState(() => {
    // Only skip the name form if this tab has already joined THIS room
    if (sessionStorage.getItem(roomJoinedKey)) {
      return sessionStorage.getItem(NAME_KEY) ?? "";
    }
    return "";
  });
  const playerId = useState(() => getOrCreatePlayerId())[0];

  const setName = useCallback((newName: string) => {
    localStorage.setItem(NAME_KEY, newName); // persist across sessions for pre-fill
    sessionStorage.setItem(NAME_KEY, newName); // this tab's active name
    sessionStorage.setItem(roomJoinedKey, "1"); // mark this room as joined in this tab
    setNameState(newName);
  }, [roomJoinedKey]);

  // Pre-fill value from localStorage (for the name input default)
  const suggestedName = useState(() => localStorage.getItem(NAME_KEY) ?? "")[0];

  return { name, playerId, setName, suggestedName };
}
