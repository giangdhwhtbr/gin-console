import type { KeyboardEvent } from "react";

const items = (tree: HTMLElement) => Array.from(tree.querySelectorAll<HTMLElement>('[role="treeitem"]'));
const levelOf = (item: HTMLElement) => Number(item.getAttribute("aria-level"));

/** Standard tree keys on a `role="tree"` element: the handler goes on the tree. */
export function treeKeyDown(
  event: KeyboardEvent<HTMLElement>,
  actions: { toggle: (id: string, open: boolean) => void; select: (id: string) => void },
): void {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const item = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[role="treeitem"]') : null;
  if (item === null) return;
  const list = items(event.currentTarget);
  const at = list.indexOf(item);
  const id = item.dataset.id ?? "";
  const expanded = item.getAttribute("aria-expanded");
  const go = (target: HTMLElement | undefined) => {
    if (target === undefined) return;
    event.preventDefault();
    target.focus();
  };
  switch (event.key) {
    case "ArrowDown":
      go(list.at(at + 1));
      break;
    case "ArrowUp":
      go(at > 0 ? list.at(at - 1) : undefined);
      break;
    case "ArrowRight":
      if (expanded === "false") {
        event.preventDefault();
        actions.toggle(id, true);
      } else if (expanded === "true") {
        go(list.at(at + 1));
      }
      break;
    case "ArrowLeft":
      if (expanded === "true") {
        event.preventDefault();
        actions.toggle(id, false);
      } else {
        go(list.slice(0, at).reverse().find((candidate) => levelOf(candidate) < levelOf(item)));
      }
      break;
    case "Enter":
      event.preventDefault();
      actions.select(id);
      break;
    default:
  }
}
