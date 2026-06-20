// ============================================================
// CoachPro — componentes UI compartidos (estilos 100% inline)
// ============================================================
import { useEffect, useState } from 'react'
import { colors, radius, space, font, scoreColor } from './theme.js'

// ---------- Icono (Tabler webfont) ----------
export function Icon({ name, size = 20, color = 'currentColor', style }) {
  return (
    <i
      className={`ti ti-${name}`}
      style={{ fontSize: size, color, lineHeight: 1, display: 'inline-flex', ...style }}
    />
  )
}

// ---------- Pantalla / contenedor mobile ----------
export function Screen({ children, pad = true, style }) {
  const base = pad ? space.md : 0
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: colors.bg,
        color: colors.body,
        fontFamily: font.family,
        maxWidth: 520,
        margin: '0 auto',
        // Safe-area lateral (notch en landscape) — devuelve 0 si no hay recortes.
        paddingTop: base,
        paddingRight: `calc(${base}px + env(safe-area-inset-right))`,
        paddingLeft: `calc(${base}px + env(safe-area-inset-left))`,
        // Deja sitio bajo el BottomNav fijo + la barra de gestos.
        paddingBottom: pad ? `calc(96px + env(safe-area-inset-bottom))` : 0,
        boxSizing: 'border-box',
        ...style
      }}
    >
      {children}
    </div>
  )
}

// ---------- Overline (label uppercase) ----------
export function Overline({ children, color = colors.hint, style }) {
  return <div style={{ ...font.overline, color, ...style }}>{children}</div>
}

// ---------- Card ----------
export function Card({ children, onClick, style, accent }) {
  const [pressed, setPressed] = useState(false)
  const pressable = !!onClick
  const pressHandlers = pressable
    ? {
        onPointerDown: () => setPressed(true),
        onPointerUp: () => setPressed(false),
        onPointerLeave: () => setPressed(false),
        onPointerCancel: () => setPressed(false)
      }
    : {}
  return (
    <div
      onClick={onClick}
      {...pressHandlers}
      style={{
        background: colors.surface2,
        border: `0.5px solid ${accent || colors.border}`,
        borderRadius: radius.lg,
        padding: space.md,
        cursor: pressable ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
        transition: pressable ? 'transform 120ms ease, background 120ms ease' : undefined,
        ...style,
        // Feedback de press para cards tappables (gana sobre style).
        ...(pressed ? { transform: 'scale(0.985)', background: colors.border } : null)
      }}
    >
      {children}
    </div>
  )
}

// ---------- Botón ----------
export function Button({ children, onClick, variant = 'primary', icon, disabled, type = 'button', style }) {
  const variants = {
    primary: { background: colors.accent, color: colors.accentInk, border: 'none' },
    ghost: { background: 'transparent', color: colors.body, border: `0.5px solid ${colors.border}` },
    surface: { background: colors.surface2, color: colors.body, border: `0.5px solid ${colors.border}` },
    danger: { background: 'transparent', color: colors.danger, border: `0.5px solid ${colors.danger}` }
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        padding: '13px 16px',
        borderRadius: radius.md,
        fontFamily: font.family,
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        ...variants[variant],
        ...style
      }}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  )
}

// ---------- Campo de texto ----------
export function Field({ label, value, onChange, type = 'text', placeholder, ...rest }) {
  return (
    <label style={{ display: 'block', marginBottom: space.md }}>
      {label && <Overline style={{ marginBottom: 6 }}>{label}</Overline>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        {...rest}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: colors.surface,
          border: `0.5px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: '13px 14px',
          color: colors.title,
          fontFamily: font.family,
          fontSize: 15,
          outline: 'none'
        }}
      />
    </label>
  )
}

// ---------- Select ----------
export function Select({ label, value, onChange, options, ...rest }) {
  return (
    <label style={{ display: 'block', marginBottom: space.md }}>
      {label && <Overline style={{ marginBottom: 6 }}>{label}</Overline>}
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            appearance: 'none',
            background: colors.surface,
            border: `0.5px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: '13px 38px 13px 14px',
            color: colors.title,
            fontFamily: font.family,
            fontSize: 15,
            outline: 'none'
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} style={{ background: colors.surface2 }}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          size={18}
          color={colors.muted}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
      </div>
    </label>
  )
}

// ---------- Stat compacto ----------
export function Stat({ label, value, accent, hint }) {
  return (
    <Card style={{ flex: 1, padding: space.md }}>
      <Overline>{label}</Overline>
      <div style={{ ...font.big, fontSize: 30, color: accent || colors.title, marginTop: 6 }}>
        {value}
      </div>
      {hint && <div style={{ ...font.small, color: colors.muted, marginTop: 2 }}>{hint}</div>}
    </Card>
  )
}

// ---------- Avatar de iniciales ----------
export function Avatar({ nombre, size = 44, color }) {
  const initials = (nombre || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius.pill,
        background: colors.surface,
        border: `0.5px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 600,
        color: color || colors.muted,
        flexShrink: 0
      }}
    >
      {initials}
    </div>
  )
}

// ---------- Badge ----------
export function Badge({ children, color = colors.danger, style }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: radius.pill,
        border: `0.5px solid ${color}`,
        color,
        fontSize: 11,
        fontWeight: 600,
        ...style
      }}
    >
      {children}
    </span>
  )
}

// ---------- Anillo de progreso (Score protagonista) ----------
export function Ring({ value, size = 200, stroke = 16, label, sublabel }) {
  const v = Math.max(0, Math.min(100, value || 0))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (v / 100) * c
  const col = scoreColor(v)
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.surface2} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ filter: `drop-shadow(0 0 6px ${col}66)`, transition: 'stroke-dasharray 600ms ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ ...font.hero, fontSize: size * 0.34, color: col }}>{Math.round(v)}</div>
        {label && <Overline style={{ marginTop: 6 }}>{label}</Overline>}
        {sublabel && <div style={{ ...font.small, color: colors.muted, marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
  )
}

// ---------- Barra de progreso fina ----------
export function Bar({ value, color = colors.accent, height = 8 }) {
  const v = Math.max(0, Math.min(100, value || 0))
  return (
    <div style={{ background: colors.surface2, borderRadius: radius.pill, height, overflow: 'hidden' }}>
      <div style={{ width: `${v}%`, height: '100%', background: color, borderRadius: radius.pill }} />
    </div>
  )
}

// ---------- Encabezado de pantalla ----------
export function Header({ title, subtitle, right, onBack }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space.sm,
        marginBottom: space.lg,
        // Empuja el contenido bajo el notch/Dynamic Island; charcoal detrás de la status bar.
        paddingTop: 'env(safe-area-inset-top)',
        backgroundColor: colors.bg
      }}
    >
      {onBack && (
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.body,
            cursor: 'pointer',
            padding: 4,
            marginLeft: -4
          }}
        >
          <Icon name="chevron-left" size={26} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {subtitle && <Overline color={colors.accent}>{subtitle}</Overline>}
        <h1
          style={{
            ...font.title,
            fontSize: 25,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: colors.title,
            margin: subtitle ? '3px 0 0' : 0
          }}
        >
          {title}
        </h1>
      </div>
      {right}
    </div>
  )
}

// ---------- Navegación inferior ----------
export function BottomNav({ items, active, onChange }) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: 520,
        margin: '0 auto',
        // Charcoal translúcido (#0B0B0D al 92%) + blur; el #root charcoal evita franjas blancas.
        background: 'rgba(11,11,13,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: `0.5px solid ${colors.border}`,
        display: 'flex',
        // Safe-area: barra de gestos abajo + notch lateral en landscape.
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      {items.map((it) => {
        const on = it.key === active
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            style={{
              flex: 1,
              minHeight: 44, // área táctil mínima accesible
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: on ? colors.accent : colors.hint,
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            {/* Pill indicador del tab activo (lima sutil) + color lima ícono/label */}
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '6px 16px',
                borderRadius: radius.pill,
                background: on ? 'rgba(216,255,62,0.12)' : 'transparent',
                transition: 'background 150ms ease'
              }}
            >
              <Icon name={it.icon} size={22} />
              <span style={{ fontSize: 10.5, fontWeight: on ? 600 : 400 }}>{it.label}</span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}

// ---------- Bottom sheet / modal ----------
export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          background: colors.surface,
          borderTopLeftRadius: radius.lg,
          borderTopRightRadius: radius.lg,
          borderTop: `0.5px solid ${colors.border}`,
          padding: space.lg,
          // Respeta safe-area abajo (gestos/teclado); arriba nunca invade el notch.
          paddingBottom: `calc(${space.lg}px + env(safe-area-inset-bottom))`,
          maxHeight: `calc(100dvh - env(safe-area-inset-top) - ${space.lg}px)`,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxSizing: 'border-box'
        }}
      >
        {/* Handle visual de bottom-sheet */}
        <div style={{ width: 36, height: 4, borderRadius: radius.pill, background: colors.border, margin: '-4px auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md }}>
          <h2 style={{ ...font.title, fontSize: 21, fontWeight: 700, letterSpacing: '-0.01em', color: colors.title, margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: colors.muted, cursor: 'pointer', padding: 0, lineHeight: 0 }}
          >
            <Icon name="x" size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ---------- Estados vacío / cargando ----------
export function Empty({ icon = 'mood-empty', title, hint, action }) {
  return (
    <div style={{ textAlign: 'center', padding: `${space.xl}px ${space.md}px`, color: colors.muted }}>
      <Icon name={icon} size={40} color={colors.hint} />
      <div style={{ ...font.title, color: colors.body, marginTop: space.md }}>{title}</div>
      {hint && <div style={{ ...font.small, color: colors.muted, marginTop: 6 }}>{hint}</div>}
      {action && <div style={{ marginTop: space.lg }}>{action}</div>}
    </div>
  )
}

export function Loading({ label = 'Cargando…' }) {
  return (
    <div style={{ textAlign: 'center', padding: space.xl, color: colors.muted, ...font.small }}>
      <Icon name="loader-2" size={28} color={colors.accent} />
      <div style={{ marginTop: 8 }}>{label}</div>
    </div>
  )
}

// ---------- Fila simple ----------
export function Row({ children, style }) {
  return <div style={{ display: 'flex', gap: space.sm, ...style }}>{children}</div>
}
