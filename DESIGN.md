# CardDigital GM — UI System (Tokens & Forge Industrial System)
**Design System Specification & Visual Source of Truth — 14 Segredos do Modo Forge**

Este documento define o Design System oficial do **CardDigital GM**, combinando arquitetura baseada em tokens CSS (Dark Mode e Light Mode alternados via atributo `data-theme="dark"` / `data-theme="light"`) com os **14 Segredos do Padrão Forge Industrial System**.

---

## 1. Segredo 1 — Separadores e Cards Quase Invisíveis (Modo Forge)
No modo Forge, a hierarquia visual é construída por separadores e linhas limpas em vez de caixas pesadas:
```css
.section {
  padding: 40px 0;
  border-bottom: 1px solid var(--border);
  margin-bottom: 40px;
}

.section:last-child {
  border-bottom: none;
}

.card-forge,
.card-separator,
.gm-card-forge {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid var(--border) !important;
  border-radius: 0 !important;
  padding: 28px 0 !important;
  box-shadow: none !important;
}
```

---

## 2. Segredo 2 — Escala Padronizada de Tipografia Forge
A tipografia foi organizada em uma escala estipulada e consistente para todo o app:
- **Hero / Contadores (`32px – 44px`)**: `font-weight: 900; letter-spacing: -0.03em; line-height: 1.1; color: #FFFFFF;` (Relógio grande, métricas de faturamento principal).
- **`h1` (`22px – 28px`)**: `font-weight: 900; letter-spacing: -0.02em; line-height: 1.2; color: #FFFFFF;` (Títulos de página: Dashboard, Orçamentos, Clientes, etc.).
- **`h2` (`18px – 22px`)**: `font-weight: 800; letter-spacing: -0.015em; line-height: 1.3; color: #FFFFFF;` (Títulos de seções principais e painéis).
- **`h3` (`16px – 18px`)**: `font-weight: 800; letter-spacing: -0.01em; line-height: 1.35; color: #FFFFFF;` (Cards, modais e containers).
- **Texto Principal `p` (`14px – 15px`)**: `font-size: 14px; line-height: 1.6; color: #F2F2F3;` (Leitura limpa, contraste total).
- **Subtextos / Apoio (`13px`)**: `font-size: 13px; line-height: 1.5; color: #CBD5E1;` (Descrições e observações).
- **Cápsulas de Métricas (`13px`)**: `font-size: 13px; line-height: 17px; font-weight: 800;` (Indicadores de tendência e status).
- **Rótulos / Labels (`12px`)**: `font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #F8FAFC;` (Campos de formulário e cabeçalhos `th`).
- **Kickers / Seções (`11px`)**: `font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #FFFFFF;` (Separadores "MÉTRICAS GERAIS", etc.).

---

## 3. Segredo 3 — Espaçamento Generoso Forge
- **Entre seções**: `48px` a `72px`.
- **Entre cards**: `24px` a `32px`.
- **Padding interno**: `24px` a `28px`.

---

## 4. Segredo 4 — Botões Forge (Formatos, Tamanhos e Cores)
Botões com borda de `6px` (`rounded-md`), transição ágil de `0.16s` e alto contraste:

### Tamanhos Padronizados:
- **LG (Grande - 48px)**: `height: 48px; padding: 0 24px; font-size: 13px–14px; font-weight: 900; uppercase;` (Ações principais de topo / novo registro).
- **MD (Médio - 40px)**: `height: 40px; padding: 0 18px; font-size: 12px–13px; font-weight: 800; uppercase;` (Padrão de toolbar, formulários e modais).
- **SM (Pequeno - 32px)**: `height: 32px; padding: 0 12px; font-size: 11px; font-weight: 700; uppercase;` (Ações inline em linhas e filtros).
- **Icon Buttons (40px / 36px / 32px)**: Proporção 1:1 quadrada com `radius: 6px`.

### Variantes Oficiais:
- **Primary (Ember Solid)**: Fundo `#F65A1A` + Borda `#F65A1A` + Texto e Ícones `#0B0B0C` (Ink Black) com peso `900`.
- **Primary White**: Fundo `#F65A1A` + Texto `#FFFFFF` (Branco puro).
- **Secondary (Graphite Solid)**: Fundo `#131315` + Borda `#26262A` + Texto e Ícones `#F2F2F3` (Bone White) com peso `800`.
- **Ghost**: Fundo transparente + Texto `#CBD5E1` (Hover `#FFFFFF`).
- **Danger**: Fundo `#1F1315` + Borda `#EF4444` + Texto `#EF4444` (Hover `#FFFFFF`).
- **Success**: Fundo `#0D1F17` + Borda `#22C55E` + Texto `#22C55E` (Hover `#0B0B0C`).
- **Disabled**: Fundo `#18181B` + Borda `#26262A` + Texto `#52525B`.

---

## 5. Segredo 5 — Sidebar Padrão Forge
- **Largura**: `250px`.
- **Itens (`a`)**: `52px` de altura, ícones `18px`, texto `15px`.
- **Item Ativo**: Sem borda completa ao redor; apenas a lateral esquerda em destaque:
```css
.sidebar .active,
.gm-nav a.active {
  background: #232833;
  border-left: 3px solid var(--primary);
  border-top: none;
  border-right: none;
  border-bottom: none;
}
```

---

## 6. Segredo 6 — Raios de Cards (`8px`)
Para cards padrão que necessitam de container, o raio foi refinado de `20px` para `8px`:
```css
.card,
.gm-card {
  border-radius: 8px;
}
```

---

## 7. Segredo 7 — Bordas Sutis
- **Dark Mode**: `1px solid rgba(255, 255, 255, 0.08)`
- **Light Mode**: `1px solid #E5E5E5`

---

## 8. Segredo 8 — Ícones Padronizados (`20px`)
```css
svg {
  width: 20px;
  height: 20px;
  stroke-width: 1.7;
}
```

---

## 9. Segredo 9 — Layout Editorial de Dashboard
O Dashboard substitui caixas fechadas (`┌────┐ │ │ └────┘`) por seções abertas com linhas divisórias (`────────────── FATURAMENTO R$ 4.350 ──────────────`), criando um fluxo visual executivo e limpo.

---

## 10. Segredo 10 — Tabelas Abertas
Tabelas sem caixas externas, estruturadas apenas por linhas horizontais:
```css
table {
  border-collapse: collapse;
}
tr {
  border-bottom: 1px solid var(--border);
}
td, th {
  padding: 18px 0;
}
```

---

## 11. Segredo 11 — Inputs Compactos (`44px`)
```css
input,
textarea,
select,
.gm-input,
.gm-select {
  height: 44px;
  padding: 0 14px;
  border-radius: 4px;
}
```

---

## 12. Segredo 12 — Escala Geral de Espaçamento e Medidas
- **Container máximo**: `1600px`
- **Sidebar**: `250px`
- **Gap padrão**: `32px`
- **Padding padrão**: `32px`
- **Margem entre seções**: `72px`
- **Padding em cards**: `28px`
- **Botões**: `48px` (altura)
- **Inputs**: `44px` (altura)
- **Raio de bordas**: `4px ~ 8px`

---

## 13. Segredo 13 — Animações Suaves
```css
.card,
.gm-card {
  transition: all .22s;
}
.card:hover,
.gm-card:hover {
  transform: translateY(-2px);
}
```

---

## 14. Segredo 14 — Sombras Quase Imperceptíveis
- **Light Mode**: `0 10px 30px rgba(0, 0, 0, .08)`
- **Dark Mode**: `0 15px 40px rgba(0, 0, 0, .35)`

---

## 15. Alternância de Temas via Tokens (`data-theme`)
```html
<html data-theme="dark">
<!-- Alterna para: -->
<html data-theme="light">
```
Todas as variáveis `--bg`, `--surface`, `--border`, `--text`, `--shadow` e `--primary` se adaptam perfeitamente no momento da alternância sem necessidade de estilos duplicados.
