import type { MouseEvent, ReactNode } from "react";
import { navigate } from "./route";

export function Link({
  to,
  className,
  children,
  "aria-current": ariaCurrent,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  "aria-current"?: "page";
}) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} onClick={onClick} className={className} aria-current={ariaCurrent}>
      {children}
    </a>
  );
}
