import { Component } from 'react';
import { reportError } from '../../utils/errors';

// Catches errors thrown while rendering its children and shows a recovery screen instead of a
// blank page. It does not catch errors in event handlers or async code; those are handled with
// try/catch at the call site and by the global handlers in utils/globalErrorHandlers.js.
//
// Props:
//   resetKeys - when any value changes (e.g. the route path) the boundary clears its error
//   fallback  - optional render function ({ error, reset }) => node
//   scope     - 'app' for the outermost boundary, 'page' for a single route
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportError(error, { source: `ErrorBoundary:${this.props.scope || 'page'}`, componentStack: info?.componentStack });
  }

  componentDidUpdate(prevProps) {
    if (!this.state.error) return;
    const prev = prevProps.resetKeys || [];
    const next = this.props.resetKeys || [];
    if (prev.length !== next.length || prev.some((key, i) => !Object.is(key, next[i]))) {
      this.reset();
    }
  }

  reset() {
    this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (typeof this.props.fallback === 'function') {
      return this.props.fallback({ error, reset: this.reset });
    }

    return <ErrorFallback error={error} onRetry={this.reset} isAppScope={this.props.scope === 'app'} />;
  }
}

// Plain markup only: this may render outside the router and providers.
function ErrorFallback({ error, onRetry, isAppScope }) {
  return (
    <div role="alert" className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl font-bold text-red-600" aria-hidden="true">!</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="mb-6 text-gray-600">
          This page ran into an unexpected problem. Your saved data is not affected. Try again, or go back to your dashboard.
        </p>
        {import.meta.env.DEV && error?.message && (
          <pre className="mb-6 max-h-40 overflow-auto rounded bg-gray-100 p-3 text-left text-xs text-red-700 whitespace-pre-wrap">{error.message}</pre>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          {!isAppScope && (
            <button type="button" onClick={onRetry} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Try again
            </button>
          )}
          <button type="button" onClick={() => window.location.reload()} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Reload page
          </button>
          <a href="/" className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
