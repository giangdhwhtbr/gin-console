import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

export function ChartBox({ height, children }: { height: number; children: ReactElement }) {
  return (
    <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 640, height }}>
      {children}
    </ResponsiveContainer>
  );
}
