import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null; errorInfo: string; copied: boolean };

/** Matches Vite/browser messages for a dynamic import that 404'd after a deploy. */
function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Failed to fetch/i.test(
    `${error.name} ${error.message}`,
  );
}

/**
 * Global error boundary — catches React render crashes and shows
 * a friendly recovery UI. Technical details are hidden behind a
 * "Copy issue details" button so users can paste into bug reports.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: "", copied: false };

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
    // Stale-chunk crashes can only be cleared by refetching the asset manifest.
    if (isChunkLoadError(this.state.error)) {
      location.reload();
      return;
    }
    this.setState({ error: null, errorInfo: "", copied: false });
    location.hash = "#trips";
  };

  handleCopy = () => {
    const text = `## Bug Report — Roamwise\n\n**What happened?**\n\n<!-- Describe what you were doing when this error occurred -->\n\n**Debug info**\n\n\`\`\`\n${this.state.errorInfo}\n\`\`\``;
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }).catch(() => {});
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

    const chunkError = isChunkLoadError(this.state.error);

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6 text-center">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-800">
              {chunkError ? "A new version is available" : "Something went wrong"}
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              {chunkError ? (
                <>Roamwise was updated while this tab was open.<br/>Reload to get the latest version — your data is safe.</>
              ) : (
                <>Roamwise ran into an unexpected issue.<br/>Your data is safe — nothing has been lost.</>
              )}
            </p>
          </div>

          {/* Primary action */}
          <button
            onClick={this.handleReset}
            className="w-full px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 motion-safe:active:scale-[0.98] transition-colors shadow-sm focus-ring"
          >
            {chunkError ? "Reload App" : "Try Again"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Report this issue</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Report actions */}
          <div className="flex gap-2">
            <button
              onClick={this.handleCopy}
              className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors focus-ring ${
                this.state.copied
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {this.state.copied ? "✓ Copied!" : "📋 Copy Details"}
            </button>
            <button
              onClick={this.handleReport}
              className="flex-1 px-3 py-2.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-100 transition-colors focus-ring"
            >
              GitHub Issue
            </button>
            <button
              onClick={this.handleEmail}
              className="flex-1 px-3 py-2.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-100 transition-colors focus-ring"
            >
              ✉️ Email
            </button>
          </div>

          {/* Subtle hint */}
          <p className="text-[10px] text-gray-400">
            Use "Copy Details" to include technical info when reporting this issue.
          </p>

          <p className="text-[10px] text-gray-300">
            v{__APP_VERSION__} · {__BUILD_TIME__}
          </p>
        </div>
      </div>
    );
  }
}

declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
