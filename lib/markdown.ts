/**
 * Simple markdown to HTML converter for rendering AI analysis output.
 * Handles common markdown elements like headers, lists, code blocks, tables, etc.
 */
export function formatMarkdown(text: string): string {
  // First, handle tables
  const tableRegex = /(?:^|\n)((?:\|[^\n]+\|\n?)+)/g;
  let result = text.replace(tableRegex, (match, tableContent: string) => {
    const rows = tableContent.trim().split('\n').filter((row: string) => row.trim());
    if (rows.length < 2) return match;

    // Check if row is a separator row (cells contain only :, -, and spaces)
    const isSeparatorRow = (row: string) => {
      const cells = row.split('|').slice(1, -1);
      return cells.length > 0 && cells.every((cell: string) => /^[\s:-]+$/.test(cell));
    };

    let html = '<table class="min-w-full border-collapse my-4">';
    let inBody = false;

    rows.forEach((row: string, index: number) => {
      // Skip separator rows
      if (isSeparatorRow(row)) {
        inBody = true;
        return;
      }

      // Parse cells from the row
      const cells = row
        .split('|')
        .slice(1, -1) // Remove empty first and last elements from split
        .map((cell: string) => cell.trim());

      if (index === 0 && !inBody) {
        // Header row
        html += '<thead class="bg-zinc-100 dark:bg-zinc-700"><tr>';
        cells.forEach((cell: string) => {
          html += `<th class="border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-left text-sm font-medium">${cell}</th>`;
        });
        html += '</tr></thead><tbody>';
      } else if (inBody || index > 0) {
        // Body rows
        if (!inBody && index === 1) {
          html += '<tbody>';
          inBody = true;
        }
        html += '<tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800">';
        cells.forEach((cell: string) => {
          html += `<td class="border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm">${cell}</td>`;
        });
        html += '</tr>';
      }
    });

    html += '</tbody></table>';
    return html;
  });

  // Code blocks
  result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-zinc-100 dark:bg-zinc-900 rounded-lg p-4 overflow-x-auto my-4"><code class="language-$1 text-sm">$2</code></pre>');

  // LaTeX formulas ($formula$) - display as code with Courier New and green color
  result = result.replace(/\$([^$]+)\$/g, '<span style="font-family: \'Courier New\', monospace; color: #6a9955;">$1</span>');

  // Inline code
  result = result.replace(/`([^`]+)`/g, '<code class="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm">$1</code>');

  // Headers with distinct styling
  result = result.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mt-6 mb-2">$1</h3>');
  result = result.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-8 mb-3">$1</h2>');
  result = result.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-8 mb-4">$1</h1>');

  // Bold (before italic to avoid conflicts)
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');

  // Italic
  result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Ordered lists (numbered) - wrap consecutive numbered items in <ol>
  result = result.replace(/((?:^\d+\. .+$\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map((line: string) => {
      const content = line.replace(/^\d+\. /, '');
      return `<li class="ml-4">${content}</li>`;
    }).join('');
    return `<ol class="list-decimal list-inside my-4 space-y-1">${items}</ol>`;
  });

  // Unordered lists (bullets) - wrap consecutive bullet items in <ul>
  result = result.replace(/((?:^- .+$\n?)+|(?:^\* .+$\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map((line: string) => {
      const content = line.replace(/^- /, '');
      return `<li class="ml-4">${content}</li>`;
    }).join('');
    return `<ul class="list-disc list-inside my-4 space-y-1">${items}</ul>`;
  });

  // Paragraphs - split by double newlines and wrap in <p> tags
  result = result.split(/\n\n+/).map((block: string) => {
    const trimmed = block.trim();
    // Don't wrap blocks that are already HTML elements
    if (trimmed.startsWith('<') || trimmed === '') return trimmed;
    // Wrap plain text in paragraphs with proper spacing
    return `<p class="my-3 leading-relaxed">${trimmed.replace(/\n/g, '<br />')}</p>`;
  }).join('');

  return result;
}
