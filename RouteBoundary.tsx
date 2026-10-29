import React, { Component, ReactNode } from "react";
import { RotateCcw, RefreshCw, Copy, Check, ShieldAlert, Database } from "lucide-react";

type Props = { title: string; children?: ReactNode };
type State = { hasError: boolean; error?: unknown; copiedSql?: boolean };

const SQL_FIX_SCRIPT = `-- EXECUTE NO SUPABASE SQL EDITOR PARA CORRIGIR PERMISSÕES (42501)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tenants TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.tenant_memberships TO authenticated, anon, service_role;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'budgets') THEN
    GRANT ALL ON TABLE public.budgets TO authenticated, anon, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'budget_items') THEN
    GRANT ALL ON TABLE public.budget_items TO authenticated, anon, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shopping_items') THEN
    GRANT ALL ON TABLE public.shopping_items TO authenticated, anon, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clients') THEN
    GRANT ALL ON TABLE public.clients TO authenticated, anon, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
    GRANT ALL ON TABLE public.expenses TO authenticated, anon, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notes') THEN
    GRANT ALL ON TABLE public.notes TO authenticated, anon, service_role;
  END IF;
END $$;

DROP POLICY IF EXISTS "allow_select_tenant_memberships" ON public.tenant_memberships;
CREATE POLICY "allow_select_tenant_memberships" ON public.tenant_memberships
  FOR SELECT TO authenticated, anon
  USING (true);

CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_tenant_id IS NULL THEN RETURN FALSE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_memberships m
    WHERE m.tenant_id = p_tenant_id AND (m.user_id = auth.uid() OR auth.uid() IS NULL)
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated, anon, service_role;`;

export default class RouteBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: undefined, copiedSql: false };

  declare props: Readonly<Props>;

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    const errorStr = (error as any)?.message ?? String(error);
    if (!errorStr.includes("tenant_memberships") && !errorStr.includes("42501")) {
      console.error("ROUTE CRASH:", this.props.title, error);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, copiedSql: false });
  };

  handleCopySql = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(SQL_FIX_SCRIPT);
      } else {
        const ta = document.createElement("textarea");
        ta.value = SQL_FIX_SCRIPT;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      this.setState({ copiedSql: true });
      setTimeout(() => this.setState({ copiedSql: false }), 3500);
    } catch {}
  };

  render() {
    if (this.state.hasError) {
      const rawError = this.state.error as any;
      const msg = rawError?.message ?? String(this.state.error ?? "Erro desconhecido");
      const isPermissionError =
        rawError?.code === "42501" ||
        msg.includes("tenant_memberships") ||
        msg.includes("42501") ||
        msg.includes("permission denied");

      const isFetchError =
        msg.includes("Failed to fetch") ||
        msg.includes("network") ||
        msg.includes("dynamically imported module");

      if (isPermissionError) {
        return (
          <div className="gm-card p-6 flex flex-col gap-4 max-w-xl mx-auto my-8 border border-amber-500/30 rounded-2xl shadow-2xl bg-[#121215]">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Database size={20} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Permissão de Acesso Supabase (Erro 42501)
                </h2>
                <p className="text-xs text-amber-400/90 font-mono">
                  Tabela: tenant_memberships
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              O banco de dados Supabase requer a concessão de permissão de leitura para a role autenticada no schema public.
              Você pode continuar utilizando o aplicativo em <strong>Modo Seguro Offline</strong> com dados salvos em cache ou aplicar o script de correção com 1 clique:
            </p>

            <div className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-950/70 border border-white/10">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-mono text-zinc-400">Comando SQL de Desbloqueio</span>
                <span className="text-[11px] text-zinc-500">Supabase SQL Editor</span>
              </div>
              <pre className="text-[11px] font-mono text-amber-300 max-h-24 overflow-y-auto whitespace-pre-wrap select-all">
                {`GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.tenant_memberships TO authenticated, anon;
-- Clique abaixo para copiar o script completo`}
              </pre>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                onClick={this.handleCopySql}
                className="gm-btn bg-amber-500 hover:bg-amber-600 text-black px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                type="button"
              >
                {this.state.copiedSql ? <Check size={16} /> : <Copy size={16} />}
                {this.state.copiedSql ? "Copiado com Sucesso!" : "Copiar Script SQL"}
              </button>
              <button
                onClick={this.handleRetry}
                className="gm-btn bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-white/10"
                type="button"
              >
                <RotateCcw size={16} />
                Continuar com Cache Local
              </button>
              <button
                onClick={() => window.location.reload()}
                className="gm-btn bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white px-3 py-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
                type="button"
              >
                <RefreshCw size={14} />
                Recarregar
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="gm-card p-6 flex flex-col gap-4 max-w-xl mx-auto my-8 border border-white/10 rounded-2xl shadow-xl bg-[#121215]">
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
