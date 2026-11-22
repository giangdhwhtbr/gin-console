import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { DayRow, TeamMilestone } from "../teamApi";
import { formatDate } from "@/lib/dates";
import { placeAxisLabels } from "./axisLabels";
import { memberColor } from "./format";

const DEFAULT_PLOT_WIDTH = 640; // until the first measure, and in tests, which have no layout

const isMonday = (date: string): boolean => new Date(date).getUTCDay() === 1;

/** Beads closed per working day as an HTML column chart stacked by member; nothing before the milestone has begun. */
export function ClosedPerDayChart({
  days,
  members,
  selected,
  today,
  milestone,
}: {
  days: DayRow[];
  members: string[];
  selected: string;
  today: string;
  milestone: TeamMilestone;
}) {
  const empty = days.length === 0;
  const layer = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState(DEFAULT_PLOT_WIDTH);
  useLayoutEffect(() => {
    const el = layer.current;
    if (el === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 0) setPlotWidth(el.clientWidth);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [empty]);
  if (days.length === 0 || days[0].date > today || milestone.start > today) return null;
  const totalOf = (day: DayRow): number => members.reduce((sum, m) => sum + (day.closed[m] ?? 0), 0);
  const max = Math.max(4, ...days.map(totalOf));
  const step = Math.ceil(max / 4);
  const ticks = Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
  const withClosed = members.filter((m) => days.some((d) => (d.closed[m] ?? 0) > 0));
  const last = days[days.length - 1].date;
  const endMarked = last > milestone.end && days.some((d) => d.date === milestone.end);
  const markerOf = (day: DayRow): string | null =>
    day.date === today ? "Today" : endMarked && day.date === milestone.end ? `End ${formatDate(day.date, today)}` : null;
  // a marker within 5 columns of the one before it goes on a second row above the plot, so two labels never overlap
  const markers = days.flatMap((day, index) => {
    const text = markerOf(day);
    return text === null ? [] : [{ text, index }];
  });
  const rowOf = (k: number) => (k > 0 && markers[k].index - markers[k - 1].index < 5 ? 1 : 0);
  const stacked = markers.some((_, k) => rowOf(k) === 1);
  // labels sit in a layer over the columns, so one wider than a column does not spill out of it; the first and the last
  // columns align their label to the chart edge so it stays inside
  const placeOf = (index: number): CSSProperties =>
    index === 0 ? { left: 0 } : index >= days.length - 3 ? { right: 0 } : { left: `${((index + 0.5) / days.length) * 100}%`, transform: "translateX(-50%)" };
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Closed per working day</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {withClosed.map((m) => (
            <li key={m} className="flex items-center gap-1">
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: memberColor(members, m) }} />
              {m}
            </li>
          ))}
        </ul>
      </div>
      <div className={cn("relative h-52 pl-8", stacked && "mt-4")}>
        <div aria-hidden className="absolute inset-y-0 left-0 right-0 bottom-5 top-2">
          {ticks.map((tick) => (
            <div key={tick} className="absolute inset-x-0 border-t border-border" style={{ bottom: `${(tick / max) * 100}%` }}>
              <span className="absolute -top-2 left-0 w-6 text-right text-xs text-muted-foreground">{tick}</span>
            </div>
          ))}
        </div>
        <ol aria-label="Beads closed per working day, stacked by member" className="relative flex h-full gap-1 pb-5 pt-2">
          {days.map((day) => {
            const parts = members.filter((m) => (day.closed[m] ?? 0) > 0);
            const total = totalOf(day);
            const date = formatDate(day.date, today);
            const label = `${date}: ${[...parts.map((m) => `${m} ${day.closed[m]}`), `total ${total}`].join(", ")}`;
            const future = day.date > today && milestone.status !== "closed";
            const marker = markerOf(day);
            return (
              <li
                key={day.date}
                tabIndex={0}
                aria-label={label}
                className={cn(
                  "group relative flex min-w-0 flex-1 flex-col justify-end rounded-sm focus-visible:outline-2 focus-visible:outline-ring",
                  marker !== null && "border-dashed border-foreground/55",
                  marker === "Today" && "border-l",
                  marker !== null && marker !== "Today" && "border-r",
                )}
              >
                <div aria-hidden className="flex h-full flex-col-reverse px-px">
                  {future ? (
                    <span className="h-0.5 bg-border" />
                  ) : (
                    parts.map((m) => (
                      <span
                        key={m}
                        className={cn("block", selected !== "" && selected !== m && "opacity-20")}
                        style={{ height: `${((day.closed[m] ?? 0) / max) * 100}%`, background: memberColor(members, m) }}
                      />
                    ))
                  )}
                </div>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 flex-col whitespace-nowrap rounded border bg-popover p-2 text-xs text-popover-foreground group-hover:flex group-focus:flex"
                >
                  <span className="font-medium">{date}</span>
                  {parts.map((m) => (
                    <span key={m}>{`${m} ${day.closed[m]}`}</span>
                  ))}
                  <span>{`total ${total}`}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <div ref={layer} aria-hidden className="pointer-events-none absolute inset-y-0 left-8 right-0">
          {markers.map(({ text, index }, k) => (
            <span key={text} className="absolute whitespace-nowrap text-xs" style={{ ...placeOf(index), top: rowOf(k) === 0 ? 0 : "-1rem" }}>
              {text}
            </span>
          ))}
          {placeAxisLabels(
            days.flatMap((day, index) => (isMonday(day.date) || index === 0 ? [{ index, text: formatDate(day.date, today) }] : [])),
            days.length,
            plotWidth,
          ).map(({ index, text, left }) => (
            <span key={index} className="absolute bottom-0 whitespace-nowrap text-xs text-muted-foreground" style={{ left }}>
              {text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
