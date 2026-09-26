import React, { useState } from "react";
import { 
  Eye, 
  EyeOff, 
  Save, 
  RotateCcw, 
  Palette, 
  Plus, 
  ExternalLink, 
  LogOut, 
  Check, 
  Loader2, 
  Sparkles,
  ChevronDown,
  Layers,
  Image as ImageIcon,
  ShoppingBag,
  Briefcase,
  Link2
} from "lucide-react";

interface LiveAdminBarProps {
  companyName: string;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  previewAsVisitor: boolean;
  onTogglePreviewAsVisitor: () => void;
  onSave: () => void;
  onRevert: () => void;
  onOpenThemeModal: () => void;
  onOpenAddModal: (type: "product" | "portfolio" | "link") => void;
  onExitEditMode: () => void;
  onOpenFullDashboard: () => void;
  onOpenOrdersModal?: () => void;
  pendingReceiptCount?: number;
}

export default function LiveAdminBar({
  companyName,
  isSaving,
  hasUnsavedChanges,
  previewAsVisitor,
  onTogglePreviewAsVisitor,
  onSave,
  onRevert,
  onOpenThemeModal,
  onOpenAddModal,
  onExitEditMode,
  onOpenFullDashboard,
  onOpenOrdersModal,
  pendingReceiptCount = 0,
}: LiveAdminBarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-[160] bg-[#0d0e14]/95 backdrop-blur-xl border-b border-white/10 text-white shadow-2xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
        
        {/* Left: Indicator & Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-[11px] sm:text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-3.5" />
            <span>Editor Ativo</span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-slate-300 font-medium text-xs">
            <span className="text-slate-500">Editando:</span>
            <span className="font-bold text-white max-w-[150px] truncate">{companyName || "Meu Site"}</span>
          </div>

          {hasUnsavedChanges && (
            <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Alterações pendentes
            </span>
          )}
        </div>

        {/* Center: Quick Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Visitor Preview Toggle */}
          <button
            type="button"
            onClick={onTogglePreviewAsVisitor}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border transition-all text-xs font-semibold cursor-pointer select-none ${
              previewAsVisitor 
                ? "bg-amber-500 text-black border-amber-400 font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white"
            }`}
            title={previewAsVisitor ? "Voltar ao modo de edição com botões visíveis" : "Ocultar botões de edição para ver como visitante"}
          >
            {previewAsVisitor ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Modo Visitante</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ver como Visitante</span>
              </>
            )}
          </button>

          {/* Theme & Colors Modal */}
          <button
            type="button"
            onClick={onOpenThemeModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white transition-colors text-xs font-semibold cursor-pointer select-none"
            title="Personalizar Cores, Tema e Estilos"
          >
            <Palette className="w-3.5 h-3.5 text-[#FE540B]" />
            <span className="hidden sm:inline">Cores & Tema</span>
          </button>

          {/* Orders & Sales Manager Modal */}
          {onOpenOrdersModal && (
            <button
              type="button"
              onClick={onOpenOrdersModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:bg-orange-500/25 hover:text-white transition-all text-xs font-bold cursor-pointer select-none"
              title="Gerenciar Pedidos & Comprovantes de Pagamento"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
              <span>Pedidos</span>
              {pendingReceiptCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black font-black text-[10px] animate-pulse">
                  {pendingReceiptCount}
                </span>
              ) : null}
            </button>
          )}

          {/* Add Section / Item Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 hover:text-white transition-colors text-xs font-semibold cursor-pointer select-none"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Adicionar</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                <div className="absolute top-full mt-1.5 left-0 w-48 rounded-xl bg-[#14151e] border border-white/10 shadow-2xl p-1.5 z-20 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMenu(false);
                      onOpenAddModal("product");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:bg-[#FE540B]/15 hover:text-white transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#FE540B]" />
                    <span>Novo Produto / Serviço</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMenu(false);
                      onOpenAddModal("portfolio");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:bg-emerald-500/15 hover:text-white transition-colors cursor-pointer"
                  >
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                    <span>Novo Projeto (Portfólio)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMenu(false);
                      onOpenAddModal("link");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:bg-blue-500/15 hover:text-white transition-colors cursor-pointer"
                  >
                    <Link2 className="w-4 h-4 text-blue-400" />
                    <span>Link Personalizado</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Revert button (only if has unsaved changes) */}
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={onRevert}
              disabled={isSaving}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-colors text-xs font-medium cursor-pointer"
              title="Descartar alterações não salvas"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Descartar</span>
            </button>
          )}

          {/* Save Button */}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer select-none ${
              hasUnsavedChanges
                ? "bg-gradient-to-r from-[#FE540B] to-[#ff7a3d] hover:brightness-110 text-white shadow-[0_0_20px_rgba(254,84,11,0.4)] animate-pulse"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Salvar</span>
              </>
            )}
          </button>

          {/* Dropdown Menu for Exit / Full Dashboard */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              title="Mais opções do administrador"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute top-full mt-1.5 right-0 w-52 rounded-xl bg-[#14151e] border border-white/10 shadow-2xl p-1.5 z-20 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenFullDashboard();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-sky-400" />
                    <span>Abrir Editor Completo</span>
                  </button>
                  <div className="h-px bg-white/10 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onExitEditMode();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair do Modo Editor</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
