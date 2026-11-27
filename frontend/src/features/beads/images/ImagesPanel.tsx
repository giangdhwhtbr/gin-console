import { useState } from "react";
import { imageAddress, type BeadImage } from "../api";

const REASON_TEXT = {
  not_listed: "Not attached to this bead",
  pruned: "Pruned",
  unsupported_store: "Stored where this host cannot read it",
  not_fetched: "Not fetched yet",
  none: "Not on this host",
};

const TILE =
  "flex w-full cursor-pointer flex-col gap-1 rounded border p-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring";

/** An available image tile; shows the caption instead of a broken image when the image fails to load. */
function AvailableTile({
  image,
  address,
  onOpen,
}: {
  image: BeadImage;
  address: string;
  onOpen: (n: number, from: HTMLElement) => void;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <button
      type="button"
      onClick={(event) => onOpen(image.n, event.currentTarget)}
      className={TILE}
    >
      <span className="text-xs text-muted-foreground">{image.n}</span>
      {!broken && (
        <img
          src={address}
          alt={image.caption}
          loading="lazy"
          onError={() => setBroken(true)}
          className="max-h-40 w-full object-contain"
        />
      )}
      <span className="break-words [overflow-wrap:anywhere]">
        {image.caption}
      </span>
    </button>
  );
}

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
        {images.map((image) => {
          const address = image.available
            ? imageAddress(project, beadId, image)
            : null;
          return (
            <li key={image.n} className="min-w-0">
              {address !== null ? (
                <AvailableTile
                  image={image}
                  address={address}
                  onOpen={onOpen}
                />
              ) : (
                <div className="flex flex-col gap-1 rounded border border-dashed p-2 text-sm text-muted-foreground">
                  <span className="text-xs">{image.n}</span>
                  <span>{REASON_TEXT[image.reason ?? "none"]}</span>
                  {image.path !== null && (
                    <span className="break-words [overflow-wrap:anywhere]">
                      {image.path}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
