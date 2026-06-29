import { Component, type ErrorInfo, type ReactNode } from "react";
import { logger } from "../utils/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch and handle React errors gracefully
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("ErrorBoundary caught an error:", error, errorInfo);

    // In production, send to error tracking service
    // sendToErrorTracking(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: "4px",
            margin: "20px",
          }}
        >
          <h2>Алдаа гарлаа</h2>
          <p>Уучлаарай, алдаа гарлаа. Хуудсыг дахин ачаалж үзнэ үү.</p>
          {this.state.error && (
            <details style={{ marginTop: "10px", textAlign: "left" }}>
              <summary>Дэлгэрэнгүй</summary>
              <pre
                style={{
                  fontSize: "12px",
                  overflow: "auto",
                  backgroundColor: "#fff",
                  padding: "10px",
                  borderRadius: "4px",
                }}
              >
                {this.state.error.message}
                {"\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "15px",
              padding: "10px 20px",
              backgroundColor: "#721c24",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Дахин ачаалах
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
