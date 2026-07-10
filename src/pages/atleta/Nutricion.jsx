// ============================================================
// Portal atleta — NUTRICIÓN (informativo): el coach define las metas de
// macros y el menú del día. El atleta NO registra comidas; solo consulta.
// ============================================================
import { usePortalNutricion, todayISO } from '../../lib/queries.js'
import { Card, Overline, Icon, Loading, Empty } from '../../lib/ui.jsx'
import { colors, space, font } from '../../lib/theme.js'

export function Nutricion({ token }) {
  const hoy = todayISO()
  const { data, isLoading } = usePortalNutricion(token, hoy)

  if (isLoading) return <Loading label="Cargando nutrición…" />

  const objetivo = data?.objetivo
  const menu = data?.menu

  if (!objetivo && !menu)
    return <Empty icon="salad" title="Sin plan de nutrición" hint="Tu coach aún no define tus macros ni tu menú." />

  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: space.md }}>
        <Overline color={colors.accent}>Tu nutrición de hoy</Overline>
      </div>

      {/* Metas de macros (definidas por el coach, solo informativas) */}
      {objetivo && (
        <>
          <Overline style={{ marginBottom: space.sm }}>Metas del día</Overline>
          <Card style={{ marginBottom: space.lg }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: space.md }}>
              <MacroMeta label="Calorías" v={objetivo.kcal} unit="kcal" color={colors.info} />
              <MacroMeta label="Proteína" v={objetivo.proteina_g} unit="g" color={colors.accent} />
              <MacroMeta label="Carbos" v={objetivo.carbos_g} unit="g" color={colors.muted} />
              <MacroMeta label="Grasas" v={objetivo.grasas_g} unit="g" color={colors.muted} />
            </div>
          </Card>
        </>
      )}

      {/* Menú del día (texto libre escrito por el coach) */}
      <Overline style={{ marginBottom: space.sm }}>Menú del día</Overline>
      {menu ? (
        <Card style={{ marginBottom: space.lg, display: 'flex', gap: space.sm, alignItems: 'flex-start' }}>
          <Icon name="bowl" size={20} color={colors.accent} style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ ...font.body, color: colors.body, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{menu}</div>
        </Card>
      ) : (
        <Empty icon="bowl" title="Sin menú por ahora" hint="Tu coach aún no cargó el menú de hoy." />
      )}

      <div style={{ ...font.small, color: colors.hint, textAlign: 'center', marginTop: space.sm }}>
        Tu coach arma tu menú y tus metas. Cualquier ajuste, escríbele.
      </div>
    </>
  )
}

function MacroMeta({ label, v, unit, color }) {
  return (
    <div style={{ flex: '1 1 40%', minWidth: 110 }}>
      <Overline>{label}</Overline>
      <div style={{ ...font.number, fontSize: 24, color: colors.title, marginTop: 2 }}>
        {v ?? '—'}
        <span style={{ ...font.small, color, marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  )
}
