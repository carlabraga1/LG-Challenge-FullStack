import { Component, type ErrorInfo, type ReactNode } from "react";
import { dictionaries, type Language } from "@/i18n/translations";

/**
 * Reads the stored language directly instead of using the context.
 *
 * This boundary sits *above* LanguageProvider — it has to, or a crash inside
 * the provider would have nothing to catch it — so there is no context to
 * consume here.
 */
function crashCopy() {
  const stored = localStorage.getItem("movielens.language.v1");
  const language: Language = stored === "pt-BR" ? "pt-BR" : "en";
  return dictionaries[language];
}

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * A real error boundary: React only surfaces render-phase crashes through the
 * class lifecycle, so this cannot be a hook. Query and network failures are
 * handled per-section by ErrorState — this is the last resort that keeps a
 * thrown render from leaving a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ui] unhandled render error", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const copy = crashCopy();

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
        <h1 className="text-2xl font-bold">{copy["error.boundary.title"]}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
        {/* Deliberately a plain <button> rather than the shared Button: this
            screen renders precisely when something in the component tree threw,
            so it depends on nothing but Tailwind classes. */}
        <button
          type="button"
          onClick={() => window.location.assign("/")}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copy["error.boundary.reload"]}
        </button>
      </div>
    );
  }
}
