import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { decodeResults, type ExportedResults } from "../lib/results-codec";
import FinalResultsTable from "../components/FinalResultsTable";

export default function ResultsPage() {
  const location = useLocation();
  const [results, setResults] = useState<ExportedResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = location.hash;
    if (!hash || hash === "#") {
      setError("No results data in URL");
      return;
    }
    try {
      setResults(decodeResults(hash));
    } catch {
      setError("Failed to decode results. The URL may be corrupted.");
    }
  }, [location.hash]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <p className="text-danger">{error}</p>
        <Link to="/" className="text-primary hover:underline">
          Create a new session
        </Link>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">Session Results</h1>
      <p className="mb-6 text-sm text-text-muted">
        {results.scale} scale &middot; Exported{" "}
        {new Date(results.exportedAt).toLocaleDateString()}
      </p>
      <FinalResultsTable results={results} />
      <div className="mt-8">
        <Link
          to="/"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          Start New Session
        </Link>
      </div>
    </div>
  );
}
