// pages/Configuracoes.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Page } from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import { supabase } from "../lib/supabase";
import { useAuth } from "../store/AuthContext";
import { uploadTenantAsset, uploadTimbradoA4 } from "../services/storageService";
import { applySettingsToDOM, fetchSettingsSupabase, upsertSettingsSupabase, ThemePreset } from "../lib/settings";
import QRCode from "qrcode";
import { buildPixPayload } from "../lib/pix";
import { copyText } from "../lib/clipboard";
import {
  Download,
  Upload,
  Save,
  Image as ImageIcon,
  FileImage,
  Palette,
  Move,
  Copy,
  Check,
} from "lucide-react";

type Fit = "cover" | "contain";

const TIMBRADO_MODEL_URL =
  "https://hbvqfpqnuzvzcvhnickt.supabase.co/storage/v1/object/public/Modelo%20Timbrado/TIMBRADO%20GABARITO.png";

export default function Configuracoes() {
  const { tenantId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState("GM edificação");
  const [pixType, setPixType] = useState("CPF");
  const [pixKey, setPixKey] = useState("");

  const [brandPrimary, setBrandPrimary] = useState("#ff7b00");
  const [brandAccent, setBrandAccent] = useState("#ff9a1a");
  const [brandBg, setBrandBg] = useState("#0f1117");
  const [fontFamily, setFontFamily] = useState("Inter");

  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [timbradoUrl, setTimbradoUrl] = useState<string | null>(null);

  // Background Settings (salva no Supabase)
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgFit, setBgFit] = useState<Fit>("cover");
  const [bgOpacity, setBgOpacity] = useState<number>(0.18);
  const [bgScale, setBgScale] = useState<number>(1);
  const [bgBlur, setBgBlur] = useState<number>(10);

  // Position (0 a 100%)
  const [bgPosX, setBgPosX] = useState<number>(50);
  const [bgPosY, setBgPosY] = useState<number>(50);

  const [bgEnabled, setBgEnabled] = useState<boolean>(true);
  const [bgOpacityPrev, setBgOpacityPrev] = useState<number>(0.18);

  // ✅ IMPORTANTE: Preview Scale (somente UI / não salva no Supabase)
  const [bgPreviewScale, setBgPreviewScale] = useState(1);

  const [presets, setPresets] = useState<ThemePreset[]>([]);

  // ✅ PIX Preview (Configurações)
  const [pixPayloadPreview, setPixPayloadPreview] = useState("");
  const [pixQrPreview, setPixQrPreview] = useState("");
  const [pixCopied, setPixCopied] = useState(false);

  const canSave = useMemo(() => !!tenantId && !saving, [tenantId, saving]);

  async function load() {
    setLoading(true);
    try {
      // ✅ settings
      const s = await fetchSettingsSupabase(tenantId);
      if (s) {
        setCompanyName(s.company_name || "GM edificação");
        setPixType(s.pix_type || "CPF");
        setPixKey(s.pix_key || "");

        setBrandPrimary(s.brand_primary || "#ff7b00");
        setBrandAccent(s.brand_accent || "#ff9a1a");
        setBrandBg(s.brand_bg || "#0f1117");
        setFontFamily(s.font_family || "Inter");

        setCompanyLogoUrl(s.company_logo_url || null);
        setAvatarUrl(s.avatar_url || null);
        setTimbradoUrl(s.timbrado_url || null);

        setBgUrl(s.app_background_url || null);
        setBgFit((s.app_background_fit as Fit) || "cover");

        const op = Number(s.app_background_opacity ?? 0.18);
        setBgOpacity(op);
        setBgOpacityPrev(op > 0 ? op : 0.18);

        const sc = Number((s as any).app_background_scale ?? 1);
        setBgScale(Number.isFinite(sc) && sc > 0 ? sc : 1);

        const bl = Number((s as any).app_background_blur ?? 10);
        setBgBlur(Number.isFinite(bl) ? Math.min(24, Math.max(0, bl)) : 10);

        const px = parseFloat(s.app_background_pos_x || "50");
        setBgPosX(!isNaN(px) ? px : 50);

        const py = parseFloat(s.app_background_pos_y || "50");
        setBgPosY(!isNaN(py) ? py : 50);

        setBgEnabled(!!s.app_background_url && op > 0);

        setPresets(Array.isArray(s.theme_presets) ? (s.theme_presets as any) : []);
        applySettingsToDOM(s);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // ✅ Gera QR + Copia e Cola na tela de Configurações (universal, qualquer banco)
  useEffect(() => {
    const key = (pixKey || "").trim();
    if (!key) {
      setPixPayloadPreview("");
      setPixQrPreview("");
      return;
    }

    try {
      const payload = buildPixPayload({
        pixKey: key,
        merchantName: companyName || "GM PRO",
        merchantCity: "SAO LUIS",
        // Sem valor aqui = QR estático genérico (o banco deixa digitar valor)
        txid: "***",
        message: "Pagamento via Pix",
      });

      setPixPayloadPreview(payload);

      QRCode.toDataURL(payload, { margin: 2, scale: 8 })
        .then(setPixQrPreview)
        .catch((e) => {
          console.error("Erro gerando QR Pix (Config)", e);
          setPixQrPreview("");
        });
    } catch (e) {
      console.error("Erro gerando payload Pix (Config)", e);
      setPixPayloadPreview("");
      setPixQrPreview("");
    }
  }, [pixKey, companyName]);

  async function handleSave() {
    if (!tenantId) return;
    setSaving(true);
    try {
      const next = await upsertSettingsSupabase(tenantId, {
        company_name: companyName,
        pix_type: pixType,
        pix_key: pixKey,

        brand_primary: brandPrimary,
        brand_accent: brandAccent,
        brand_bg: brandBg,
        font_family: fontFamily,

        company_logo_url: companyLogoUrl,
        avatar_url: avatarUrl,
        timbrado_url: timbradoUrl,

        app_background_url: bgUrl,
        app_background_fit: bgFit,

        // toggle background: desligado = opacidade 0
        app_background_opacity: bgEnabled ? Math.min(1, Math.max(0, bgOpacity || bgOpacityPrev)) : 0,
        app_background_scale: Math.min(5, Math.max(0.1, bgScale)),
        app_background_blur: Math.min(24, Math.max(0, bgBlur)),

        app_background_pos_x: `${bgPosX}%`,
        app_background_pos_y: `${bgPosY}%`,

        theme_presets: presets,
      });

      applySettingsToDOM(next);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function onUploadLogo(file: File) {
    if (!tenantId) return;
    const url = await uploadTenantAsset(tenantId, file, "logo");
    setCompanyLogoUrl(url);
  }

  async function onUploadAvatar(file: File) {
    if (!tenantId) return;
    const url = await uploadTenantAsset(tenantId, file, "avatar");
    setAvatarUrl(url);
  }

  async function onUploadBackground(file: File) {
    if (!tenantId) return;
    const url = await uploadTenantAsset(tenantId, file, "background");
    setBgUrl(url);
  }

  async function onUploadTimbrado(file: File) {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) return;
    const url = await uploadTimbradoA4(uid, file);
    setTimbradoUrl(url);
  }

  function exportJson() {
    const obj = {
      companyName,
      pixType,
      pixKey,
      brandPrimary,
      brandAccent,
      brandBg,
      fontFamily,
      companyLogoUrl,
      avatarUrl,
      timbradoUrl,
      bgUrl,
      bgFit,
      bgOpacity,
      bgScale,
      bgBlur,
      bgPosX,
      bgPosY,
      presets,
    };

    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "carddigital-gm-config.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importJson(file: File) {
    const raw = await file.text();
    const obj = JSON.parse(raw || "{}");

    setCompanyName(obj.companyName ?? companyName);
    setPixType(obj.pixType ?? pixType);
    setPixKey(obj.pixKey ?? pixKey);

    setBrandPrimary(obj.brandPrimary ?? brandPrimary);
    setBrandAccent(obj.brandAccent ?? brandAccent);
    setBrandBg(obj.brandBg ?? brandBg);
    setFontFamily(obj.fontFamily ?? fontFamily);

    setCompanyLogoUrl(obj.companyLogoUrl ?? companyLogoUrl);
    setAvatarUrl(obj.avatarUrl ?? avatarUrl);
    setTimbradoUrl(obj.timbradoUrl ?? timbradoUrl);

    setBgUrl(obj.bgUrl ?? bgUrl);
    setBgFit(obj.bgFit ?? bgFit);

    setBgOpacity(Number(obj.bgOpacity ?? bgOpacity));
    setBgScale(Number(obj.bgScale ?? bgScale));
    setBgBlur(Number(obj.bgBlur ?? bgBlur));

    setBgPosX(Number(obj.bgPosX ?? bgPosX));
    setBgPosY(Number(obj.bgPosY ?? bgPosY));

    setPresets(Array.isArray(obj.presets) ? obj.presets : presets);
  }

  function savePreset() {
    const name = prompt("Nome do preset (ex: GM Laranja)")?.trim();
    if (!name) return;

    const p: ThemePreset = {
      name,
      brand_primary: brandPrimary,
      brand_accent: brandAccent,
      brand_bg: brandBg,
      font_family: fontFamily,
    };
    setPresets((arr) => [p, ...arr].slice(0, 12));
  }

  function applyPreset(p: ThemePreset) {
    setBrandPrimary(p.brand_primary);
    setBrandAccent(p.brand_accent);
    setBrandBg(p.brand_bg);
    setFontFamily(p.font_family);
  }

  const ColorPickerInput = ({
    label,
    value,
    onChange,
  }: {
    label: React.ReactNode;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div>
      <label className="gm-label flex items-center gap-2">{label}</label>
      <div className="flex items-center gap-2">
        <div
          className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 shadow-sm"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-[200%] h-[200%] -top-[50%] -left-[50%] p-0 border-0 cursor-pointer opacity-0"
            title="Escolher cor"
          />
        </div>
        <input className="gm-input uppercase font-mono text-sm" value={value} onChange={(e) => onChange(e.target.value)} maxLength={7} />
      </div>
    </div>
  );

  return (
    <Page
      title="Configurações"
      actions={
        <div className="flex gap-2">
          <button className="gm-btn" onClick={exportJson} type="button">
            <Download size={16} />
            Exportar
          </button>

          <label className="gm-btn cursor-pointer" title="Importar JSON">
            <Upload size={16} />
            Importar
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
              }}
            />
          </label>

          <button className="gm-btn gm-border-loop" disabled={!canSave} onClick={handleSave} type="button">
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      }
    >
      {loading ? (
        <Card className="text-center p-10">Carregando...</Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          {/* =========================
              COLUNA 1 (Topo)
          ========================= */}
          <Card className="h-full">
            <div className="gm-card-header">
              <div className="gm-card-title">
                <h3>Personalização do App</h3>
                <span className="gm-muted">Logo e plano de fundo por empresa (Tenant)</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="gm-label">Nome da empresa (App)</label>
                <input className="gm-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-4">
                  <div>
                    <label className="gm-label">Logo principal</label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                        {companyLogoUrl ? (
                          <img src={companyLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={18} className="opacity-70" />
                        )}
                      </div>

                      <label className="gm-btn cursor-pointer">
                        <FileImage size={16} />
                        Alterar logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onUploadLogo(f);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div>
                      <div className="font-semibold text-sm">Plano de fundo</div>
                      <div className="gm-muted text-xs">Ative para aparecer no app</div>
                    </div>

                    <button
                      type="button"
                      className={`gm-btn ${bgEnabled ? "gm-border-loop" : ""}`}
                      onClick={() => {
                        setBgEnabled((v) => {
                          const next = !v;
                          if (next) {
                            if (bgOpacity <= 0) setBgOpacity(bgOpacityPrev);
                          } else {
                            if (bgOpacity > 0) setBgOpacityPrev(bgOpacity);
                          }
                          return next;
                        });
                      }}
                    >
                      {bgEnabled ? "Ativo" : "Desativado"}
                    </button>
                  </div>

                  <div>
                    <label className="gm-label">Ajuste</label>
                    <select className="gm-input" value={bgFit} onChange={(e) => setBgFit(e.target.value as Fit)}>
                      <option value="cover">Cortar (cover)</option>
                      <option value="contain">Conter (contain)</option>
                    </select>
                  </div>

                  <div>
                    <label className="gm-label">Opacidade (0 a 1)</label>
                    <div className="grid grid-cols-[1fr_80px] gap-3 items-center">
                      <input type="range" min={0} max={1} step={0.01} value={bgOpacity} onChange={(e) => setBgOpacity(Number(e.target.value))} />
                      <input type="number" min={0} max={1} step={0.01} className="gm-input" value={bgOpacity} onChange={(e) => setBgOpacity(Math.min(1, Math.max(0, Number(e.target.value))))} />
                    </div>
                  </div>

                  <div>
                    <label className="gm-label">Tamanho do background (zoom real)</label>
                    <div className="grid grid-cols-[1fr_80px] gap-3 items-center">
                      <input type="range" min={0.5} max={5} step={0.1} value={bgScale} onChange={(e) => setBgScale(Number(e.target.value))} />
                      <input type="number" min={0.5} max={5} step={0.1} className="gm-input" value={bgScale} onChange={(e) => setBgScale(Math.min(5, Math.max(0.5, Number(e.target.value))))} />
                    </div>
                    <div className="gm-muted text-xs mt-1">1.0 = normal • 5.0 = super zoom</div>
                  </div>

                  <div>
                    <label className="gm-label flex items-center gap-1">
                      <Move size={12} /> Posição Horizontal (X)
                    </label>
                    <div className="grid grid-cols-[1fr_80px] gap-3 items-center">
                      <input type="range" min={0} max={100} step={1} value={bgPosX} onChange={(e) => setBgPosX(Number(e.target.value))} />
                      <div className="relative">
                        <input type="number" min={0} max={100} step={1} className="gm-input pr-6" value={bgPosX} onChange={(e) => setBgPosX(Math.min(100, Math.max(0, Number(e.target.value))))} />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-50">%</span>
                      </div>
                    </div>
                    <div className="gm-muted text-xs mt-1">0% = Esquerda • 50% = Centro • 100% = Direita</div>
                  </div>

                  <div>
                    <label className="gm-label flex items-center gap-1">
                      <Move size={12} className="rotate-90" /> Posição Vertical (Y)
                    </label>
                    <div className="grid grid-cols-[1fr_80px] gap-3 items-center">
                      <input type="range" min={0} max={100} step={1} value={bgPosY} onChange={(e) => setBgPosY(Number(e.target.value))} />
                      <div className="relative">
                        <input type="number" min={0} max={100} step={1} className="gm-input pr-6" value={bgPosY} onChange={(e) => setBgPosY(Math.min(100, Math.max(0, Number(e.target.value))))} />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-50">%</span>
                      </div>
                    </div>
                    <div className="gm-muted text-xs mt-1">0% = Topo • 50% = Centro • 100% = Baixo</div>
                  </div>

                  <div>
                    <label className="gm-label">Blur do background</label>
                    <div className="grid grid-cols-[1fr_80px] gap-3 items-center">
                      <input type="range" min={0} max={24} step={1} value={bgBlur} onChange={(e) => setBgBlur(Number(e.target.value))} />
                      <input type="number" min={0} max={24} step={1} className="gm-input" value={bgBlur} onChange={(e) => setBgBlur(Math.min(24, Math.max(0, Number(e.target.value))))} />
                    </div>
                    <div className="gm-muted text-xs mt-1">0 = nítido • 10 = suave • 20+ = vidro</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="gm-label">Plano de fundo (JPG/PNG/GIF)</label>
                    <label className="gm-btn cursor-pointer w-fit">
                      <FileImage size={16} />
                      Upload background
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onUploadBackground(f);
                        }}
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-extrabold tracking-wide opacity-80">Escala do Preview</div>
                      <div className="text-xs opacity-60">{bgPreviewScale.toFixed(2)}x</div>
                    </div>
                    <input
                      type="range"
                      min={0.7}
                      max={1.6}
                      step={0.01}
                      value={bgPreviewScale}
                      onChange={(e) => setBgPreviewScale(Number(e.target.value))}
                      className="w-full mt-2"
                    />
                    <div className="gm-muted text-[11px] mt-1">Isso só altera a miniatura (não mexe no app).</div>
                  </div>

                  <div className="gm-muted text-xs">Preview (miniatura)</div>
                  {bgUrl ? (
                    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                      <div className="relative w-full h-64 overflow-hidden">
                        <div
                          className="absolute inset-0"
                          style={{
                            transform: `scale(${bgPreviewScale})`,
                            transformOrigin: "center",
                          }}
                        >
                          <img
                            src={bgUrl}
                            alt="Background preview"
                            className="absolute inset-0 w-full h-full"
                            style={{
                              objectFit: bgFit,
                              objectPosition: `${bgPosX}% ${bgPosY}%`,
                              opacity: Math.min(1, Math.max(0.12, bgOpacity || 0.18)),
                              transform: `scale(${bgScale})`,
                              transformOrigin: "center",
                              filter: `blur(${bgBlur}px)`,
                            }}
                          />
                          <div className="absolute inset-0 bg-black/35 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 gm-muted text-sm">Nenhum plano de fundo enviado ainda.</div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* =========================
              COLUNA 2 (Topo)
          ========================= */}
          <Card className="h-full">
            <div className="gm-card-header">
              <div className="gm-card-title">
                <h3>Tema (Cores e Tipografia)</h3>
                <span className="gm-muted">Deixa o app “premium” e consistente</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ColorPickerInput label={<><Palette size={14} /> Primária</>} value={brandPrimary} onChange={setBrandPrimary} />
                <ColorPickerInput label="Destaque" value={brandAccent} onChange={setBrandAccent} />
                <ColorPickerInput label="Fundo" value={brandBg} onChange={setBrandBg} />
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="gm-label">Tipografia</label>
                  <select className="gm-input" value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="system-ui">System</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Montserrat">Montserrat</option>
                  </select>
                </div>

                <button className="gm-btn" type="button" onClick={savePreset}>
                  <Save size={16} />
                  Criar Preset
                </button>
              </div>

              <div className="rounded-2xl p-4 border border-white/10 bg-white/5">
                <div className="gm-muted text-sm mb-2">Pré-visualização</div>
                <div className="flex gap-2">
                  <button className="gm-btn gm-border-loop" type="button">Botão Primário</button>
                  <button className="gm-btn" type="button">Botão Secundário</button>
                </div>
              </div>

              <div className="mt-2">
                <div className="gm-muted text-sm mb-2">Presets salvos</div>
                {presets.length === 0 ? (
                  <div className="gm-muted text-sm">Nenhum preset salvo.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map((p) => (
                      <button key={p.name} type="button" className="gm-btn justify-start" onClick={() => applyPreset(p)} title="Aplicar preset">
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="h-full">
            <div className="gm-card-header">
              <div className="gm-card-title">
                <h3>Timbrado e Perfil</h3>
                <span className="gm-muted">Necessário para o PDF com cabeçalho A4</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="gm-label">Avatar (perfil)</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={18} className="opacity-70" />
                    )}
                  </div>

                  <label className="gm-btn cursor-pointer">
                    <FileImage size={16} />
                    Escolher arquivo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadAvatar(f);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
                <div className="mb-4">
                  <div className="font-bold">Timbrado do Orçamento (A4)</div>
                  <div className="gm-muted text-sm">Envie PNG/JPG A4 para o PDF funcionar</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-3">
                    <a
                      href={TIMBRADO_MODEL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gm-btn bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 w-full justify-center"
                      title="Baixar modelo guia para criar seu design"
                    >
                      <Download size={16} />
                      Modelo
                    </a>

                    <div className="relative w-full aspect-[210/297] bg-black/20 rounded-lg overflow-hidden border border-white/10 group">
                      <img src={TIMBRADO_MODEL_URL} alt="Modelo Gabarito" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <span className="text-xs font-bold text-white">Visualizar Modelo</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="gm-btn cursor-pointer w-full justify-center">
                      <Upload size={16} />
                      Enviar timbrado
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onUploadTimbrado(f);
                        }}
                      />
                    </label>

                    <div className="relative w-full aspect-[210/297] bg-black/20 rounded-lg overflow-hidden border border-white/10">
                      {timbradoUrl ? (
                        <img src={timbradoUrl} alt="Timbrado Atual" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 p-4 text-center">
                          <FileImage size={24} className="opacity-50" />
                          <span className="text-[10px]">
                            Nenhum timbrado
                            <br />
                            enviado
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pix */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="font-bold">Dados de Pagamento (Pix)</div>
                <div className="gm-muted text-sm">
                  ✅ QR e “Copia e Cola” gerados aqui funcionam em <b>qualquer banco</b> (Itaú, Nubank, Caixa, BB, Bradesco, Santander, Inter, etc.)
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="gm-label">Tipo de chave</label>
                    <select className="gm-input" value={pixType} onChange={(e) => setPixType(e.target.value)}>
                      <option value="CPF">CPF</option>
                      <option value="CNPJ">CNPJ</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="PHONE">Telefone</option>
                      <option value="RANDOM">Aleatória</option>
                    </select>
                  </div>
                  <div>
                    <label className="gm-label">Chave Pix</label>
                    <input className="gm-input" value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
                  </div>
                </div>

                <div className="gm-muted text-sm mt-2">
                  Dica: e-mail deve ser minúsculo e sem espaços (o sistema pode ajustar).
                </div>

                {/* ✅ Preview do QR + Copia e Cola */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs font-extrabold tracking-wide opacity-80 mb-3">QR Code Pix (universal)</div>
                    {pixQrPreview ? (
                      <div className="bg-white rounded-xl p-3 w-fit">
                        <img src={pixQrPreview} alt="QR Pix (Preview)" className="w-[220px] h-auto" />
                      </div>
                    ) : (
                      <div className="gm-muted text-sm">Informe uma chave Pix para gerar o QR.</div>
                    )}

                    {pixQrPreview && (
                      <button
                        type="button"
                        className="gm-btn mt-3"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = pixQrPreview;
                          a.download = "pix_qr_configuracoes.png";
                          a.click();
                        }}
                      >
                        <Download size={16} />
                        Baixar QR
                      </button>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs font-extrabold tracking-wide opacity-80 mb-3">Pix “Copia e Cola”</div>

                    {!pixPayloadPreview ? (
                      <div className="gm-muted text-sm">Informe uma chave Pix para gerar o código.</div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`gm-btn w-full justify-center ${pixCopied ? "gm-border-loop" : ""}`}
                          onClick={async () => {
                            const ok = await copyText(pixPayloadPreview);
                            if (ok) {
                              setPixCopied(true);
                              setTimeout(() => setPixCopied(false), 1500);
                            } else {
                              alert("Não foi possível copiar automaticamente. Copie manualmente abaixo.");
                            }
                          }}
                        >
                          {pixCopied ? <Check size={16} /> : <Copy size={16} />}
                          {pixCopied ? "Copiado!" : "Copiar código"}
                        </button>

                        <div className="mt-3 text-[10px] leading-tight font-mono break-all bg-black/30 border border-white/10 rounded-xl p-3 text-slate-300">
                          {pixPayloadPreview}
                        </div>
                      </>
                    )}

                    <div className="gm-muted text-xs mt-2">
                      Observação: este QR é <b>estático</b>. O banco do cliente pode digitar o valor ao pagar, ou você pode gerar com valor na tela de orçamento (como já existe no seu PixModal).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* =========================
              CHECKLIST (full width)
          ========================= */}
          <div className="lg:col-span-2">
            <Card>
              <div className="gm-card-header">
                <div className="gm-card-title">
                  <h3>Checklist rápido</h3>
                  <span className="gm-muted">Para tudo funcionar sem erro</span>
                </div>
              </div>

              <ol className="space-y-2 text-sm leading-relaxed">
                <li>1) Envie o <b>Timbrado A4 (PNG/JPG)</b> nesta tela.</li>
                <li>2) Clique em <b>Salvar Alterações</b>.</li>
                <li>3) Volte em <b>Orçamentos</b> e gere o PDF.</li>
                <li>4) Se quiser, envie também <b>Logo</b> e <b>Fundo</b>.</li>
                <li>5) Os lembretes de <b>APROVADO</b> usam os horários definidos acima.</li>
              </ol>
            </Card>
          </div>
        </div>
      )}
    </Page>
  );
}