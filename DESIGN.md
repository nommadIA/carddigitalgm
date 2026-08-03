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

## 2. Segredo 2 — Tipografia Reduzida e Proporcional
Os tamanhos de fonte foram reduzidos para máxima densidade e elegância:
- **`h1` (`48px`)**: `font-weight: 800; letter-spacing: -2px; line-height: 1;` (reduzido de 54px).
- **`h2` (`34px`)**: `font-weight: 700;` (reduzido de 42px).
- **Títulos dos Cards (`28px`)**: `.metric-title, .card-title-lg { font-size: 28px; font-weight: 700; }` (reduzido de 34px).
- **Texto (`p`)**: `font-size: 15px; line-height: 1.7; opacity: .75; color: var(--text-secondary);`.

---

## 3. Segredo 3 — Espaçamento Generoso Forge
- **Entre seções**: `72px` (nunca menos).
- **Entre cards**: `32px`.
- **Padding interno**: `28px`.

---

## 4. Segredo 4 — Botões Forge (Modelo 1 e Modelo 2)
Dois modelos de botões com exatamente `48px` de altura, `font-size: 14px`, uppercase e `radius 4px`:
```css
/* Modelo 1: Laranja Primário */
button.primary,
.btn-primary {
  height: 48px;
  padding: 0 26px;
  background: #FF5A1A;
  border: none;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  border-radius: 4px;
  color: white;
}
button.primary:hover,
.btn-primary:hover {
  transform: translateY(-1px);
  background: #FF6C28;
}

/* Modelo 2: Outline Forge */
button.secondary,
.btn-secondary {
  height: 48px;
  padding: 0 26px;
  background: transparent;
  border: 1px solid var(--border);
  color: white;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: .06em;
  border-radius: 4px;
}
button.secondary:hover,
.btn-secondary:hover {
  background: rgba(255, 255, 255, .03);
}
```

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
