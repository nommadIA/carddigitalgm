import React, { useState } from "react";
import {
  Download,
  FileText,
  FileCode,
  Code,
  Image as ImageIcon,
  FileImage,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  downloadQrAsPng,
  downloadQrAsJpg,
  downloadQrAsSvg,
  downloadQrAsEps,
  downloadQrAsPdf,
  QrCodeOptions,
} from "../../services/qrCodeGeneratorService";
import { pushToast } from "../../store/toast";
import { playUiSound } from "../../lib/audio";

interface PixQrDownloadFormatsProps {
  pixPayload: string;
  pixKey?: string;
  companyName?: string;
  className?: string;
}

export default function PixQrDownloadFormats({
  pixPayload,
  pixKey = "",
  companyName = "GM PRO",
  className = "",
}: PixQrDownloadFormatsProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const handleDownload = async (format: "pdf" | "eps" | "svg" | "png" | "jpg") => {
    if (!pixPayload) {
      pushToast({
        title: "Chave Pix Necessária",
        message: "Informe uma chave Pix válida antes de baixar o QR Code.",
        type: "error",
      });
      return;
    }

    try {
      setDownloadingFormat(format);
      playUiSound("toggle_on");

      // Para QR Code Bancário Oficial do Pix, contraste absoluto Preto & Branco com margem 3
      // garante 100% de leitura em qualquer app bancário do Brasil
      const opts: QrCodeOptions = {
        text: pixPayload,
        fgColor: "#000000",
        bgColor: "#FFFFFF",
        moduleShape: "square",
        eyeShape: "square",
        margin: 3,
        size: 2048,
        title: `Pagamento Pix - ${companyName || "CardDigital GM"}`,
        subtitle: `Chave Pix: ${pixKey || "Consulte os dados da conta"} • Banco Central do Brasil`,
        label: "CÓDIGO PIX (COPIA E COLA):",
      };

      const keyClean = (pixKey || "oficial").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
      const baseName = `pix-qrcode-${keyClean}-${Date.now()}`;

      if (format === "png") {
        await downloadQrAsPng(opts, `${baseName}.png`);
      } else if (format === "jpg") {
        await downloadQrAsJpg(opts, `${baseName}.jpg`);
      } else if (format === "svg") {
        downloadQrAsSvg(opts, `${baseName}.svg`);
      } else if (format === "eps") {
        downloadQrAsEps(opts, `${baseName}.eps`);
      } else if (format === "pdf") {
        await downloadQrAsPdf(opts, `${baseName}.pdf`);
      }

      pushToast({
        title: `Download ${format.toUpperCase()} Concluído!`,
        message: `QR Code Pix no formato ${format.toUpperCase()} exportado com sucesso em alta definição.`,
        type: "success",
      });
    } catch (err) {
      console.error("Erro exportando QR Code Pix:", err);
      pushToast({
        title: "Erro ao exportar",
        message: "Não foi possível gerar o arquivo selecionado.",
        type: "error",
      });
    } finally {
      setTimeout(() => setDownloadingFormat(null), 800);
    }
  };

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl bg-black/60 border border-[var(--gm-primary)]/40 flex flex-col justify-between gap-4 shadow-[0_0_20px_rgba(254,84,11,0.12)] w-full ${className}`}
    >
      <div className="flex flex-col gap-3">
        {/* Cabeçalho do Bloco */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
            <Download size={15} className="text-[var(--gm-primary)]" />
            <span>Baixar QR Code Pix (5 Formatos)</span>
          </span>
          <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 self-start sm:self-auto">
            Resolução 2048px / Vetorial
          </span>
        </div>

        {/* Subtítulo Descritivo */}
        <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
          Escolha o formato ideal para impressão em gráficas, aplicação em artes, cartões de visita ou envio digital:
        </p>

        {/* Grade com os 4 formatos principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* 1. PDF */}
          <button
            type="button"
            onClick={() => handleDownload("pdf")}
            disabled={Boolean(downloadingFormat)}
            className="h-11 px-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-between shadow-md active:scale-95 transition-all cursor-pointer border border-rose-400/30 disabled:opacity-50"
            title="Documento PDF A4 pronto para impressão de alta qualidade com dados de pagamento"
          >
            <div className="flex items-center gap-2">
              {downloadingFormat === "pdf" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileText size={16} />
              )}
              <span>Baixar PDF</span>
            </div>
            <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded">.PDF</span>
          </button>

          {/* 2. EPS */}
          <button
            type="button"
            onClick={() => handleDownload("eps")}
            disabled={Boolean(downloadingFormat)}
            className="h-11 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-between shadow-md active:scale-95 transition-all cursor-pointer border border-amber-400/30 disabled:opacity-50"
            title="Formato PostScript Vetorial EPSF-3.0 profissional para Illustrator, Corel e Gráficas"
          >
            <div className="flex items-center gap-2">
              {downloadingFormat === "eps" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileCode size={16} />
              )}
              <span>Baixar EPS</span>
            </div>
            <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded">.EPS</span>
          </button>

          {/* 3. SVG */}
          <button
            type="button"
            onClick={() => handleDownload("svg")}
            disabled={Boolean(downloadingFormat)}
            className="h-11 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-between shadow-md active:scale-95 transition-all cursor-pointer border border-purple-400/30 disabled:opacity-50"
            title="Vetor puro SVG escalável infinitamente sem perda de resolução para web e design"
          >
            <div className="flex items-center gap-2">
              {downloadingFormat === "svg" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Code size={16} />
              )}
              <span>Baixar SVG</span>
            </div>
            <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded">.SVG</span>
          </button>

          {/* 4. PNG */}
          <button
            type="button"
            onClick={() => handleDownload("png")}
            disabled={Boolean(downloadingFormat)}
            className="h-11 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-between shadow-md active:scale-95 transition-all cursor-pointer border border-emerald-400/30 disabled:opacity-50"
            title="Imagem PNG em ultra-alta resolução 2048x2048 para uso digital e WhatsApp"
          >
            <div className="flex items-center gap-2">
              {downloadingFormat === "png" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ImageIcon size={16} />
              )}
              <span>Baixar PNG</span>
            </div>
            <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded">.PNG</span>
          </button>
        </div>
      </div>

      {/* 5. JPG (Largura total com destaque) */}
      <div className="pt-2 border-t border-white/10 mt-1">
        <button
          type="button"
          onClick={() => handleDownload("jpg")}
          disabled={Boolean(downloadingFormat)}
          className="w-full h-11 px-4 rounded-xl bg-[#14161f] hover:bg-[#1c1f2b] text-white border border-white/20 font-extrabold text-xs flex items-center justify-between active:scale-95 transition-all cursor-pointer shadow-sm hover:border-[var(--gm-primary)]/50 disabled:opacity-50"
          title="Imagem JPG de alta qualidade para redes sociais, cartões e envio rápido"
        >
          <div className="flex items-center gap-2">
            {downloadingFormat === "jpg" ? (
              <Loader2 size={16} className="animate-spin text-[var(--gm-primary)]" />
            ) : (
              <FileImage size={16} className="text-[var(--gm-primary)]" />
            )}
            <span>Baixar Imagem JPG (Alta Qualidade)</span>
          </div>
          <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded text-slate-300">
            .JPG
          </span>
        </button>
      </div>
    </div>
  );
}
