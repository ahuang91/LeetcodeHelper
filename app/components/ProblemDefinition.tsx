"use client";

export interface TopicTag {
  name: string;
  slug: string;
  translatedName: string | null;
}

interface ProblemDefinitionProps {
  content: string;
  topicTags?: TopicTag[];
  expanded: boolean;
  onToggle: () => void;
}

export function ProblemDefinition({
  content,
  topicTags,
  expanded,
  onToggle,
}: ProblemDefinitionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-zinc-500 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            Problem Definition
          </span>
        </div>
        {topicTags && topicTags.length > 0 && (
          <div className="flex gap-1 flex-shrink-0">
            {topicTags.slice(0, 3).map((tag) => (
              <span
                key={tag.slug}
                className="px-2 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded"
              >
                {tag.name}
              </span>
            ))}
            {topicTags.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-zinc-400">
                +{topicTags.length - 3}
              </span>
            )}
          </div>
        )}
      </button>

      {expanded && (
        <div className="mt-3 p-4 bg-white dark:bg-zinc-800 rounded-lg overflow-x-hidden">
          {topicTags && topicTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {topicTags.map((tag) => (
                <span
                  key={tag.slug}
                  className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          <div
            className="prose prose-zinc dark:prose-invert max-w-none prose-sm
              prose-pre:bg-zinc-100 prose-pre:dark:bg-zinc-900 prose-pre:whitespace-pre-wrap
              prose-code:text-orange-600 prose-code:dark:text-orange-400
              prose-img:rounded-lg [&_pre]:whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )}
    </div>
  );
}
