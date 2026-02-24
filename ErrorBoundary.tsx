import React, { Component, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: any;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  declare props: Readonly<Props>;

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // Log no console também (se existir)
    console.error("APP CRASHED:", error, info);
  }

  render() {
    if (this.state.hasError) {
      const msg =
        this.state.error?.message ||
        String(this.state.error) ||
        "Erro desconhecido";

      return (
        <div
          style={{
            minHeight: "100vh",
            padding: 24,
            color: "#fff",
            fontFamily: "Inter, system-ui, sans-serif",
            background: "linear-gradient(135deg, #0b1020, #020617)",
          }}
        >
          <h1 style={{ fontSize: 18, marginBottom: 12 }}>
            ❌ O app quebrou ao carregar
          </h1>
          <p style={{ opacity: 0.9, marginBottom: 12 }}>
            Copie o erro abaixo e cole aqui pra eu corrigir em 1 passo:
          </p>

          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: 14,
              lineHeight: 1.4,
            }}
          >
            {msg}
          </pre>

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 14,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}