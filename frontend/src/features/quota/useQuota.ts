import { useSyncExternalStore } from "react";
import { useVisibleInterval } from "@/lib/useVisibleInterval";
import { getQuotaState, loadQuota, subscribeQuota } from "./quotaStore";

const POLL_MS = 60_000;
const poll = () => {
  void loadQuota(false);
};
const reload = () => {
  void loadQuota(false);
};
const refresh = () => {
  void loadQuota(true);
};

export function useQuota() {
  const { snapshot, pending } = useSyncExternalStore(subscribeQuota, getQuotaState);
  useVisibleInterval(poll, POLL_MS);
  return { snapshot, pending, reload, refresh };
}
