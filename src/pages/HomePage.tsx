import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import CreateSessionForm from "../components/CreateSessionForm";

export default function HomePage() {
  const navigate = useNavigate();

  function handleCreate(scaleId: string) {
    const roomId = nanoid(8);
    navigate(`/room/${roomId}?scale=${scaleId}`);
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <h1 className="mb-2 text-5xl font-bold tracking-tight">Pointless</h1>
      <p className="mb-8 text-text-muted">
        Planning poker for teams. No signup required.
      </p>
      <CreateSessionForm onCreate={handleCreate} />
    </div>
  );
}
