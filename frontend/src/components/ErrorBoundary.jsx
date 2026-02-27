/**
 * ErrorBoundary — production crash shield.
 *
 * Wraps any subtree; catches unhandled render errors and shows a recovery UI
 * instead of a blank screen. Logs to console (and optionally to an error
 * tracking service like Sentry).
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 *   <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *     <DangerousWidget />
 *   </ErrorBoundary>
 */
import { Component } from "react";

const T = {
  bg: "#05070f",
  bgCard: "#090d1a",
  bgEl: "#0c1120",
  border: "#18233d",
  borderHi: "#1e3560",
  cyan: "#00d4ff",
  red: "#ff3e5e",
  redFaint: "#ff3e5e14",
  amber: "#ffaa00",
  text: "#dde6f5",
  textSub: "#8899bb",
  textDim: "#2e3f60",
};

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log structured error
    console.error("[ErrorBoundary] Caught render error:", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Hook: send to error tracking (Sentry, Datadog RUM, etc.)
    if (typeof window.__forgeReportError === "function") {
      window.__forgeReportError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state;

    if (!hasError) return this.props.children;

    // Allow caller to supply a custom fallback
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Space Grotesk', sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            background: T.bgCard,
            border: `1px solid ${T.borderHi}`,
            borderRadius: 16,
            padding: 32,
            boxShadow: `0 0 60px ${T.red}10, 0 24px 48px rgba(0,0,0,.5)`,
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: T.redFaint,
              border: `1px solid ${T.red}40`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              marginBottom: 20,
            }}
          >
            ⚠
          </div>

          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 12, color: T.textSub, marginBottom: 20, lineHeight: 1.6 }}>
            An unexpected error occurred in this part of the interface. Your work has not been
            lost — you can try recovering below or reload the page.
          </div>

          {/* Error detail */}
          {error && (
            <div
              style={{
                background: "#030508",
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 20,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: T.red,
                wordBreak: "break-word",
                lineHeight: 1.7,
              }}
            >
              <div style={{ color: T.amber, marginBottom: 4, fontSize: 9, letterSpacing: "0.1em" }}>
                ERROR
              </div>
              {error.message}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 8,
                background: T.bgEl,
                border: `1px solid ${T.border}`,
                color: T.textSub,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.07em",
              }}
            >
              TRY AGAIN
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 8,
                background: `${T.cyan}18`,
                border: `1px solid ${T.cyan}50`,
                color: T.cyan,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: "0.07em",
              }}
            >
              RELOAD PAGE
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
