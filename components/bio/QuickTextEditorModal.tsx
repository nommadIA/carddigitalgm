import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Check, 
  Type, 
  FileText, 
  MousePointer, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Sparkles, 
  Palette, 
  Eye, 
  ExternalLink,
  ChevronDown
} from "lucide-react";

export type ElementType = "title" | "description" | "button" | "section_title" | "footer";

export interface TextEditorFormatting {
  bold?: boolean;
  italic?: boolean;
  size?: string;
  size_mobile?: string;
  font?: string;
  align?: "left" | "center" | "right";
  color?: string;
  buttonAction?: string;
  buttonUrl?: string;
  buttonStyle?: string;
}

export interface QuickTextEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  elementType: ElementType;
  initialText: string;
  initialFormatting?: TextEditorFormatting;
  onSave: (text: string, formatting: TextEditorFormatting) => void;
  brandColor?: string;
}

const FONT_OPTIONS = [
  { value: "syne", label: "Syne (Moderna & Criativa)", family: "'Syne', sans-serif" },
  { value: "space", label: "Space Grotesk (Tech & Brutalista)", family: "'Space Grotesk', sans-serif" },
  { value: "jakarta", label: "Plus Jakarta Sans (Elegante)", family: "'Plus Jakarta Sans', sans-serif" },
  { value: "inter", label: "Inter (Neutra & Clean)", family: "'Inter', sans-serif" },
  { value: "serif", label: "Playfair Display (Editorial Serif)", family: "'Playfair Display', serif" },
  { value: "montserrat", label: "Montserrat (Geométrica)", family: "'Montserrat', sans-serif" },
  { value: "mono", label: "JetBrains Mono (Monospace)", family: "'JetBrains Mono', monospace" },
];

const FONT_SIZES = [
  "10 pt", "12 pt", "14 pt", "16 pt", "18 pt", "20 pt", 
  "22 pt", "24 pt", "28 pt", "32 pt", "36 pt", "48 pt"
];

const COLOR_PRESETS = [
  { label: "Laranja Marca", value: "#FE540B" },
  { label: "Branco Puro", value: "#FFFFFF" },
  { label: "Cinza Claro", value: "#E4E4E7" },
  { label: "Amarelo Ouro", value: "#F59E0B" },
  { label: "Verde Esmeralda", value: "#10B981" },
  { label: "Azul Elétrico", value: "#0EA5E9" },
  { label: "Roxo Neon", value: "#8B5CF6" },
];

export function QuickTextEditorModal({
  isOpen,
  onClose,
  title,
  subtitle,
  elementType,
  initialText,
  initialFormatting = {},
  onSave,
  brandColor = "#FE540B"
}: QuickTextEditorModalProps) {
  const [text, setText] = useState(initialText || "");
  const [bold, setBold] = useState(!!initialFormatting.bold);
  const [italic, setItalic] = useState(!!initialFormatting.italic);
  const [size, setSize] = useState(initialFormatting.size || (elementType === "title" ? "32 pt" : "16 pt"));
  const [font, setFont] = useState(initialFormatting.font || "syne");
  const [align, setAlign] = useState<"left" | "center" | "right">(initialFormatting.align || "left");
  const [textColor, setTextColor] = useState(initialFormatting.color || "#FFFFFF");
  const [buttonAction, setButtonAction] = useState(initialFormatting.buttonAction || "portfolio");
  const [buttonUrl, setButtonUrl] = useState(initialFormatting.buttonUrl || "");
  const [buttonStyle, setButtonStyle] = useState(initialFormatting.buttonStyle || "glow");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state whenever modal opens or props update
  useEffect(() => {
    if (isOpen) {
      setText(initialText || "");
      setBold(!!initialFormatting.bold);
      setItalic(!!initialFormatting.italic);
      setSize(initialFormatting.size || (elementType === "title" ? "32 pt" : "16 pt"));
      setFont(initialFormatting.font || "syne");
      setAlign(initialFormatting.align || "left");
      setTextColor(initialFormatting.color || "#FFFFFF");
      setButtonAction(initialFormatting.buttonAction || "portfolio");
      setButtonUrl(initialFormatting.buttonUrl || "");
      setButtonStyle(initialFormatting.buttonStyle || "glow");
      setShowColorPicker(false);
    }
  }, [isOpen, initialText, initialFormatting, elementType]);

  if (!isOpen) return null;

  // Insert formatting tag onto current textarea selection
  const insertFormatting = (tagStart: string, tagEnd: string, defaultText: string = "texto") => {
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => prev + `${tagStart}${defaultText}${tagEnd}`);
      return;
    }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const selected = text.substring(start, end) || defaultText;
    const replacement = `${tagStart}${selected}${tagEnd}`;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    setText(newText);
    
    // Reposition cursor
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tagStart.length, start + tagStart.length + selected.length);
    }, 50);
  };

  const handleApply = () => {
    onSave(text, {
      bold,
      italic,
      size,
      font,
      align,
      color: textColor,
      buttonAction,
      buttonUrl,
      buttonStyle
    });
    onClose();
  };

  const getFontFamily = (f: string) => {
    const found = FONT_OPTIONS.find((o) => o.value === f);
    return found ? found.family : "'Syne', sans-serif";
  };

  return (
    <div 
      className="fixed inset-0 z-[220] flex items-center justify-center p-3 sm:p-5 bg-black/75 animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[92vh] rounded-[2rem] fora border border-white/10 text-white shadow-2xl flex flex-col overflow-hidden my-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#141522]">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: `${brandColor}25`, border: `1px solid ${brandColor}40` }}
            >
              {elementType === "title" && <Type className="w-5 h-5" style={{ color: brandColor }} />}
              {elementType === "description" && <FileText className="w-5 h-5" style={{ color: brandColor }} />}
              {elementType === "button" && <MousePointer className="w-5 h-5" style={{ color: brandColor }} />}
              {elementType === "section_title" && <Sparkles className="w-5 h-5" style={{ color: brandColor }} />}
              {elementType === "footer" && <AlignLeft className="w-5 h-5" style={{ color: brandColor }} />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                {title}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {subtitle || "Edite o texto e a formatação com visualização em tempo real"}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scroll">
          
          {/* Rich Formatting Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-white/[0.04] border border-white/10">
            {/* Inline Formatting Tools */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => insertFormatting("<b>", "</b>", "destaque em negrito")}
                className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Negritar trecho selecionado (<b>...</b>)"
              >
                <Bold className="w-4 h-4 text-[#FE540B]" />
                <span className="hidden sm:inline">Negrito</span>
              </button>

              <button
                type="button"
                onClick={() => insertFormatting("<i>", "</i>", "destaque em itálico")}
                className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Itálico no trecho selecionado (<i>...</i>)"
              >
                <Italic className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Itálico</span>
              </button>

              <button
                type="button"
                onClick={() => insertFormatting("<u>", "</u>", "destaque sublinhado")}
                className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Sublinhar trecho selecionado (<u>...</u>)"
              >
                <Underline className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Sublinhado</span>
              </button>

              {/* Color highlight button */}
              <button
                type="button"
                onClick={() => insertFormatting(`<span style="color: ${brandColor}">`, "</span>", "texto colorido")}
                className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Colorir trecho com a cor da marca"
              >
                <Palette className="w-4 h-4" style={{ color: brandColor }} />
                <span className="hidden sm:inline">Cor Marca</span>
              </button>
            </div>

            {/* Align & Block Styles */}
            <div className="flex items-center gap-1 border-l border-white/10 pl-2">
              <button
                type="button"
                onClick={() => setAlign("left")}
                className={`p-2 rounded-xl transition-all cursor-pointer ${align === "left" ? "bg-[#FE540B] text-white shadow-md" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                title="Alinhar à Esquerda"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setAlign("center")}
                className={`p-2 rounded-xl transition-all cursor-pointer ${align === "center" ? "bg-[#FE540B] text-white shadow-md" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                title="Centralizar"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setAlign("right")}
                className={`p-2 rounded-xl transition-all cursor-pointer ${align === "right" ? "bg-[#FE540B] text-white shadow-md" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                title="Alinhar à Direita"
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Typography Controls (Font Family, Size, Overall Color) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Font Family */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-[#FE540B]" />
                Tipografia
              </label>
              <select
                value={font}
                onChange={(e) => setFont(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-[#FE540B] transition-colors cursor-pointer"
              >
                {FONT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#12131b] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FE540B]" />
                Tamanho da Fonte
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none focus:border-[#FE540B] transition-colors cursor-pointer"
              >
                {FONT_SIZES.map((s) => (
                  <option key={s} value={s} className="bg-[#12131b] text-white">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Overall Text Color */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#FE540B]" />
                Cor Padrão do Texto
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-8 h-8 rounded-xl border border-white/20 shadow-inner flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shrink-0"
                  style={{ backgroundColor: textColor }}
                  title="Alterar cor padrão"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  placeholder="#FFFFFF"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-[#FE540B]"
                />
              </div>
            </div>
          </div>

          {/* Color Presets Drawer */}
          {showColorPicker && (
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center gap-2 animate-fade-in">
              <span className="text-xs text-zinc-400 mr-2">Cores Rápidas:</span>
              {COLOR_PRESETS.map((cp) => (
                <button
                  key={cp.value}
                  type="button"
                  onClick={() => {
                    setTextColor(cp.value);
                    setShowColorPicker(false);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border border-white/10 flex items-center gap-1.5 hover:scale-105 transition-all cursor-pointer"
                  style={{ backgroundColor: `${cp.value}20`, color: cp.value, borderColor: `${cp.value}50` }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cp.value }} />
                  {cp.label}
                </button>
              ))}
            </div>
          )}

          {/* Main Text Input / Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                Conteúdo do Texto
              </label>
              <span className="text-[11px] text-zinc-400 font-mono">
                Suporta tags <b>&lt;b&gt;negrito&lt;/b&gt;</b> e quebras de linha
              </span>
            </div>

            {elementType === "title" || elementType === "section_title" ? (
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Digite o título..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-base text-white font-bold outline-none focus:border-[#FE540B] shadow-inner transition-colors"
              />
            ) : (
              <textarea
                ref={textareaRef}
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Digite seu texto formatado aqui..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-zinc-200 outline-none focus:border-[#FE540B] shadow-inner transition-colors leading-relaxed font-mono resize-y"
              />
            )}
          </div>

          {/* Button-specific settings if editing a Button element */}
          {elementType === "button" && (
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-[#FE540B]" />
                Destino do Clique / Ação do Botão
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setButtonAction("portfolio")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    buttonAction === "portfolio" 
                      ? "border-[#FE540B] bg-[#FE540B]/15 text-white" 
                      : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-bold text-white">Rolar para o Portfólio</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Leva o cliente direto para os projetos</div>
                </button>

                <button
                  type="button"
                  onClick={() => setButtonAction("catalog")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    buttonAction === "catalog" 
                      ? "border-[#FE540B] bg-[#FE540B]/15 text-white" 
                      : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-bold text-white">Rolar para Catálogo</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Exibe os produtos e valores</div>
                </button>

                <button
                  type="button"
                  onClick={() => setButtonAction("contact")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    buttonAction === "contact" 
                      ? "border-[#FE540B] bg-[#FE540B]/15 text-white" 
                      : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-bold text-white">Abrir Página de Contato</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Mostra telefones, whatsapp e mapa</div>
                </button>

                <button
                  type="button"
                  onClick={() => setButtonAction("custom_url")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    buttonAction === "custom_url" 
                      ? "border-[#FE540B] bg-[#FE540B]/15 text-white" 
                      : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  <div className="text-xs font-bold text-white">Link Personalizado</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Link externo, WhatsApp direto, etc.</div>
                </button>
              </div>

              {buttonAction === "custom_url" && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs text-zinc-400">URL ou Link de Destino:</label>
                  <input
                    type="text"
                    value={buttonUrl}
                    onChange={(e) => setButtonUrl(e.target.value)}
                    placeholder="https://wa.me/... ou https://meusite.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#FE540B]"
                  />
                </div>
              )}
            </div>
          )}

          {/* Live Preview Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#FE540B]" />
                Pré-visualização em Tempo Real
              </span>
              <span className="text-[10px] text-zinc-500">Exibição exata de como aparecerá no site</span>
            </div>

            <div 
              className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-white/10 min-h-[100px] flex items-center justify-center overflow-hidden shadow-inner relative"
              style={{
                backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(254,84,11,0.05) 0%, transparent 80%)'
              }}
            >
              {elementType === "button" ? (
                <button
                  type="button"
                  className="px-6 py-3.5 rounded-xl font-bold text-white border border-[#FE540B] shadow-[0_0_20px_rgba(254,84,11,0.3)] transition-all"
                  style={{
                    backgroundColor: buttonStyle === "glow" ? "rgba(254,84,11,0.2)" : brandColor,
                    fontFamily: getFontFamily(font),
                  }}
                >
                  {text || "Conheça nossos Serviços"}
                </button>
              ) : (
                <div 
                  className={`w-full whitespace-pre-wrap leading-relaxed ${
                    align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center"
                  } ${bold ? "font-bold" : "font-normal"} ${italic ? "italic" : "not-italic"}`}
                  style={{
                    fontFamily: getFontFamily(font),
                    fontSize: size,
                    color: textColor,
                  }}
                  dangerouslySetInnerHTML={{
                    __html: text || "<span class='opacity-40 italic'>Texto vazio...</span>"
                  }}
                />
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-end gap-3 shrink-0 bg-[#141522]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleApply}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-white flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: brandColor,
              boxShadow: `0 4px 15px ${brandColor}40`
            }}
          >
            <Check className="w-4 h-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  );
}
