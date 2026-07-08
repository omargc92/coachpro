// ============================================================
// Fase A — Configuración del coach: sección Marca
// Logo uploader + color pickers + restaurar defaults
// ============================================================
import { useRef, useState } from 'react'
import { Screen, Header, Card, Button, Overline, Loading, Icon, Field } from '../../lib/ui.jsx'
import { colors, space, font, radius } from '../../lib/theme.js'
import { useActualizarBranding, subirLogo } from '../../lib/queries.js'
import { BRANDING_DEFAULTS } from '../../lib/branding.jsx'
import { usePlan } from '../../lib/usePlan.jsx'

const MAX_BYTES = 3 * 1024 * 1024 // 3 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']

export function Configuracion({ coach }) {
  const branding = useActualizarBranding(coach)
  const { hasFeature, isReadOnly } = usePlan()
  const canUseLogo = hasFeature('ownLogo')
  const canUseColors = hasFeature('customColors')

  const [logoPreview, setLogoPreview] = useState(coach.logo_url || null)
  const [brandName, setBrandName] = useState(coach.brand_name || '')
  const [primary, setPrimary] = useState(coach.brand_primary || BRANDING_DEFAULTS.primary)
  const [accent, setAccent] = useState(coach.brand_accent || BRANDING_DEFAULTS.accent)
  const [logoFile, setLogoFile] = useState(null)
  const [logoError, setLogoError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef()

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError(null)
    // Diagnóstico: qué archivo llegó realmente (tipo/tamaño).
    console.log('[CoachPro] logo seleccionado:', file.name, file.type || '(sin tipo)', file.size + 'B')

    // Acepta por MIME O por extensión: en móvil/algunos orígenes file.type
    // llega vacío o distinto, y la validación estricta por MIME lo descartaba.
    const nombre = (file.name || '').toLowerCase()
    const extOk = /\.(png|jpe?g|svg)$/.test(nombre)
    const typeOk = ALLOWED_TYPES.includes(file.type)
    if (!typeOk && !extOk) {
      setLogoError(`Formato no válido (${file.type || 'desconocido'}). Usa PNG, JPG o SVG.`)
      return
    }
    if (file.size > MAX_BYTES) {
      setLogoError(`La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)} MB. Máximo 1 MB.`)
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      let logo_url = coach.logo_url || null
      if (logoFile) {
        logo_url = await subirLogo(logoFile, coach.id)
      }
      await branding.mutateAsync({
        logo_url,
        brand_name: brandName.trim() || null,
        brand_primary: primary,
        brand_accent: accent
      })
      setSaved(true)
      setLogoFile(null)
    } catch (err) {
      alert('Error al guardar: ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  async function handleRestore() {
    setSaving(true)
    try {
      await branding.mutateAsync({
        logo_url: null,
        brand_name: null,
        brand_primary: null,
        brand_accent: null
      })
      setLogoPreview(null)
      setLogoFile(null)
      setBrandName('')
      setPrimary(BRANDING_DEFAULTS.primary)
      setAccent(BRANDING_DEFAULTS.accent)
      setSaved(true)
    } catch (err) {
      alert('Error: ' + (err.message || err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <Header title="Configuración" />

      <Card style={{ marginBottom: space.lg }}>
        <div style={{ ...font.title, fontSize: 17, fontWeight: 700, color: colors.title, marginBottom: space.md }}>
          Marca
        </div>

        {/* Logo */}
        <Overline style={{ marginBottom: 8 }}>Logo</Overline>
        {!canUseLogo
          ? <LockedFeature label="Logo propio disponible en plan Pro o superior" />
          : (
            <div style={{ display: 'flex', alignItems: 'center', gap: space.md, marginBottom: space.md }}>
              <div
                style={{
                  width: 72, height: 72,
                  borderRadius: radius.md,
                  background: colors.surface,
                  border: `0.5px solid ${colors.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0
                }}
              >
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <Icon name="photo" size={28} color={colors.hint} />
                }
              </div>
              <div style={{ flex: 1 }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  style={{ display: 'none' }}
                  onChange={handleFile}
                />
                <Button
                  variant="ghost"
                  icon="upload"
                  onClick={() => fileRef.current?.click()}
                  style={{ marginBottom: 6 }}
                  disabled={isReadOnly}
                >
                  {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                </Button>
                <div style={{ ...font.small, color: colors.muted }}>PNG, JPG o SVG · máx 3 MB</div>
                {logoError && (
                  <div style={{ ...font.small, color: colors.danger, marginTop: 4 }}>{logoError}</div>
                )}
              </div>
            </div>
          )
        }

        {/* Nombre de la app */}
        {canUseLogo && (
          <div style={{ marginBottom: space.md }}>
            <Field
              label="Nombre de la app"
              value={brandName}
              onChange={setBrandName}
              placeholder="CoachPro"
            />
            <div style={{ ...font.small, color: colors.muted, marginTop: -6 }}>
              Se muestra en el encabezado cuando no hay logo (tu panel y el portal del atleta).
            </div>
          </div>
        )}

        {/* Color primario */}
        {!canUseColors
          ? <LockedFeature label="Colores white-label disponibles en plan Premium" />
          : (
            <>
              <ColorPicker
                label="Color primario"
                value={primary}
                onChange={setPrimary}
                hint="Acentos principales del portal del atleta"
              />
              <ColorPicker
                label="Color de acento"
                value={accent}
                onChange={setAccent}
                hint="Botones y elementos secundarios"
              />
            </>
          )
        }

        {/* Preview en vivo */}
        <div
          style={{
            borderRadius: radius.md,
            border: `0.5px solid ${colors.border}`,
            padding: space.md,
            marginBottom: space.lg,
            background: colors.surface
          }}
        >
          <Overline style={{ marginBottom: 8 }}>Vista previa</Overline>
          <div style={{ display: 'flex', gap: space.sm, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {logoPreview && <img src={logoPreview} alt="" style={{ height: 32, objectFit: 'contain', borderRadius: 4 }} />}
              {(brandName || !logoPreview) && (
                <span style={{ ...font.title, fontSize: 17, color: colors.title }}>{brandName || 'CoachPro'}</span>
              )}
            </div>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: radius.pill,
                background: primary,
                color: '#0B0B0D',
                fontWeight: 600,
                fontSize: 13
              }}
            >
              Primario
            </span>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: radius.pill,
                background: accent,
                color: '#0B0B0D',
                fontWeight: 600,
                fontSize: 13
              }}
            >
              Acento
            </span>
          </div>
        </div>

        {saved && !saving && (
          <div style={{ ...font.small, color: colors.accent, marginBottom: space.md, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="circle-check" size={16} color={colors.accent} />
            Guardado correctamente
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} style={{ marginBottom: space.sm }}>
          {saving ? 'Guardando…' : 'Guardar marca'}
        </Button>

        <Button variant="ghost" onClick={handleRestore} disabled={saving}>
          Restaurar marca por defecto
        </Button>
      </Card>
    </Screen>
  )
}

function LockedFeature({ label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: colors.surface, border: `0.5px solid ${colors.border}`,
      borderRadius: radius.md, padding: `${space.sm}px ${space.md}px`,
      marginBottom: space.md
    }}>
      <Icon name="lock" size={16} color={colors.hint} />
      <span style={{ ...font.small, color: colors.muted }}>{label}</span>
    </div>
  )
}

function ColorPicker({ label, value, onChange, hint }) {
  return (
    <div style={{ marginBottom: space.md }}>
      <Overline style={{ marginBottom: 6 }}>{label}</Overline>
      <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: 44, height: 44,
              padding: 2,
              borderRadius: radius.sm,
              border: `0.5px solid ${colors.border}`,
              background: colors.surface,
              cursor: 'pointer'
            }}
          />
        </div>
        <div>
          <div style={{ ...font.body, color: colors.title, fontFamily: 'monospace' }}>{value}</div>
          {hint && <div style={{ ...font.small, color: colors.muted }}>{hint}</div>}
        </div>
      </div>
    </div>
  )
}
