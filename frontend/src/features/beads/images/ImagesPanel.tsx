import { imageUrl, type BeadImage } from "../api";

/** REQ-BEADS-029: the images a bead names, under its description. */
export function ImagesPanel({
  project,
  beadId,
  images,
  onOpen,
}: {
  project: string;
  beadId: string;
  images: readonly BeadImage[];
  onOpen: (n: number, from: HTMLElement) => void;
}) {
  if (images.length === 0) return null;
  const headingId = `images-${beadId}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="font-medium">
        Images ({images.length})
      </h2>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(10rem,100%),1fr))] gap-3 p-0">
        {images.map((image) => (
          <li key={image.n} className="min-w-0">
            {image.available ? (
              <button
                type="button"
                onClick={(event) => onOpen(image.n, event.currentTarget)}
                className="flex w-full cursor-pointer flex-col gap-1 rounded border p-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="text-xs text-muted-foreground">{image.n}</span>
                <img
                  src={imageUrl(project, beadId, image.n)}
                  alt={image.caption}
                  loading="lazy"
                  className="max-h-40 w-full object-contain"
                />
                <span className="break-words [overflow-wrap:anywhere]">{image.caption}</span>
              </button>
            ) : (
              <div className="flex flex-col gap-1 rounded border border-dashed p-2 text-sm text-muted-foreground">
                <span className="text-xs">{image.n}</span>
                <span>Not on this host</span>
                <span className="break-words [overflow-wrap:anywhere]">{image.path}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
