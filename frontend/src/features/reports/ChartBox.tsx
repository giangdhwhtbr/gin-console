import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

// Legend labels in a text token; Recharts would color them with the series color
export const legendText = (value: string) => <span className="text-foreground">{value}</span>;

export function ChartBox({ height, children }: { height: number; children: ReactElement }) {
  return (
    <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 640, height }}>
      {children}
    </ResponsiveContainer>
  );
}
