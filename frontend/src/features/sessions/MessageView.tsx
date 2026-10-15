import { BlockView } from "./BlockView";
import type { Message } from "./api";

export function MessageView({ message }: { message: Message }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border p-3">
      <span className="text-xs font-medium uppercase text-muted-foreground">{message.role}</span>
      {message.blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </article>
  );
}
