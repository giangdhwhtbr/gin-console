const MINUTES_PER_DAY = 480;

/** REQ-UI-109: working days, one decimal. */
export const daysOf = (minutes: number): number => Math.round((minutes / MINUTES_PER_DAY) * 10) / 10;

export const estimateText = (minutes: number | null): string | null => (minutes === null ? null : `${daysOf(minutes)}d`);
