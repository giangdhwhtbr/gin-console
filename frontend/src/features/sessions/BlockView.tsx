import type { Block } from "./api";

export function BlockView({ block }: { block: Block }) {
  const note = block.truncated && <p className="text-sm text-muted-foreground">truncated</p>;
  if (block.type === "text") {
    return (
      <>
        <p className="whitespace-pre-wrap break-words">{block.text}</p>
        {note}
      </>
    );
  }
  const label = block.type === "tool_use" ? `tool_use: ${block.name ?? "?"}` : block.type;
  return (
    <details className="rounded border px-2 py-1 text-sm">
      <summary className="cursor-pointer">{label}</summary>
      <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap break-words">
        {block.input ?? block.text ?? ""}
      </pre>
      {note}
    </details>
  );
}
