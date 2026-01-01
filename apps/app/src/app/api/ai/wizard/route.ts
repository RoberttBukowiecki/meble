/**
 * Furniture Design Wizard API
 *
 * Server-side endpoint for wizard processing.
 * Currently uses client-side logic, but prepared for:
 * - Voice input transcription
 * - AI-enhanced understanding
 * - Session persistence
 */

import { NextRequest, NextResponse } from "next/server";
import {
  WizardRequest,
  WizardResponse,
  WizardState,
  processUserMessage,
  initializeWizard,
  generateFinalOutput,
} from "@/lib/ai/wizard";

// ============================================================================
// POST - Process wizard message
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WizardRequest;
    const { sessionId, userMessage, state } = body;

    // Validate request
    if (!sessionId || !userMessage) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, userMessage" },
        { status: 400 }
      );
    }

    // Initialize state if not provided
    const currentState = state || initializeWizard(sessionId);

    // Process message
    const newState = processUserMessage(userMessage, currentState);

    // Build response
    const response: WizardResponse = {
      message: newState.currentQuestion || "",
      state: newState,
      quickReplies: newState.suggestedOptions,
      tokensUsed: {
        input: 0, // Rule-based, no AI tokens used
        output: 0,
      },
    };

    // If complete, generate output
    if (newState.phase === "complete") {
      response.output = await generateFinalOutput(
        newState.projectData,
        newState.userProfile
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Wizard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Get initial wizard state
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") || `session_${Date.now()}`;

  const state = initializeWizard(sessionId);

  return NextResponse.json({
    state,
    message: state.currentQuestion,
    quickReplies: state.suggestedOptions,
  });
}

// ============================================================================
// Config
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
