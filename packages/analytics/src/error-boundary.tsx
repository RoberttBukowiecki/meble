'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { posthog } from './client';

interface AnalyticsErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface AnalyticsErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error Boundary that automatically captures React errors to PostHog.
 * Wraps components to catch rendering errors and report them for debugging.
 *
 * @example
 * ```tsx
 * <AnalyticsErrorBoundary fallback={<ErrorPage />}>
 *   <MyComponent />
 * </AnalyticsErrorBoundary>
 * ```
 */
export class AnalyticsErrorBoundary extends Component<
  AnalyticsErrorBoundaryProps,
  AnalyticsErrorBoundaryState
> {
  constructor(props: AnalyticsErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AnalyticsErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Capture exception to PostHog with component stack
    if (typeof posthog?.captureException === 'function') {
      posthog.captureException(error, {
        extra: {
          componentStack: errorInfo.componentStack,
        },
      });
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
            <p className="mt-1 text-sm text-gray-500">
              An error occurred. Please try refreshing the page.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Manually capture an exception to PostHog.
 * Use this in try-catch blocks for errors you want to track.
 *
 * @example
 * ```tsx
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   captureException(error, { component: 'ExportDialog', action: 'export_pdf' });
 * }
 * ```
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  if (typeof posthog?.captureException === 'function') {
    posthog.captureException(error, {
      extra: context,
    });
  }
}
