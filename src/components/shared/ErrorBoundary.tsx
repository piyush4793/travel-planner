import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null; errorInfo: string };

/**
 * Global error boundary — catches React render crashes and shows
 * a recovery UI with debug info the user can copy for bug reports.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: "" };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    const debugInfo = [
      `Error: ${error.message}`,
      `Stack: ${error.stack?.split("\n").slice(0, 5).join("\n") ?? "N/A"}`,
      `Component: ${info.componentStack?.split("\n").slice(0, 5).join("\n") ?? "N/A"}`,
      `App version: ${__APP_VERSION__}`,
      `Build: ${__BUILD_TIME__}`,
      `UA: ${navigator.userAgent}`,
      `URL: ${location.href}`,
      `Viewport: ${innerWidth}x${innerHeight}`,
      `localStorage keys: ${Object.keys(localStorage).filter(k => k.startsWith("tp_")).join(", ")}`,
    ].join("\n");
    this.setState({ errorInfo: debugInfo });
  }

  handleReset = () => {
    this.setState({ error: null, errorInfo: "" });
    location.hash = "#trips";
  };

  handleCopy = () => {
    navigator.clipboard.writeText(this.state.errorInfo).catch(() => {});
  };

  handleReport = () => {
    const title = encodeURIComponent(`Bug: ${this.state.error?.message?.slice(0, 80) ?? "App crash"}`);
    const body = encodeURIComponent(
      `## What happened?\n\n<!-- Describe what you were doing -->\n\n## Debug info\n\n\`\`\`\n${this.state.errorInfo}\n\`\`\``,
    );
    window.open(`https://github.com/piyush4793/travel-planner/issues/new?title=${title}&body=${body}`, "_blank");
  };

  handleEmail = () => {
    const subject = encodeURIComponent(`Bug: ${this.state.error?.message?.slice(0, 80) ?? "App crash"}`);
    const body = encodeURIComponent(
      `What happened?\n\n[Describe what you were doing]\n\nDebug info:\n${this.state.errorInfo}`,
    );
    window.open(`mailto:techiedojo4793@gmail.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 space-y-5">
          <div className="text-center space-y-2">
            <span className="text-4xl">🛠️</span>
            <h1 className="text-xl font-bold text-gray-800">Something went wrong</h1>
            <p className="text-sm text-gray-500">
              Roamwise hit an unexpected error. Your data is safe in localStorage.
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 font-mono max-h-40 overflow-auto">
            {this.state.error.message}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={this.handleReset}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors min-w-[120px]"
            >
              🔄 Try Again
            </button>
            <button
              onClick={this.handleCopy}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
              title="Copy debug info to clipboard"
            >
              📋 Copy
            </button>
            <button
              onClick={this.handleReport}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
              title="Open GitHub issue with debug info"
            >
              🐛 GitHub
            </button>
            <button
              onClick={this.handleEmail}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
              title="Email bug report"
            >
              ✉️ Email
            </button>
          </div>

          <p className="text-[10px] text-gray-400 text-center">
            v{__APP_VERSION__} · {__BUILD_TIME__}
          </p>
        </div>
      </div>
    );
  }
}

declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
