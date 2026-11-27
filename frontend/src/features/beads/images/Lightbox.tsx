import { Dialog } from "@base-ui/react/dialog";
import { useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { imageAddress, type BeadImage } from "../api";

/** REQ-BEADS-030: one available image large, stepping over the available images without wrapping. */
export function Lightbox({
  project,
  beadId,
  images,
  current,
  onChange,
  onClose,
}: {
  project: string;
  beadId: string;
  images: readonly BeadImage[];
  current: number | null;
  onChange: (n: number) => void;
  onClose: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const available = images.filter((image) => image.available);
  const index = available.findIndex((image) => image.n === current);
  const image = index >= 0 ? available[index] : null;
  const address = image ? imageAddress(project, beadId, image) : null;

  const step = (by: number) => {
    const next = available[index + by];
    if (next) onChange(next.n);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    const by = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (by === 0) return;
    event.preventDefault();
    step(by);
  };

  const arrow =
    "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded border bg-background focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-40";

  return (
    <Dialog.Root open={image !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Popup
          ref={popupRef}
          initialFocus={popupRef}
          onKeyDown={onKeyDown}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[min(60rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-lg border bg-background p-4 shadow-xl outline-none"
        >
          {image && (
            <>
              <div className="flex items-start justify-between gap-3">
                <Dialog.Title className="m-0 min-w-0 break-words text-base font-semibold [overflow-wrap:anywhere]">
                  {image.caption}
                </Dialog.Title>
                <Dialog.Close
                  aria-label="Close"
                  className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded border focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <X aria-hidden className="size-4" />
                </Dialog.Close>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Previous image" disabled={index === 0} onClick={() => step(-1)} className={arrow}>
                  <ChevronLeft aria-hidden className="size-4" />
                </button>
                <div className="flex min-w-0 flex-1 justify-center">
                  <img
                    src={address ?? undefined}
                    alt={image.caption}
                    className="max-h-[70vh] max-w-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Next image"
                  disabled={index === available.length - 1}
                  onClick={() => step(1)}
                  className={arrow}
                >
                  <ChevronRight aria-hidden className="size-4" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {index + 1} of {available.length}
                </span>
                <a href={address ?? undefined} target="_blank" rel="noreferrer" className="prose-link">
                  Open original
                </a>
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
