// ============================================================
// Portal atleta — PROGRESO: gráfica de peso/medidas + historial.
// (Lazy-loaded por Recharts.)
// ============================================================
import { useRef, useState } from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts'
import {
  usePortalProgreso, usePortalFotosProgreso, useAgregarFotoProgreso, subirFoto,
  usePerfilYRutina, usePortalBranding, fetchPortalRutinaSemanal, todayISO
} from '../../lib/queries.js'
import { Card, Overline, Badge, Button, Icon, Loading, Empty, Row } from '../../lib/ui.jsx'
import { colors, space, font, radius } from '../../lib/theme.js'

const METRICAS = [
  { key: 'peso_kg', label: 'Peso', unit: 'kg' },
  { key: 'grasa_pct', label: 'Grasa', unit: '%' },
  { key: 'cintura_cm', label: 'Cintura', unit: 'cm' }
]

export function Progreso({ token }) {
  const { data, isLoading } = usePortalProgreso(token)
  const { data: fotos, isLoading: fotosLoading } = usePortalFotosProgreso(token)
  const { data: perfil } = usePerfilYRutina(token, todayISO())
  const { data: branding } = usePortalBranding(token)
  const agregarFoto = useAgregarFotoProgreso(token)
  const fileRef = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [metrica, setMetrica] = useState('peso_kg')

  async function exportarMiResumen() {
    if (!perfil?.atleta) return
    setExportando(true)
    try {
      const [{ exportarProgresoPDF }, rutina] = await Promise.all([
        import('../../lib/exportPdf.js'),
        fetchPortalRutinaSemanal(token)
      ])
      await exportarProgresoPDF({
        atleta: perfil.atleta,
        mediciones: data ?? [],
        coach: branding || null,
        rutina
      })
    } catch (err) {
      alert('No se pudo generar el PDF: ' + (err.message || err))
    } finally {
      setExportando(false)
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSubiendo(true)
    try {
      const foto_url = await subirFoto(file, 'progreso')
      await agregarFoto.mutateAsync({ foto_url, nota: null })
    } catch (err) {
      alert('No se pudo subir la foto: ' + (err.message || err))
    } finally {
      setSubiendo(false)
    }
  }

  // El export a PDF es feature Premium: solo se muestra si el plan del coach
  // lo habilita (branding.export_pdf). Evita filtrar la feature a otros planes.
  const botonExportar = branding?.export_pdf ? (
    <Button
      variant="surface"
      icon={exportando ? 'loader-2' : 'file-type-pdf'}
      onClick={exportarMiResumen}
      disabled={exportando || !perfil?.atleta}
      style={{ marginBottom: space.lg }}
    >
      {exportando ? 'Generando PDF…' : 'Descargar mi resumen (PDF)'}
    </Button>
  ) : null

  if (isLoading) return <Loading label="Cargando progreso…" />
  if (!data || data.length === 0)
    return (
      <>
        <Empty icon="chart-line" title="Sin mediciones" hint="Tu coach registrará tus mediciones." />
        {botonExportar}
        <FotosProgresoAtleta fotos={fotos} fotosLoading={fotosLoading} fileRef={fileRef} subiendo={subiendo} />
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: 'none' }} />
      </>
    )

  const m = METRICAS.find((x) => x.key === metrica)
  const serie = data.filter((d) => d[metrica] != null).map((d) => ({ fecha: fechaCorta(d.fecha), v: Number(d[metrica]) }))
  const ultima = serie[serie.length - 1]
  const primera = serie[0]
  const delta = serie.length > 1 ? (ultima.v - primera.v).toFixed(1) : null

  return (
    <>
      <Overline color={colors.accent} style={{ marginBottom: space.sm }}>Tu progreso</Overline>

      {/* Selector de métrica */}
      <Row style={{ marginBottom: space.md }}>
        {METRICAS.map((x) => (
          <button
            key={x.key}
            onClick={() => setMetrica(x.key)}
            style={{
              flex: 1,
              background: metrica === x.key ? colors.surface2 : 'transparent',
              border: `0.5px solid ${metrica === x.key ? colors.accent : colors.border}`,
              borderRadius: radius.md,
              color: metrica === x.key ? colors.title : colors.muted,
              padding: '10px 0',
              cursor: 'pointer',
              fontFamily: font.family,
              fontSize: 13,
              fontWeight: 600
            }}
          >
            {x.label}
          </button>
        ))}
      </Row>

      <Card style={{ marginBottom: space.lg }}>
        {serie.length === 0 ? (
          <div style={{ ...font.small, color: colors.muted, textAlign: 'center', padding: space.md }}>
            Sin datos de {m.label.toLowerCase()}.
          </div>
        ) : (
          <>
            <Row style={{ marginBottom: space.sm }}>
              <div style={{ flex: 1 }}>
                <Overline>{m.label} actual</Overline>
                <div style={{ ...font.big, fontSize: 36, color: colors.title }}>
                  {ultima.v}<span style={{ fontSize: 16, color: colors.muted }}> {m.unit}</span>
                </div>
              </div>
              {delta != null && (
                <div style={{ flex: 1 }}>
                  <Overline>Cambio</Overline>
                  <div style={{ ...font.big, fontSize: 36, color: delta <= 0 ? colors.accent : colors.info }}>
                    {delta > 0 ? '+' : ''}{delta}<span style={{ fontSize: 16, color: colors.muted }}> {m.unit}</span>
                  </div>
                </div>
              )}
            </Row>
            <div style={{ height: 170, marginLeft: -8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serie} margin={{ top: 8, right: 18, bottom: 0, left: 6 }}>
                  <XAxis dataKey="fecha" tick={{ fill: colors.hint, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: colors.hint, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    contentStyle={{ background: colors.surface2, border: `0.5px solid ${colors.border}`, borderRadius: radius.sm, color: colors.title, fontSize: 12 }}
                    labelStyle={{ color: colors.muted }}
                  />
                  <Line type="monotone" dataKey="v" stroke={colors.accent} strokeWidth={2.5} dot={{ r: 3, fill: colors.accent }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>

      {/* Historial */}
      <Overline style={{ marginBottom: space.sm }}>Historial</Overline>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.xs, marginBottom: space.xl }}>
        {[...data].reverse().map((d) => (
          <Card key={d.id} style={{ display: 'flex', alignItems: 'center', gap: space.sm, padding: '10px 12px' }}>
            <Badge color={colors.hint} style={{ minWidth: 54, justifyContent: 'center' }}>{fechaCorta(d.fecha)}</Badge>
            <span style={{ ...font.body, color: colors.title }}>{Number(d.peso_kg)} kg</span>
            {d.grasa_pct != null && <span style={{ ...font.small, color: colors.muted }}>· {Number(d.grasa_pct)}% grasa</span>}
          </Card>
        ))}
      </div>

      {botonExportar}

      <FotosProgresoAtleta fotos={fotos} fotosLoading={fotosLoading} fileRef={fileRef} subiendo={subiendo} />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: 'none' }} />
    </>
  )
}

function FotosProgresoAtleta({ fotos, fotosLoading, fileRef, subiendo }) {
  return (
    <>
      <Overline color={colors.accent} style={{ marginBottom: space.sm }}>Fotos de progreso</Overline>
      <Button
        icon={subiendo ? 'loader-2' : 'camera'}
        onClick={() => fileRef.current?.click()}
        disabled={subiendo}
        style={{ marginBottom: space.md }}
      >
        {subiendo ? 'Subiendo…' : 'Agregar foto de progreso'}
      </Button>

      {fotosLoading && <Loading />}
      {!fotosLoading && fotos?.length === 0 && (
        <div style={{ ...font.small, color: colors.muted, textAlign: 'center', marginBottom: space.lg }}>
          Aún no tienes fotos. Tómate una para ver tu evolución.
        </div>
      )}
      {fotos && fotos.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: space.sm,
            overflowX: 'auto',
            paddingBottom: space.sm,
            marginBottom: space.lg,
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {fotos.map((f) => (
            <div key={f.id} style={{ flexShrink: 0, width: 110 }}>
              <img
                src={f.foto_url}
                alt={f.fecha}
                style={{ width: 110, height: 150, objectFit: 'cover', borderRadius: radius.md, display: 'block' }}
              />
              <div style={{ ...font.small, color: colors.muted, marginTop: 4, textAlign: 'center' }}>
                {fechaCorta(f.fecha)}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function fechaCorta(f) {
  const [, m, d] = f.split('-')
  return `${d}/${m}`
}
