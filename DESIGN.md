# CoachPro — Design System

Estética **"disciplina, no decoración"**, inspirada en Whoop / Hevy / Nike Training.
Mobile-first, fondo carbón, **un solo acento de alto voltaje por pantalla**, minimalismo:
un número protagonista, no tableros saturados.

> Fuente única de verdad en código: [`src/lib/theme.js`](src/lib/theme.js).
> Componentes en [`src/lib/ui.jsx`](src/lib/ui.jsx). **Estilos 100% inline**, sin Tailwind ni CSS modules.

---

## Paleta

| Token        | Hex       | Uso                                   |
| ------------ | --------- | ------------------------------------- |
| `bg`         | `#0B0B0D` | Fondo base (carbón casi negro)        |
| `surface`    | `#0F0F11` | Superficie nivel 1                    |
| `surface2`   | `#16171A` | Superficie nivel 2 (tarjetas)         |
| `border`     | `#1E1F23` | Bordes (0.5px)                        |
| **`accent`** | `#D8FF3E` | **Lima eléctrico** — esfuerzo/éxito   |
| `danger`     | `#FF7847` | Alerta / riesgo (naranja)             |
| `info`       | `#5DA9E0` | Informativo secundario (azul)         |
| `title`      | `#FFFFFF` | Títulos                               |
| `body`       | `#EDEDEF` | Cuerpo                                |
| `muted`      | `#9A9CA2` | Texto secundario                      |
| `hint`       | `#6A6C72` | Hints / overlines                     |

**Regla de oro:** un solo acento (lima) por pantalla. Sin gradientes, sin sombras decorativas.

### Color del Score de Disciplina
- `≥ 75` → lima (`accent`) — alto
- `50–74` → blanco (`title`) — medio
- `< 50` → naranja (`danger`) — bajo

---

## Tipografía

Sans neutra del sistema (`-apple-system, Segoe UI, Roboto…`).

| Estilo     | Tamaño | Peso | Tracking  | Uso                                   |
| ---------- | ------ | ---- | --------- | ------------------------------------- |
| `hero`     | 64     | 500  | `-0.03em` | Score protagonista (anillo)           |
| `big`      | 40     | 500  | `-0.02em` | Números clave (peso, kcal)            |
| `title`    | 20–28  | 600  | `-0.01em` | Títulos de pantalla                   |
| `body`     | 15     | 400  | —         | Texto general                         |
| `small`    | 13     | 400  | —         | Secundario                            |
| `overline` | 10.5   | 600  | `1.8px`   | Labels uppercase (etiquetas)          |

**Números clave** (scores, pesos): grandes, `letter-spacing` negativo, `font-weight:500`.
**Overlines**: uppercase, 10–11px, `letter-spacing` 1.5–2px, color `hint`.

---

## Forma y espacio

- **Radios:** tarjetas 14–18px (`radius.md`/`lg`), chips/pills 999.
- **Bordes:** `0.5px solid border`.
- **Spacing:** escala `xs 6 · sm 10 · md 16 · lg 24 · xl 32`.
- **Ancho contenedor:** máx `520px`, centrado (mobile-first).
- Respeta `env(safe-area-inset-bottom)` en nav y sheets (notch / home indicator).

---

## Componentes (`src/lib/ui.jsx`)

`Screen` · `Header` · `Card` · `Button` (primary/ghost/surface/danger) · `Field` ·
`Stat` · `Avatar` (iniciales) · `Badge` · `Ring` (anillo de score) · `Bar` ·
`BottomNav` · `Sheet` (bottom sheet) · `Empty` · `Loading` · `Overline` · `Icon` (Tabler) · `Row`.

**Iconos:** [Tabler Icons](https://tabler.io/icons) vía webfont CDN — `<Icon name="bolt" />`.

---

## Identidad PWA

- Manifest `name: CoachPro`, `display: standalone`, `orientation: portrait`.
- `theme_color` y `background_color` = `#0B0B0D` (splash y status bar integrados con el fondo).
- Icono placeholder: rayo lima `#D8FF3E` sobre carbón `#0B0B0D`
  (generado por [`scripts/gen-icons.mjs`](scripts/gen-icons.mjs); reemplazable por el logo real).
