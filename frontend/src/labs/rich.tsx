// **bold** and `code` inside widget strings, without the lesson text parser.
export function Rich({ value }: { value: string }) {
  return value.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : part.startsWith("`") ? (
      <code key={i} className="rounded bg-code px-1 font-mono text-[0.9em]">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}
