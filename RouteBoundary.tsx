
import React, { Component, ReactNode } from "react";
import { RotateCcw, RefreshCw } from "lucide-react";

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

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const msg =
        (this.state.error as any)?.message ??
        String(this.state.error ?? "Erro desconhecido");

      const isFetchError = msg.includes("Failed to fetch") || msg.includes("network") || msg.includes("dynamically imported module");

      return (
        <div className="gm-card p-6 flex flex-col gap-4 max-w-xl mx-auto my-8 border border-white/10 rounded-2xl shadow-xl">
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            ⚠️ Oscilação de Conexão: {this.props.title}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {isFetchError
              ? "Ocorreu uma pausa temporária na conexão ao carregar os dados. Clique abaixo para reconectar e recarregar a tela."
              : "Não foi possível carregar este módulo. Tente reconectar:"}
          </p>
          <pre className="whitespace-pre-wrap bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-amber-400 font-mono">
            {msg}
          </pre>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={this.handleRetry}
              className="gm-btn bg-[var(--gm-primary)] hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md"
              type="button"
            >
              <RotateCcw size={16} />
              Tentar Novamente
            </button>
            <button
              onClick={() => window.location.reload()}
              className="gm-btn bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
              type="button"
            >
              <RefreshCw size={16} />
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
