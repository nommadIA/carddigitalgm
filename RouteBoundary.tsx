
import React, { Component, ReactNode } from "react";

type Props = { title: string; children?: ReactNode };
type State = { hasError: boolean; error?: unknown };

export default class RouteBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: undefined };

  declare props: Readonly<Props>;

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    console.error("ROUTE CRASH:", this.props.title, error);
  }

  render() {
    if (this.state.hasError) {
      const msg =
        (this.state.error as any)?.message ??
        String(this.state.error ?? "Erro desconhecido");

      return (
        <div className="gm-card">
          <h2 style={{ fontSize: 18, marginBottom: 10, color: 'white' }}>
            ❌ Falha ao abrir: {this.props.title}
          </h2>
          <p style={{ opacity: 0.85, marginBottom: 10, color: 'white' }}>
            Me envie o erro abaixo que eu corrijo esse módulo sem derrubar o app:
          </p>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: 12,
              lineHeight: 1.4,
              color: 'white'
            }}
          >
            {msg}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
