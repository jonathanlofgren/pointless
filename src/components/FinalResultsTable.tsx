import type { ExportedResults } from "../lib/results-codec";

interface Props {
  results: ExportedResults;
}

export default function FinalResultsTable({ results }: Props) {
  return (
    <div className="w-full max-w-2xl">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-surface-lighter">
            <th className="px-4 py-2 text-text-muted">Story</th>
            <th className="px-4 py-2 text-text-muted">Estimate</th>
            <th className="px-4 py-2 text-text-muted">Votes</th>
          </tr>
        </thead>
        <tbody>
          {results.stories.map((story, i) => (
            <tr key={i} className="border-b border-surface-lighter/50">
              <td className="px-4 py-2">{story.title}</td>
              <td className="px-4 py-2">
                {story.estimate ? (
                  <span className="rounded bg-success/20 px-2 py-0.5 font-bold text-success">
                    {story.estimate}
                  </span>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </td>
              <td className="px-4 py-2">
                <div className="flex flex-wrap gap-1">
                  {Object.entries(story.votes).map(([name, vote]) => (
                    <span
                      key={name}
                      className="rounded bg-surface-lighter px-1.5 py-0.5 text-xs"
                      title={name}
                    >
                      {name}: {vote}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
