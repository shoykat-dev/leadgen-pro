"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorState } from "@/components/error-state";
import { RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[React AppErrorBoundary Caught Crash]:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full py-12 px-4 flex items-center justify-center">
          <ErrorState
            title={this.props.fallbackTitle || "Component Encountered an Issue"}
            message={
              this.props.fallbackMessage ||
              "A view component failed to render. Please try refreshing this section."
            }
            primaryAction={{
              label: "Try again",
              onClick: this.handleReset,
              icon: <RefreshCw className="w-4 h-4" />,
            }}
            technicalDetails={
              process.env.NODE_ENV === "development" && this.state.error
                ? `${this.state.error.name}: ${this.state.error.message}\n${this.state.error.stack}`
                : null
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}
