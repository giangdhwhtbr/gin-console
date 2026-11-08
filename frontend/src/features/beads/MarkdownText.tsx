import { lazy, Suspense } from "react";

const MarkdownView = lazy(() => import("./MarkdownView").then((m) => ({ default: m.MarkdownView })));

/** Bead text as Markdown in its own chunk; the text as typed until that chunk loads. */
export function MarkdownText({ text }: { text: string }) {
  return (
    <Suspense fallback={<p className="whitespace-pre-wrap break-words">{text}</p>}>
      <MarkdownView text={text} />
    </Suspense>
  );
}
