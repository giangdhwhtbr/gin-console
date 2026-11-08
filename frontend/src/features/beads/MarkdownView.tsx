import Markdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

const SAFE = /^(https?:|mailto:)/i;
/** Only http, https and mailto URLs survive; anything else, relative paths included, becomes "" (REQ-UI-028). */
export const safeUrl = (url: string) => (SAFE.test(url) ? url : "");

const components: Components = {
  a: ({ href, children }) =>
    href ? (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
};

/** Bead text as GitHub-flavored Markdown; raw HTML is escaped by react-markdown (no rehype-raw). */
export function MarkdownView({ text }: { text: string }) {
  return (
    <div className="markdown break-words">
      <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} urlTransform={safeUrl} components={components}>
        {text}
      </Markdown>
    </div>
  );
}
