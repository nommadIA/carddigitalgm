
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChefHat, Sparkles, Loader2, Share2, Image as ImageIcon, RefreshCw } from "lucide-react";
import { generateRecipes, generateDishImageUrl, type RecipeCard } from "../services/aiService";
import { Page } from "../components/ui/Page";
import { Grid } from "../components/ui/Grid";
import { Card } from "../components/ui/Card";

type ImgState = {
  url?: string;
  loading?: boolean;
  error?: boolean;
};

const AIHub = () => {
  const [userText, setUserText] = useState("");
  const [recipes, setRecipes] = useState<RecipeCard[]>([]);
  const [loading, setLoading] = useState(false);

  // imagens por receita (cache em memória)
  const [images, setImages] = useState<Record<number, ImgState>>({});
  const runningRef = useRef(false);

  const handleGenerate = async () => {
    if (!userText.trim()) return;
    setLoading(true);
    setRecipes([]);
    setImages({});
    try {
      const result = await generateRecipes(userText.trim());
      setRecipes(result);
    } catch (e) {
      alert("Erro ao gerar receita.");
    } finally {
      setLoading(false);
    }
  };

  // gera imagens automaticamente (sequencial e leve — evita “estourar” requisições)
  useEffect(() => {
    if (!recipes.length) return;
    if (runningRef.current) return;
    runningRef.current = true;

    (async () => {
      for (let i = 0; i < recipes.length; i++) {
        // se já tiver (re-render), pula
        const existing = images[i]?.url;
        if (existing) continue;

        setImages((prev) => ({ ...prev, [i]: { ...(prev[i] || {}), loading: true, error: false } }));
        try {
          const url = await generateDishImageUrl({ title: recipes[i].title, subtitle: recipes[i].subtitle });
          setImages((prev) => ({ ...prev, [i]: { url, loading: false, error: false } }));
        } catch {
          setImages((prev) => ({ ...prev, [i]: { url: undefined, loading: false, error: true } }));
        }
      }
      runningRef.current = false;
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes]);

  const buildShareText = (r: RecipeCard) => {
    const lines: string[] = [];
    lines.push(`🍽️ *${r.title}*`);
    if (r.subtitle) lines.push(`_${r.subtitle}_`);
    lines.push("");
    lines.push("*Ingredientes:*");
    r.ingredients.forEach((ing) => lines.push(`• ${ing}`));
    lines.push("");
    lines.push("*Modo de preparo:*");
    r.steps.forEach((s, idx) => lines.push(`${idx + 1}. ${s}`));
    if (r.tags?.length) {
      lines.push("");
      lines.push(`🏷️ ${r.tags.map((t) => `#${t}`).join(" ")}`);
    }
    return lines.join("\n");
  };

  const shareWhatsApp = async (r: RecipeCard) => {
    const text = buildShareText(r);

    // remove “códigos”/querystrings em caso de link — aqui nem usamos link, só texto limpo
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const regenImage = async (idx: number) => {
    const r = recipes[idx];
    if (!r) return;

    setImages((prev) => ({ ...prev, [idx]: { ...(prev[idx] || {}), loading: true, error: false } }));
    try {
      const url = await generateDishImageUrl({ title: r.title, subtitle: r.subtitle });
      setImages((prev) => ({ ...prev, [idx]: { url, loading: false, error: false } }));
    } catch {
      setImages((prev) => ({ ...prev, [idx]: { url: undefined, loading: false, error: true } }));
    }
  };

  return (
    <Page title="Chef IA" subtitle="Crie receitas incríveis com o que você tem">
      <div className="flex flex-col gap-8">
        {/* Input Area */}
        <Card className="p-0 overflow-hidden border-2 border-[var(--gm-primary)]/20">
          <div className="bg-gradient-to-r from-[var(--gm-primary)]/10 to-purple-500/10 p-6 border-b border-white/10">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
              <Sparkles className="text-[var(--gm-primary)]" /> O que você tem na geladeira?
            </h3>
            <p className="text-sm opacity-70">Descreva ingredientes e preferências. Se pedir “3 receitas”, ele gera 3.</p>
          </div>

          <div className="p-6">
            <textarea
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="Ex: Tenho frango, batata doce, creme de leite e cebola..."
              className="gm-input h-32 py-4 text-lg resize-none mb-6 bg-black/20"
            />

            <button
              onClick={handleGenerate}
              disabled={loading || !userText.trim()}
              className="gm-btn gm-border-loop w-full justify-center py-4 text-lg"
              type="button"
            >
              {loading ? <Loader2 className="animate-spin" /> : <ChefHat size={24} />}
              {loading ? "Criando Receita..." : "Gerar Receita Agora"}
            </button>
          </div>
        </Card>

        {/* Results */}
        {recipes.length > 0 && (
          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <div className="w-2 h-8 bg-[var(--gm-primary)] rounded-full"></div>
              Receitas Sugeridas
            </h3>

            <Grid cols={2}>
              {recipes.map((r, i) => {
                const img = images[i];

                return (
                  <Card key={i} className="h-full flex flex-col hover:border-[var(--gm-primary)] transition-colors">
                    {/* IMAGEM DO PRATO (agora aparece) */}
                    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20 mb-4">
                      <div className="relative w-full h-44">
                        {img?.url ? (
                          <img
                            src={img.url}
                            alt={r.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            {img?.loading ? (
                              <div className="flex items-center gap-2 opacity-75">
                                <Loader2 className="animate-spin" />
                                Gerando imagem...
                              </div>
                            ) : img?.error ? (
                              <div className="text-sm opacity-75 flex items-center gap-2">
                                <ImageIcon size={18} />
                                Falha na imagem
                              </div>
                            ) : (
                              <div className="text-sm opacity-75 flex items-center gap-2">
                                <ImageIcon size={18} />
                                Preparando...
                              </div>
                            )}
                          </div>
                        )}

                        <div className="absolute top-3 right-3 flex gap-2">
                          <button
                            type="button"
                            className="gm-btn gm-btn-icon"
                            title="Gerar novamente"
                            onClick={() => regenImage(i)}
                            disabled={!!img?.loading}
                          >
                            <RefreshCw size={16} />
                          </button>

                          <button
                            type="button"
                            className="gm-btn gm-btn-icon gm-border-loop"
                            title="Compartilhar"
                            onClick={() => shareWhatsApp(r)}
                          >
                            <Share2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="font-extrabold text-2xl text-[var(--gm-primary)] leading-tight mb-2">{r.title}</h3>
                      <p className="text-sm text-slate-400 italic font-medium">{r.subtitle}</p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 mb-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Ingredientes</div>
                      <ul className="space-y-2">
                        {r.ingredients.map((ing, k) => (
                          <li key={k} className="text-sm flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gm-primary)] mt-1.5 shrink-0"></span>
                            {ing}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex-1">
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Modo de Preparo</div>
                      <ol className="list-decimal pl-5 space-y-3 text-sm text-slate-300 marker:text-[var(--gm-primary)] marker:font-bold">
                        {r.steps.map((s, k) => (
                          <li key={k} className="leading-relaxed">{s}</li>
                        ))}
                      </ol>
                    </div>

                    {r.tags?.length ? (
                      <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-white/10">
                        {r.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-400"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </Grid>
          </div>
        )}
      </div>
    </Page>
  );
};

export default AIHub;
