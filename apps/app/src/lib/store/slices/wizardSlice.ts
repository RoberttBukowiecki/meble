/**
 * Wizard Slice - State management for Furniture Design Wizard
 *
 * Manages wizard state persistence and integration with main app.
 */

import { StateCreator } from "zustand";
import type { WizardState, GeneratedOutput } from "@/lib/ai/wizard";
import { initializeWizard, processUserMessage, generateFinalOutput } from "@/lib/ai/wizard";

// ============================================================================
// Types
// ============================================================================

export interface WizardSlice {
  // Wizard state
  wizardOpen: boolean;
  wizardState: WizardState | null;
  wizardOutput: GeneratedOutput | null;
  wizardError: string | null;

  // Actions
  openWizard: () => void;
  closeWizard: () => void;
  resetWizard: () => void;
  sendWizardMessage: (message: string) => Promise<void>;
  applyWizardOutput: () => void;
  clearWizardOutput: () => void;
}

// ============================================================================
// Slice Creator
// ============================================================================

export const createWizardSlice: StateCreator<
  WizardSlice,
  [],
  [],
  WizardSlice
> = (set, get) => ({
  // Initial state
  wizardOpen: false,
  wizardState: null,
  wizardOutput: null,
  wizardError: null,

  // Open wizard
  openWizard: () => {
    const existingState = get().wizardState;
    set({
      wizardOpen: true,
      wizardState: existingState || initializeWizard(`session_${Date.now()}`),
      wizardError: null,
    });
  },

  // Close wizard
  closeWizard: () => {
    set({ wizardOpen: false });
  },

  // Reset wizard to initial state
  resetWizard: () => {
    set({
      wizardState: initializeWizard(`session_${Date.now()}`),
      wizardOutput: null,
      wizardError: null,
    });
  },

  // Send message to wizard
  sendWizardMessage: async (message: string) => {
    const currentState = get().wizardState;
    if (!currentState) return;

    try {
      // Update state to processing
      set({
        wizardState: { ...currentState, isProcessing: true },
        wizardError: null,
      });

      // Process message
      const newState = processUserMessage(message, currentState);

      // Check if wizard is complete
      if (newState.phase === "complete") {
        const output = await generateFinalOutput(
          newState.projectData,
          newState.userProfile
        );
        set({
          wizardState: newState,
          wizardOutput: output,
        });
      } else {
        set({ wizardState: newState });
      }
    } catch (error) {
      set({
        wizardError: error instanceof Error ? error.message : "Wystąpił błąd",
        wizardState: { ...currentState, isProcessing: false },
      });
    }
  },

  // Apply wizard output to main app (creates cabinets)
  applyWizardOutput: () => {
    const output = get().wizardOutput;
    if (!output) return;

    // This will be connected to the cabinet creation logic
    // For now, just log and close
    console.log("Applying wizard output:", output);

    set({
      wizardOpen: false,
      wizardOutput: null,
    });
  },

  // Clear wizard output without applying
  clearWizardOutput: () => {
    set({ wizardOutput: null });
  },
});

// ============================================================================
// Selectors
// ============================================================================

export const selectWizardOpen = (state: WizardSlice) => state.wizardOpen;
export const selectWizardState = (state: WizardSlice) => state.wizardState;
export const selectWizardOutput = (state: WizardSlice) => state.wizardOutput;
export const selectWizardPhase = (state: WizardSlice) =>
  state.wizardState?.phase ?? "greeting";
export const selectWizardMessages = (state: WizardSlice) =>
  state.wizardState?.messages ?? [];
export const selectUserExpertiseLevel = (state: WizardSlice) =>
  state.wizardState?.userProfile.expertiseLevel ?? "beginner";
