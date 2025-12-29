/**
 * Multi-tab synchronization hook
 *
 * Uses BroadcastChannel API to sync project state across browser tabs.
 * Prevents conflicts when the same project is open in multiple tabs.
 *
 * Features:
 * - Detects when another tab saves the same project
 * - Warns user about concurrent editing
 * - Can force-reload project data from server
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";

// Message types for inter-tab communication
interface ProjectSavedMessage {
  type: "PROJECT_SAVED";
  projectId: string;
  revision: number;
  tabId: string;
  timestamp: number;
}

interface ProjectOpenedMessage {
  type: "PROJECT_OPENED";
  projectId: string;
  tabId: string;
  timestamp: number;
}

interface TabClosingMessage {
  type: "TAB_CLOSING";
  projectId: string | null;
  tabId: string;
}

type SyncMessage = ProjectSavedMessage | ProjectOpenedMessage | TabClosingMessage;

// Channel name for project sync
const SYNC_CHANNEL_NAME = "e-meble-project-sync";

// Generate a unique ID for this tab
const generateTabId = () => `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface UseMultiTabSyncOptions {
  /** Callback when another tab saves the current project */
  onExternalSave?: (revision: number) => void;
  /** Callback when another tab opens the same project */
  onConcurrentEdit?: (tabId: string) => void;
  /** Whether to enable sync (default: true) */
  enabled?: boolean;
}

interface UseMultiTabSyncReturn {
  /** This tab's unique ID */
  tabId: string;
  /** Broadcast that this tab saved the project */
  broadcastSave: (revision: number) => void;
  /** Broadcast that this tab opened a project */
  broadcastOpen: () => void;
  /** Number of other tabs with the same project open */
  concurrentTabs: number;
}

/**
 * Hook for multi-tab synchronization
 *
 * @example
 * ```tsx
 * const { broadcastSave, concurrentTabs } = useMultiTabSync({
 *   onExternalSave: (revision) => {
 *     // Another tab saved - might need to reload
 *     console.log('External save detected, new revision:', revision);
 *   },
 *   onConcurrentEdit: (tabId) => {
 *     // Another tab opened the same project
 *     console.warn('Same project open in another tab');
 *   },
 * });
 * ```
 */
export function useMultiTabSync(options: UseMultiTabSyncOptions = {}): UseMultiTabSyncReturn {
  const { onExternalSave, onConcurrentEdit, enabled = true } = options;

  const tabIdRef = useRef<string>(generateTabId());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const concurrentTabsRef = useRef<Set<string>>(new Set());

  const { currentProjectId, currentProjectRevision, loadProject, setSyncStatus } = useStore(
    useShallow((state) => ({
      currentProjectId: state.currentProjectId,
      currentProjectRevision: state.currentProjectRevision,
      loadProject: state.loadProject,
      setSyncStatus: state.setSyncStatus,
    }))
  );

  // Initialize BroadcastChannel
  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === "undefined") {
      return;
    }

    const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent<SyncMessage>) => {
      const message = event.data;

      // Ignore messages from this tab
      if (message.tabId === tabIdRef.current) {
        return;
      }

      switch (message.type) {
        case "PROJECT_SAVED": {
          // Another tab saved a project
          if (message.projectId === currentProjectId) {
            console.log(
              `[MultiTabSync] External save detected for project ${message.projectId}, revision ${message.revision}`
            );

            // Check if we have local changes that would conflict
            const state = useStore.getState();
            if (state.syncState.status === "local_only") {
              // We have unsaved changes - this is a conflict
              console.warn("[MultiTabSync] Conflict detected - local changes will need resolution");
              // Set conflict status so user knows
              state.setSyncStatus("conflict");
            } else {
              // No local changes - just update our revision
              // The next save will use the correct revision
              onExternalSave?.(message.revision);
            }
          }
          break;
        }

        case "PROJECT_OPENED": {
          // Another tab opened a project
          if (message.projectId === currentProjectId) {
            concurrentTabsRef.current.add(message.tabId);
            console.log(
              `[MultiTabSync] Same project opened in another tab (${concurrentTabsRef.current.size} concurrent)`
            );
            onConcurrentEdit?.(message.tabId);
          }
          break;
        }

        case "TAB_CLOSING": {
          // Another tab is closing
          concurrentTabsRef.current.delete(message.tabId);
          break;
        }
      }
    };

    channel.addEventListener("message", handleMessage);

    // Broadcast that we opened this project
    if (currentProjectId) {
      channel.postMessage({
        type: "PROJECT_OPENED",
        projectId: currentProjectId,
        tabId: tabIdRef.current,
        timestamp: Date.now(),
      } satisfies ProjectOpenedMessage);
    }

    // Cleanup on unmount
    return () => {
      channel.removeEventListener("message", handleMessage);

      // Broadcast that we're closing
      channel.postMessage({
        type: "TAB_CLOSING",
        projectId: currentProjectId,
        tabId: tabIdRef.current,
      } satisfies TabClosingMessage);

      channel.close();
      channelRef.current = null;
    };
  }, [enabled, currentProjectId, onExternalSave, onConcurrentEdit]);

  // Broadcast when project changes
  useEffect(() => {
    if (!enabled || !channelRef.current || !currentProjectId) {
      return;
    }

    channelRef.current.postMessage({
      type: "PROJECT_OPENED",
      projectId: currentProjectId,
      tabId: tabIdRef.current,
      timestamp: Date.now(),
    } satisfies ProjectOpenedMessage);
  }, [enabled, currentProjectId]);

  // Broadcast that we saved
  const broadcastSave = useCallback(
    (revision: number) => {
      if (!channelRef.current || !currentProjectId) {
        return;
      }

      channelRef.current.postMessage({
        type: "PROJECT_SAVED",
        projectId: currentProjectId,
        revision,
        tabId: tabIdRef.current,
        timestamp: Date.now(),
      } satisfies ProjectSavedMessage);
    },
    [currentProjectId]
  );

  // Broadcast that we opened
  const broadcastOpen = useCallback(() => {
    if (!channelRef.current || !currentProjectId) {
      return;
    }

    channelRef.current.postMessage({
      type: "PROJECT_OPENED",
      projectId: currentProjectId,
      tabId: tabIdRef.current,
      timestamp: Date.now(),
    } satisfies ProjectOpenedMessage);
  }, [currentProjectId]);

  return {
    tabId: tabIdRef.current,
    broadcastSave,
    broadcastOpen,
    concurrentTabs: concurrentTabsRef.current.size,
  };
}

/**
 * Provider component that sets up multi-tab sync at the app level
 */
export function MultiTabSyncProvider({ children }: { children: React.ReactNode }) {
  const { markAsDirty, loadProject, currentProjectId } = useStore(
    useShallow((state) => ({
      markAsDirty: state.markAsDirty,
      loadProject: state.loadProject,
      currentProjectId: state.currentProjectId,
    }))
  );

  useMultiTabSync({
    onExternalSave: async (revision) => {
      // Another tab saved - reload to get latest
      if (currentProjectId) {
        console.log("[MultiTabSync] Reloading project after external save");
        await loadProject(currentProjectId);
      }
    },
    onConcurrentEdit: (tabId) => {
      // Just log for now - could show a warning toast
      console.log(`[MultiTabSync] Concurrent edit detected from tab ${tabId}`);
    },
  });

  return <>{children}</>;
}

export default useMultiTabSync;
