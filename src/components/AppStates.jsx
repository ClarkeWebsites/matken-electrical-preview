import { Component } from "react";
import { ArrowClockwise, House, WarningCircle } from "@phosphor-icons/react";
import { Link } from "react-router";

export function RouteLoadingState() {
  return (
    <section className="route-state route-loading" aria-live="polite">
      <div className="shell route-state-card">
        <span className="route-loading-mark" aria-hidden="true" />
        <p>Loading this Matken page…</p>
      </div>
    </section>
  );
}

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, details) {
    console.error("Matken page error", error, details);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <section className="route-state route-error" role="alert">
        <div className="shell route-state-card">
          <WarningCircle size={34} weight="duotone" aria-hidden="true" />
          <span className="section-index">Page recovery</span>
          <h1>This page did not finish loading.</h1>
          <p>
            Refresh the page to try again, or return home and continue from
            there.
          </p>
          <div className="button-row">
            <button
              className="button button-primary"
              type="button"
              onClick={() => window.location.reload()}
            >
              <ArrowClockwise size={18} weight="bold" aria-hidden="true" />
              Reload page
            </button>
            <Link className="button button-outline" to="/">
              <House size={18} weight="bold" aria-hidden="true" />
              Return home
            </Link>
          </div>
        </div>
      </section>
    );
  }
}
