"use client";

interface ApiKeyInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  helpText: string;
  helpUrl: string;
}

export function ApiKeyInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  helpText,
  helpUrl,
}: ApiKeyInputProps) {
  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
      >
        {label}
      </label>
      <input
        type="password"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
        placeholder={placeholder}
        autoComplete="off"
      />
      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Get your key at{" "}
        <a
          href={helpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-500 hover:underline"
        >
          {helpText}
        </a>
      </div>
    </div>
  );
}
