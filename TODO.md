# Pendientes / mejoras

Lista viva de cosas a mejorar. El repo es **público** y la demo se deja **abierta a propósito**
por ahora; los puntos de seguridad de abajo son para cuando se quiera blindar.

## 🔐 Seguridad / demo (repo público)
Runbook completo de rotación en **[SECURITY.md](SECURITY.md)**. El código ya soporta
secrets con fallback al default demo, así que rotar no rompe nada. Pendiente de ejecutar:
- [ ] **Rotar credenciales demo** (pass del coach + tokens de atletas) — requiere acceso a Supabase.
- [ ] **Crear los GitHub Secrets** `QA_COACH_EMAIL/PASS/TOKEN` — requiere ajustes del repo.
- [ ] (Opcional) **Proyecto Supabase separado solo para la demo pública**, aislado de datos reales.

## ✨ Funcionalidad (stubs ya marcados en el código)
- [x] **Búsqueda de alimentos** en Nutrición: integrada con Open Food Facts
  (buscar → elegir cantidad en g → rellena descripción y macros escalados).
- [x] Permitir al **coach editar los objetivos de nutrición** del atleta desde el detalle
  (botón "Editar/Definir metas" → sheet con kcal/proteína/carbos/grasas, versionado por fecha).
- [ ] (Opcional) Estimación automática de macros desde la **foto del plato**
  (hoy la foto se guarda y el coach valida a mano).

## 🗄️ Storage
- [ ] Si el bucket `fotos` se vuelve **privado**, servir imágenes con **URLs firmadas**
  (hoy se asume bucket público y URL directa).

## 🧱 Calidad de código
- [x] Eliminado el `setState` en **fase de render** de todos los sheets
  (`Rutinas`, `Catalogo`, `Hoy/RegistrarSerieSheet`, `AsignarSheet`, `ObjetivoSheet`).
  Solución: **montaje condicional** (`{open && <Sheet/>}`) + estado inicial en
  `useState(() => …)`. Más limpio que `useEffect` (sin render extra ni flash de datos viejos).

## ⚙️ CI / mantenimiento
- [ ] Silenciar el warning de **Node 20** en Actions (`actions/*@v4`): optar por Node 24
  (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`) o esperar a que GitHub lo migre.
- [ ] (Opcional) Correr el QA también en **deploys de preview**, no solo producción.

## 🎨 Diseño (opcional)
- [ ] Versión "glifo" simplificada del logo para iconos chicos (192px), ya que el logo
  actual es una foto con detalle que se reduce mucho en tamaños pequeños.
