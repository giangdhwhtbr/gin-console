import Markdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import type { BeadImage } from "./api";

const SAFE = /^(https?:|mailto:)/i;
const WEB = /^https?:/i;
/** Only http, https and mailto URLs survive; anything else, relative paths included, becomes "" (REQ-UI-028). */
export const safeUrl = (url: string) => (SAFE.test(url) ? url : "");

/** How a bead page shows its own images: which address is one, where it is served, how to open the lightbox. */
export type ImageResolver = {
  find(address: string): BeadImage | null;
  url(n: number): string;
  open(n: number, from: HTMLElement): void;
};

const hostOf = (address: string) => {
  try {
    return new URL(address).host;
  } catch {
    return null;
  }
};

function componentsFor(images: ImageResolver | undefined): Components {
  return {
    a: ({ href, children }) => {
      if (href && SAFE.test(href)) {
        return (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        );
      }
      const image = href && images ? images.find(href) : null;
      if (image && images) {
        return (
          <button
            type="button"
            onClick={(event) => images.open(image.n, event.currentTarget)}
            className="cursor-pointer prose-link focus-visible:outline-2 focus-visible:outline-ring"
          >
            {children}
          </button>
        );
      }
      return <span>{children}</span>;
    },
    img: ({ src, alt }) => {
      const text = alt ?? "";
      const address = typeof src === "string" ? src : "";
      const image = address && images ? images.find(address) : null;
      if (image && images) {
        return (
          <button
            type="button"
            onClick={(event) => images.open(image.n, event.currentTarget)}
            className="max-w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-ring"
          >
            <img src={images.url(image.n)} alt={text} loading="lazy" className="max-h-96 max-w-full" />
          </button>
        );
      }
      // An outside address is never loaded: a link, not an img (REQ-UI-028).
      const host = WEB.test(address) ? hostOf(address) : null;
      if (host) {
        return (
          <a href={address} target="_blank" rel="noreferrer">
            Image: {text} ({host})
          </a>
        );
      }
      return <span>{text}</span>;
    },
  };
}

/** Bead text as GitHub-flavored Markdown; raw HTML is escaped by react-markdown (no rehype-raw). */
export function MarkdownView({ text, images }: { text: string; images?: ImageResolver }) {
  return (
    <div className="markdown break-words [overflow-wrap:anywhere]">
      <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} urlTransform={(url) => url} components={componentsFor(images)}>
        {text}
      </Markdown>
    </div>
  );
}
