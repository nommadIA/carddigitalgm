import React, { Component, ReactNode } from "react";
import { Database, Copy, Check, RotateCcw, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: any;
  copiedSql?: boolean;
}

const SQL_FIX_SCRIPT = `-- EXECUTE NO SUPABASE SQL EDITOR PARA CORRIGIR PERMISSÕES (42501)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tenants TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.tenant_memberships TO authenticated, anon, service_role;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'budgets') THEN
    GRANT ALL ON TABLE public.budgets TO authenticated, anon, service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shopping_items') THEN
    GRANT ALL ON TABLE public.shopping_items TO authenticated, anon, service_role;
  END IF;
END $$;

DROP POLICY IF EXISTS "allow_select_tenant_memberships" ON public.tenant_memberships;
CREATE POLICY "allow_select_tenant_memberships" ON public.tenant_memberships FOR SELECT TO authenticated, anon USING (true);

CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_tenant_id IS NULL THEN RETURN FALSE; END IF;
  RETURN EXISTS (SELECT 1 FROM public.tenant_memberships m WHERE m.tenant_id = p_tenant_id AND (m.user_id = auth.uid() OR auth.uid() IS NULL));
END; $$;

GRANT EXECUTE ON FUNCTION public.is_tenant_member(uuid) TO authenticated, anon, service_role;`;

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    copiedSql: false,
  };

  declare props: Readonly<Props>;

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    const msg = error?.message || String(error || "");
    if (!msg.includes("tenant_memberships") && !msg.includes("42501")) {
      console.error("APP CRASHED:", error, info);
    }
  }

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
      const msg =
        this.state.error?.message ||
        String(this.state.error) ||
        "Erro desconhecido";

      const isPermissionError =
        this.state.error?.code === "42501" ||
        msg.includes("tenant_memberships") ||
        msg.includes("42501") ||
        msg.includes("permission denied");

      if (isPermissionError) {
        return (
          <div className="min-h-screen p-6 bg-[#09090b] text-white font-sans flex flex-col items-center justify-center">
            <div className="w-full max-w-xl p-6 rounded-2xl bg-[#121215] border border-amber-500/30 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center gap-3 text-amber-400">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Database size={20} className="text-amber-400" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white">
                    Permissão de Banco de Dados Supabase (42501)
                  </h1>
                  <p className="text-xs text-amber-400/90 font-mono">
                    Tabela: public.tenant_memberships
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                O banco de dados precisa conceder permissão na tabela <code>tenant_memberships</code> no Supabase SQL Editor.
                Você pode copiar o script de correção com 1 clique:
              </p>

              <div className="flex flex-col gap-2 p-3 rounded-xl bg-black/60 border border-white/10">
                <span className="text-[11px] font-mono text-zinc-400">Comando SQL de Desbloqueio:</span>
                <pre className="text-[11px] font-mono text-amber-300 max-h-24 overflow-y-auto whitespace-pre-wrap select-all">
                  {`GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.tenant_memberships TO authenticated, anon;
-- Clique no botão abaixo para copiar o script completo`}
                </pre>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  onClick={this.handleCopySql}
                  className="bg-amber-500 hover:bg-amber-600 text-black px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
                  type="button"
                >
                  {this.state.copiedSql ? <Check size={16} /> : <Copy size={16} />}
                  {this.state.copiedSql ? "Copiado com Sucesso!" : "Copiar Script SQL"}
                </button>
                <button
                  onClick={() => this.setState({ hasError: false, error: undefined })}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-white/10 cursor-pointer"
                  type="button"
                >
                  <RotateCcw size={16} />
                  Continuar em Modo Seguro
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white px-3 py-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  type="button"
                >
                  <RefreshCw size={14} />
                  Recarregar
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div
          style={{
            minHeight: "100vh",
            padding: 24,
            color: "#fff",
            fontFamily: "Inter, system-ui, sans-serif",
            background: "#09090b",
          }}
        >
          <h1 style={{ fontSize: 18, marginBottom: 12 }}>
            ❌ O app detectou uma oscilação ao carregar
          </h1>
          <p style={{ opacity: 0.9, marginBottom: 12 }}>
            Detalhes do erro:
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