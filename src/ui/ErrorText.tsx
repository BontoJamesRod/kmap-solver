import type { ParseError } from '../engine';

/** Shows the input with the error range underlined. */
export function ErrorText({ text, error }: { text: string; error: ParseError }) {
  const start = Math.min(error.start, text.length);
  const end = Math.max(start + 1, Math.min(error.end, text.length + 1));
  const shown = text + ' ';
  return (
    <code className="error-text" aria-hidden="true">
      {shown.slice(0, start)}
      <mark>{shown.slice(start, end)}</mark>
      {shown.slice(end)}
    </code>
  );
}
