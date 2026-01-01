"use client";

/**
 * FurnitureWizard - Conversational furniture design assistant
 *
 * A chat-like interface that guides users through furniture design.
 * Adapts questions based on detected user expertise level.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  WizardState,
  WizardMessage,
  initializeWizard,
  processUserMessage,
  generateFinalOutput,
  getSessionTokenUsage,
} from "@/lib/ai/wizard";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface FurnitureWizardProps {
  /** Called when wizard completes with generated output */
  onComplete?: (output: Awaited<ReturnType<typeof generateFinalOutput>>) => void;
  /** Called when user cancels wizard */
  onCancel?: () => void;
  /** Optional initial state for resuming */
  initialState?: WizardState;
  /** Whether wizard is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
}

// ============================================================================
// Message Components
// ============================================================================

function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-3 mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
        <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {content.split("**").map((part, i) =>
            i % 2 === 1 ? (
              <strong key={i}>{part}</strong>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-3 mb-4 justify-end">
      <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%]">
        <div className="text-sm whitespace-pre-wrap">{content}</div>
      </div>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
        <svg
          className="w-5 h-5 text-gray-600 dark:text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
    </div>
  );
}

function QuickReplies({
  options,
  onSelect,
  disabled,
}: {
  options: string[];
  onSelect: (option: string) => void;
  disabled: boolean;
}) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4 pl-11">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onSelect(option)}
          disabled={disabled}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full border transition-colors",
            "border-blue-300 text-blue-700 hover:bg-blue-50",
            "dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/30",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function ExpertiseIndicator({ level }: { level: string }) {
  const colors = {
    beginner: "bg-green-500",
    intermediate: "bg-yellow-500",
    professional: "bg-blue-500",
  };

  const labels = {
    beginner: "Tryb uproszczony",
    intermediate: "Tryb standardowy",
    professional: "Tryb profesjonalny",
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <span
        className={cn("w-2 h-2 rounded-full", colors[level as keyof typeof colors])}
      />
      <span>{labels[level as keyof typeof labels]}</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function FurnitureWizard({
  onComplete,
  onCancel,
  initialState,
  isOpen,
  onClose,
}: FurnitureWizardProps) {
  // State
  const [wizardState, setWizardState] = useState<WizardState>(() =>
    initialState || initializeWizard(`session_${Date.now()}`)
  );
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [wizardState.messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle send message
  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isProcessing) return;

      setIsProcessing(true);
      setInputValue("");

      // Simulate typing delay for natural feel
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400));

      // Process message
      const newState = processUserMessage(message, wizardState);
      setWizardState(newState);

      // Check if complete
      if (newState.phase === "complete" && onComplete) {
        const output = await generateFinalOutput(
          newState.projectData,
          newState.userProfile
        );
        onComplete(output);
      }

      setIsProcessing(false);
    },
    [wizardState, isProcessing, onComplete]
  );

  // Handle quick reply selection
  const handleQuickReply = useCallback(
    (option: string) => {
      handleSendMessage(option);
    },
    [handleSendMessage]
  );

  // Handle input submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  // Reset wizard
  const handleReset = () => {
    setWizardState(initializeWizard(`session_${Date.now()}`));
    setInputValue("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Asystent projektowania
              </h2>
              <ExpertiseIndicator level={wizardState.userProfile.expertiseLevel} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Zacznij od nowa"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {wizardState.messages.map((message) =>
            message.role === "assistant" ? (
              <AssistantMessage key={message.id} content={message.content} />
            ) : message.role === "user" ? (
              <UserMessage key={message.id} content={message.content} />
            ) : null
          )}

          {isProcessing && <TypingIndicator />}

          {!isProcessing && wizardState.suggestedOptions && (
            <QuickReplies
              options={wizardState.suggestedOptions}
              onSelect={handleQuickReply}
              disabled={isProcessing}
            />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Phase indicator */}
        <div className="px-6 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              Faza: {wizardState.phase.replace(/_/g, " ")}
            </span>
            <span>
              {wizardState.projectData.cabinets.length} szafek
            </span>
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Wpisz wiadomość lub wybierz opcję powyżej..."
              disabled={isProcessing}
              className={cn(
                "flex-1 px-4 py-3 rounded-xl border",
                "bg-gray-50 dark:bg-gray-800",
                "border-gray-200 dark:border-gray-700",
                "text-gray-900 dark:text-white",
                "placeholder-gray-500",
                "focus:outline-none focus:ring-2 focus:ring-blue-500",
                "disabled:opacity-50"
              )}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isProcessing}
              className={cn(
                "px-6 py-3 rounded-xl font-medium transition-colors",
                "bg-blue-600 text-white hover:bg-blue-700",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default FurnitureWizard;
