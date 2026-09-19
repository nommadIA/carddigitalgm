import React, { useLayoutEffect, useRef } from "react";

export interface BorderBeamProps {
  /** Duração aproximada em segundos para completar uma volta (padrão: 8s) */
  duration?: number;
  /** Espessura do laser em pixels (padrão: 1.5) */
  borderWidth?: number;
  /** Cor do laser/brilho (padrão: "#ffffff") */
  color?: string;
  /** Comprimento físico da cauda do feixe em pixels (padrão: 220) */
  size?: number;
  /** Sentido reverso (anti-horário) se desejado (padrão: false) */
  reverse?: boolean;
  /** Se deve ativar o brilho sutil de dispersão externa estilo Apple Glass (padrão: true) */
  glow?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

/**
 * Componente de Feixe Luminoso de Alta Precisão (BorderBeam)
 * - Inicia com perfeição milimétrica no ponto central da parte superior (topo do container)
 * - O laser NUNCA QUEBRA nos cantos: a cauda e a cabeça curvam-se perfeitamente seguindo o raio do container
 * - Velocidade dinâmica solicitada:
 *   - Lento e gracioso nas curvas dos cantos e nas laterais verticais
 *   - Pega velocidade e acelera nas seções horizontais (topo e base)
 * - Retorna e fecha o ciclo exatamente no ponto de partida superior
 */
export function BorderBeam({
  duration = 8,
  borderWidth = 1.5,
  color = "#ffffff",
  size = 220,
  reverse = false,
  glow = true,
  className = "",
}: BorderBeamProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let animId: number;
    let lastTime: number | null = null;
    let currentDistance = 0; // Inicia em 0 (topo central)

    // Geometria e dimensões cacheadas
    let W = 0;
    let H = 0;
    let R = 16;
    let totalPerimeter = 0;
    let dpr = window.devicePixelRatio || 1;

    // Segmentos acumulados
    let x0 = 0;
    let y0 = 0;
    let x1 = 0;
    let y1 = 0;
    let r = 0;
    let cx_tr = 0;
    let cy_tr = 0;
    let cx_br = 0;
    let cy_br = 0;
    let cx_bl = 0;
    let cy_bl = 0;
    let cx_tl = 0;
    let cy_tl = 0;
    let x_start = 0;
    let len_h_half = 0;
    let len_arc = 0;
    let len_v = 0;
    let len_h_full = 0;
    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    let s4 = 0;
    let s5 = 0;
    let s6 = 0;
    let s7 = 0;
    let s8 = 0;
    let s9 = 0;

    interface PathSegment {
      isArc: boolean;
      startDist: number;
      endDist: number;
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
      cx?: number;
      cy?: number;
      r?: number;
      theta1?: number;
      theta2?: number;
    }

    let segments: PathSegment[] = [];

    const updateDimensions = () => {
      const parent = container.parentElement || container;
      // Mede dimensões reais de layout imunes a escalas e transformações de rota
      const w =
        container.offsetWidth ||
        parent.offsetWidth ||
        Math.round(parent.getBoundingClientRect().width);
      const h =
        container.offsetHeight ||
        parent.offsetHeight ||
        Math.round(parent.getBoundingClientRect().height);

      if (w <= 0 || h <= 0) return;

      const comp = window.getComputedStyle(parent);
      let parsedR =
        parseFloat(comp.borderRadius) ||
        parseFloat(comp.borderTopLeftRadius) ||
        16;
      if (isNaN(parsedR) || parsedR <= 0) parsedR = 16;
      R = parsedR;

      W = w;
      H = h;

      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = "100%";
      canvas.style.height = "100%";

      const halfBw = borderWidth / 2;
      x0 = halfBw;
      y0 = halfBw;
      x1 = W - halfBw;
      y1 = H - halfBw;
      r = Math.max(0, Math.min(R, (x1 - x0) / 2, (y1 - y0) / 2));

      // Centros dos 4 cantos arredondados
      cx_tr = x1 - r;
      cy_tr = y0 + r;

      cx_br = x1 - r;
      cy_br = y1 - r;

      cx_bl = x0 + r;
      cy_bl = y1 - r;

      cx_tl = x0 + r;
      cy_tl = y0 + r;

      // Ponto de início: topo central absoluto
      x_start = (x0 + x1) / 2;

      len_h_half = Math.max(0, x1 - r - x_start);
      len_arc = (Math.PI / 2) * r;
      len_v = Math.max(0, y1 - r - (y0 + r));
      len_h_full = Math.max(0, x1 - r - (x0 + r));

      // Distâncias acumuladas dos 9 trechos
      s1 = len_h_half; // 1. Top-right horizontal
      s2 = s1 + len_arc; // 2. Top-right corner
      s3 = s2 + len_v; // 3. Right vertical
      s4 = s3 + len_arc; // 4. Bottom-right corner
      s5 = s4 + len_h_full; // 5. Bottom horizontal
      s6 = s5 + len_arc; // 6. Bottom-left corner
      s7 = s6 + len_v; // 7. Left vertical
      s8 = s7 + len_arc; // 8. Top-left corner
      s9 = s8 + len_h_half; // 9. Top-left horizontal (volta ao topo central)

      totalPerimeter = s9;

      // Definição geométrica exata dos 9 segmentos para traçado contínuo via GPU
      segments = [
        // 1. Top-Right Horizontal
        {
          isArc: false,
          startDist: 0,
          endDist: s1,
          x1: x_start,
          y1: y0,
          x2: cx_tr,
          y2: y0,
        },
        // 2. Top-Right Corner Arc (-90° a 0°)
        {
          isArc: true,
          startDist: s1,
          endDist: s2,
          cx: cx_tr,
          cy: cy_tr,
          r: r,
          theta1: -Math.PI / 2,
          theta2: 0,
        },
        // 3. Right Vertical (descendo)
        {
          isArc: false,
          startDist: s2,
          endDist: s3,
          x1: x1,
          y1: cy_tr,
          x2: x1,
          y2: cy_br,
        },
        // 4. Bottom-Right Corner Arc (0° a +90°)
        {
          isArc: true,
          startDist: s3,
          endDist: s4,
          cx: cx_br,
          cy: cy_br,
          r: r,
          theta1: 0,
          theta2: Math.PI / 2,
        },
        // 5. Bottom Horizontal (para a esquerda)
        {
          isArc: false,
          startDist: s4,
          endDist: s5,
          x1: cx_br,
          y1: y1,
          x2: cx_bl,
          y2: y1,
        },
        // 6. Bottom-Left Corner Arc (+90° a 180°)
        {
          isArc: true,
          startDist: s5,
          endDist: s6,
          cx: cx_bl,
          cy: cy_bl,
          r: r,
          theta1: Math.PI / 2,
          theta2: Math.PI,
        },
        // 7. Left Vertical (subindo)
        {
          isArc: false,
          startDist: s6,
          endDist: s7,
          x1: x0,
          y1: cy_bl,
          x2: x0,
          y2: cy_tl,
        },
        // 8. Top-Left Corner Arc (180° a 270°)
        {
          isArc: true,
          startDist: s7,
          endDist: s8,
          cx: cx_tl,
          cy: cy_tl,
          r: r,
          theta1: Math.PI,
          theta2: (3 * Math.PI) / 2,
        },
        // 9. Top-Left Horizontal (voltando ao centro superior)
        {
          isArc: false,
          startDist: s8,
          endDist: s9,
          x1: cx_tl,
          y1: y0,
          x2: x_start,
          y2: y0,
        },
      ];
    };

    updateDimensions();

    const ro = new ResizeObserver(() => {
      updateDimensions();
    });
    ro.observe(container);
    if (container.parentElement) {
      ro.observe(container.parentElement);
    }
    window.addEventListener("resize", updateDimensions);

    /**
     * Calcula as coordenadas exatas (x, y) de qualquer distância ao longo do perímetro.
     * Curva perfeitamente os cantos usando trigonometria exata (raio r).
     */
    const getPointAtDistance = (d: number): { x: number; y: number } => {
      if (totalPerimeter <= 0) return { x: 0, y: 0 };
      let dist = d % totalPerimeter;
      if (dist < 0) dist += totalPerimeter;

      // 1. Top-Right Horizontal
      if (dist <= s1) {
        return { x: x_start + dist, y: y0 };
      }
      // 2. Top-Right Corner (de -90° até 0°)
      if (dist <= s2) {
        const local = dist - s1;
        const theta = -Math.PI / 2 + (len_arc > 0 ? (local / len_arc) * (Math.PI / 2) : 0);
        return { x: cx_tr + r * Math.cos(theta), y: cy_tr + r * Math.sin(theta) };
      }
      // 3. Right Vertical (descendo)
      if (dist <= s3) {
        const local = dist - s2;
        return { x: x1, y: y0 + r + local };
      }
      // 4. Bottom-Right Corner (de 0° até +90°)
      if (dist <= s4) {
        const local = dist - s3;
        const theta = len_arc > 0 ? (local / len_arc) * (Math.PI / 2) : 0;
        return { x: cx_br + r * Math.cos(theta), y: cy_br + r * Math.sin(theta) };
      }
      // 5. Bottom Horizontal (para a esquerda)
      if (dist <= s5) {
        const local = dist - s4;
        return { x: x1 - r - local, y: y1 };
      }
      // 6. Bottom-Left Corner (de +90° até 180°)
      if (dist <= s6) {
        const local = dist - s5;
        const theta = Math.PI / 2 + (len_arc > 0 ? (local / len_arc) * (Math.PI / 2) : 0);
        return { x: cx_bl + r * Math.cos(theta), y: cy_bl + r * Math.sin(theta) };
      }
      // 7. Left Vertical (subindo)
      if (dist <= s7) {
        const local = dist - s6;
        return { x: x0, y: y1 - r - local };
      }
      // 8. Top-Left Corner (de 180° até 270°)
      if (dist <= s8) {
        const local = dist - s7;
        const theta = Math.PI + (len_arc > 0 ? (local / len_arc) * (Math.PI / 2) : 0);
        return { x: cx_tl + r * Math.cos(theta), y: cy_tl + r * Math.sin(theta) };
      }
      // 9. Top-Left Horizontal (indo para o centro superior)
      const local = dist - s8;
      return { x: x0 + r + local, y: y0 };
    };

    /**
     * Curva de Velocidade Solicitada:
     * - Cantos e verticais: LENTO (0.50x), suave e sem pressa
     * - Horizontais: ACELERA (2.45x), rápido e fluido
     * - Transições suaves com função cúbica para evitar qualquer solavanco
     */
    const getSpeedMultiplier = (d: number): number => {
      if (totalPerimeter <= 0) return 1;
      let dist = d % totalPerimeter;
      if (dist < 0) dist += totalPerimeter;

      const SLOW = 0.5;
      const FAST = 2.45;
      const smooth = (t: number) => {
        const c = Math.max(0, Math.min(1, t));
        return c * c * (3 - 2 * c);
      };
      const margin = Math.min(50, Math.max(20, len_h_half * 0.45));

      // Topo Horizontal (trecho inicial até s1)
      if (dist <= s1) {
        const distFromCorner = s1 - dist;
        if (distFromCorner < margin) {
          return SLOW + (FAST - SLOW) * smooth(distFromCorner / margin);
        }
        return FAST;
      }
      // Topo Horizontal (trecho final de s8 até totalPerimeter)
      if (dist >= s8) {
        const distFromCorner = dist - s8;
        if (distFromCorner < margin) {
          return SLOW + (FAST - SLOW) * smooth(distFromCorner / margin);
        }
        return FAST;
      }
      // Base Horizontal (trecho entre s4 e s5)
      if (dist >= s4 && dist <= s5) {
        const distFromCorners = Math.min(dist - s4, s5 - dist);
        if (distFromCorners < margin) {
          return SLOW + (FAST - SLOW) * smooth(distFromCorners / margin);
        }
        return FAST;
      }

      // Curvas dos cantos e trechos verticais
      return SLOW;
    };

    /**
     * Traçado Contínuo de Luz (Zero Craquelados / Zero Pontos Discretos)
     * Utiliza gradientes lineares contínuos por segmento com lineCap="butt",
     * eliminando 100% dos micro-pontos de sobreposição e das quebras.
     */
    const drawLaserRange = (
      ctx: CanvasRenderingContext2D,
      lineWidth: number,
      alphaMult: number,
      trailLen: number,
      tailDist: number,
      ranges: Array<{ start: number; end: number; offset: number }>
    ) => {
      ctx.lineCap = "butt";
      ctx.lineJoin = "round";

      for (const range of ranges) {
        for (const seg of segments) {
          const d1 = Math.max(seg.startDist, range.start);
          const d2 = Math.min(seg.endDist, range.end);
          if (d1 >= d2) continue;

          const segLen = seg.endDist - seg.startDist;
          if (segLen <= 0) continue;

          if (!seg.isArc) {
            // Segmento Reto (Horizontal ou Vertical) - traço único com interpolação de gradiente nativo GPU
            const f1 = (d1 - seg.startDist) / segLen;
            const f2 = (d2 - seg.startDist) / segLen;
            const p1 = {
              x: seg.x1! + (seg.x2! - seg.x1!) * f1,
              y: seg.y1! + (seg.y2! - seg.y1!) * f1,
            };
            const p2 = {
              x: seg.x1! + (seg.x2! - seg.x1!) * f2,
              y: seg.y1! + (seg.y2! - seg.y1!) * f2,
            };

            const t1 = Math.max(0, Math.min(1, (d1 - range.offset - tailDist) / trailLen));
            const t2 = Math.max(0, Math.min(1, (d2 - range.offset - tailDist) / trailLen));

            const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            const STOPS = 6;
            for (let s = 0; s <= STOPS; s++) {
              const frac = s / STOPS;
              const t = t1 + (t2 - t1) * frac;
              const a = Math.pow(t, 2.3) * alphaMult;
              grad.addColorStop(frac, `rgba(255, 255, 255, ${a.toFixed(4)})`);
            }

            ctx.strokeStyle = grad;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          } else {
            // Segmento Curvo (Canto Arredondado)
            const f1 = (d1 - seg.startDist) / segLen;
            const f2 = (d2 - seg.startDist) / segLen;
            const theta1 = seg.theta1! + (seg.theta2! - seg.theta1!) * f1;
            const theta2 = seg.theta1! + (seg.theta2! - seg.theta1!) * f2;

            const arcLen = d2 - d1;
            // Se o arco for maior que 13px, dividimos em 2 metades para precisão angular absoluta
            const subDivs = arcLen > 13 ? 2 : 1;
            for (let sub = 0; sub < subDivs; sub++) {
              const subF1 = sub / subDivs;
              const subF2 = (sub + 1) / subDivs;
              const thA = theta1 + (theta2 - theta1) * subF1;
              const thB = theta1 + (theta2 - theta1) * subF2;
              const subD1 = d1 + (d2 - d1) * subF1;
              const subD2 = d1 + (d2 - d1) * subF2;

              const pA = {
                x: seg.cx! + seg.r! * Math.cos(thA),
                y: seg.cy! + seg.r! * Math.sin(thA),
              };
              const pB = {
                x: seg.cx! + seg.r! * Math.cos(thB),
                y: seg.cy! + seg.r! * Math.sin(thB),
              };
              const tA = Math.max(0, Math.min(1, (subD1 - range.offset - tailDist) / trailLen));
              const tB = Math.max(0, Math.min(1, (subD2 - range.offset - tailDist) / trailLen));

              const grad = ctx.createLinearGradient(pA.x, pA.y, pB.x, pB.y);
              const STOPS = 5;
              for (let s = 0; s <= STOPS; s++) {
                const frac = s / STOPS;
                const t = tA + (tB - tA) * frac;
                const a = Math.pow(t, 2.3) * alphaMult;
                grad.addColorStop(frac, `rgba(255, 255, 255, ${a.toFixed(4)})`);
              }

              ctx.strokeStyle = grad;
              ctx.lineWidth = lineWidth;
              ctx.beginPath();
              ctx.arc(seg.cx!, seg.cy!, seg.r!, thA, thB);
              ctx.stroke();
            }
          }
        }
      }
    };

    // Loop de renderização acelerado a 60-120fps via Canvas
    const render = (time: number) => {
      if (!lastTime) lastTime = time;
      const dt = Math.min(0.06, (time - lastTime) / 1000);
      lastTime = time;

      if (totalPerimeter > 0 && W > 0 && H > 0) {
        // Velocidade base calculada pela duração média solicitada
        const baseSpeed = totalPerimeter / Math.max(1, duration);
        const speedMultiplier = getSpeedMultiplier(currentDistance);
        const moveStep = baseSpeed * speedMultiplier * dt;

        if (reverse) {
          currentDistance -= moveStep;
          if (currentDistance < 0) currentDistance += totalPerimeter;
        } else {
          currentDistance += moveStep;
          if (currentDistance >= totalPerimeter) currentDistance -= totalPerimeter;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, W, H);

          const trailLen = Math.min(size, Math.max(90, W * 0.28));
          const headDist = currentDistance;
          const tailDist = headDist - trailLen;

          // Suporta transição de fechamento contínua no topo central
          const ranges =
            tailDist >= 0
              ? [{ start: tailDist, end: headDist, offset: 0 }]
              : [
                  {
                    start: totalPerimeter + tailDist,
                    end: totalPerimeter,
                    offset: totalPerimeter,
                  },
                  { start: 0, end: headDist, offset: 0 },
                ];

          // 1. PASSADA DE DISPERSÃO E BRILHO SUAVE (GLOW APPLE GLASS AURA)
          if (glow) {
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            drawLaserRange(ctx, borderWidth * 3.0, 0.45, trailLen, tailDist, ranges);
            ctx.restore();
          }

          // 2. PASSADA DO CORPO DO LASER (FITA DE LUZ LÍQUIDA, ULTRA-SUAVE SEM CRAQUELADOS)
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 4;
          drawLaserRange(ctx, borderWidth, 0.95, trailLen, tailDist, ranges);
          ctx.restore();

          // 3. FIO CENTRAL DE LUZ DE ALTA CONCENTRAÇÃO (LASER CORE)
          ctx.save();
          drawLaserRange(
            ctx,
            Math.max(0.7, borderWidth * 0.5),
            0.8,
            trailLen,
            tailDist,
            ranges
          );
          ctx.restore();

          // 4. PONTO INCANDESCENTE NA CABEÇA DO FEIXE (PONTO DE LUZ CRISTALINO FOCAL)
          const head = getPointAtDistance(currentDistance);
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(head.x, head.y, Math.max(1.3, borderWidth * 1.15), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener("resize", updateDimensions);
    };
  }, [duration, borderWidth, color, size, reverse, glow]);

  return (
    <div
      ref={containerRef}
      className={`absolute -inset-[1px] w-[calc(100%+2px)] h-[calc(100%+2px)] rounded-[inherit] pointer-events-none overflow-hidden ${className}`}
      style={{
        zIndex: 10,
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none rounded-[inherit]"
      />
    </div>
  );
}

export default BorderBeam;


