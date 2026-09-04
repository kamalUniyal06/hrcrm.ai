import React from "react";
import { headingLogo } from "../assets/assets";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });

    // TODO: send logs to backend
    // sendErrorToServer({ error, errorInfo });
  }

  handleReset = () => {
    window.location.reload();
  };
  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="inset-0 z-[9999] flex items-center justify-center  px-4 h-[100vh]">
          <div className="w-full rounded-2xl bg-white p-8 text-center items-center justify-center">
            {/* Icon */}
            <div className="mx-auto flex h-14 w-100 mt-14 items-center justify-center mb-10">
              <img
                src={headingLogo}
                alt=""
                className="w-100"
              />
            </div>



            {/* Description */}
            <p className="mt-2 text-lg text-gray-600">
              Our Servers are currently experiencing high traffic. <br /> Please
              try again in a few moments.
            </p>

            {/* Action */}
            <div className="flex gap-5 items-center justify-center">
              <button
                onClick={this.handleReset}
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-red-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              >
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="mt-6 inline-flex items-center justify-center  rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                Go Home
              </button>
            </div>


            {/* Dev-only error details */}
            {process.env.NODE_ENV === "development" && (
              <pre className="mt-6 max-h-48 overflow-auto rounded-xl bg-gray-900 p-4 text-left text-xs text-red-300">
                {this.state.error?.toString()}
                {"\n"}
                {this.state.errorInfo?.componentStack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
