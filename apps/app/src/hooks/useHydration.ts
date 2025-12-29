/**
 * Hook to track Zustand store hydration status
 *
 * Zustand persist middleware loads state from localStorage asynchronously.
 * This hook allows components to wait for hydration to complete before
 * accessing persisted state.
 */

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

/**
 * Returns true when store has finished hydrating from localStorage.
 * Use this to avoid reading stale initial state before hydration completes.
 */
export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Check if already hydrated (e.g., on subsequent renders)
    if (useStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    // Wait for hydration to complete
    const unsubscribe = useStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return hydrated;
}
