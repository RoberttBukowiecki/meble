/**
 * Hook to track Zustand store hydration status
 *
 * Zustand persist middleware loads state from localStorage asynchronously.
 * This hook allows components to wait for hydration to complete before
 * accessing persisted state.
 */

import { useSyncExternalStore } from "react";
import { useStore } from "@/lib/store";

/**
 * Returns true when store has finished hydrating from localStorage.
 * Use this to avoid reading stale initial state before hydration completes.
 */
export function useHydration() {
  return useSyncExternalStore(
    (onStoreChange) => useStore.persist.onFinishHydration(onStoreChange),
    () => useStore.persist.hasHydrated(),
    () => false // Server snapshot - not hydrated on server
  );
}
