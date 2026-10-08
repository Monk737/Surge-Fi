import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Unhandled UI error:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-12 rounded-xl text-center border-4 border-black shadow-neo-lg max-w-md">
          <h2 className="text-3xl font-black text-black mb-4 uppercase">Something went wrong</h2>
          <p className="text-gray-600 font-medium mb-6">
            The page hit an unexpected error. Your funds and positions are not affected.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-black text-white font-black rounded-lg border-2 border-black shadow-neo-sm hover:bg-gray-800"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
