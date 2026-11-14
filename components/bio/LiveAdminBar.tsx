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
    <header className="fixed top-0 left-0 right-0 z-[160] bg-[#0B0B0C]/95 backdrop-blur-sm border-b border-[#26262A] text-white transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
        
        {/* Left: Indicator & Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold text-[11px] sm:text-xs whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Editor Ativo</span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-zinc-300 font-medium text-xs">
            <span className="text-zinc-500">Editando:</span>
            <span className="font-bold text-white max-w-[150px] truncate">{companyName || "Meu Site"}</span>
          </div>

          {hasUnsavedChanges && (
            <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
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
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[6px] border transition-colors text-xs font-semibold cursor-pointer select-none whitespace-nowrap ${
              previewAsVisitor 
                ? "bg-amber-500 text-black border-amber-400 font-bold"
                : "bg-[#131315] border-[#26262A] text-zinc-200 hover:bg-[#1B1B1E] hover:text-white"
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
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[6px] bg-[#131315] border border-[#26262A] text-zinc-200 hover:bg-[#1B1B1E] hover:text-white transition-colors text-xs font-semibold cursor-pointer select-none whitespace-nowrap"
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
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[6px] bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:bg-orange-500/25 hover:text-white transition-colors text-xs font-bold cursor-pointer select-none whitespace-nowrap"
              title="Gerenciar Pedidos & Comprovantes de Pagamento"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
              <span>Pedidos</span>
              {pendingReceiptCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-[4px] bg-amber-400 text-black font-extrabold text-[11px] tabular-nums">
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
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-[6px] bg-[#131315] border border-[#26262A] text-zinc-200 hover:bg-[#1B1B1E] hover:text-white transition-colors text-xs font-semibold cursor-pointer select-none whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Adicionar</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                <div className="absolute top-full mt-1.5 left-0 w-48 rounded-md bg-[#131315] border border-[#26262A] shadow-2xl p-1.5 z-20 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMenu(false);
                      onOpenAddModal("product");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-left text-xs font-medium text-zinc-200 hover:bg-[#1B1B1E] hover:text-white transition-colors cursor-pointer"
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
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-left text-xs font-medium text-zinc-200 hover:bg-[#1B1B1E] hover:text-white transition-colors cursor-pointer"
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
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-left text-xs font-medium text-zinc-200 hover:bg-[#1B1B1E] hover:text-white transition-colors cursor-pointer"
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] bg-[#131315] border border-[#26262A] text-zinc-300 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 transition-colors text-xs font-medium cursor-pointer whitespace-nowrap"
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] text-xs font-bold transition-colors cursor-pointer select-none whitespace-nowrap ${
              hasUnsavedChanges
                ? "bg-[#FE540B] hover:bg-[#ff6d29] text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
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
              className="w-8 h-8 rounded-[4px] bg-[#131315] border border-[#26262A] text-zinc-300 hover:bg-[#1B1B1E] hover:text-white transition-colors cursor-pointer flex items-center justify-center"
              title="Mais opções do administrador"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute top-full mt-1.5 right-0 w-52 rounded-md bg-[#131315] border border-[#26262A] shadow-2xl p-1.5 z-20 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenFullDashboard();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-left text-xs font-medium text-zinc-200 hover:bg-[#1B1B1E] hover:text-white transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-sky-400" />
                    <span>Abrir Editor Completo</span>
                  </button>
                  <div className="h-px bg-[#26262A] my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onExitEditMode();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-[4px] text-left text-xs font-medium text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-colors cursor-pointer"
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
