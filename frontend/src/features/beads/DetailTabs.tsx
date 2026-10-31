import { Tabs } from "@/components/Tabs";

export type DetailTab = "details" | "discussion";

export function DetailTabs({
  tab,
  onChange,
  count,
  className,
}: {
  tab: DetailTab;
  onChange: (tab: DetailTab) => void;
  count: number;
  className?: string;
}) {
  return (
    <Tabs
      tabs={[
        { value: "details", label: "Details" },
        { value: "discussion", label: `Discussion (${count})` },
      ]}
      tab={tab}
      onChange={onChange}
      label="Bead sections"
      className={className}
    />
  );
}
