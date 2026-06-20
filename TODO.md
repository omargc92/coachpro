# Pendientes / mejoras

Lista viva de cosas a mejorar. El repo es **público** y la demo se deja **abierta a propósito**
por ahora; los puntos de seguridad de abajo son para cuando se quiera blindar.

## 🔐 Seguridad / demo (repo público)
- [ ] **Rotar credenciales demo expuestas en el repo** (`README.md`, `QA.md`, `qa/run.mjs`):
  - Cambiar la contraseña del coach (`coach@coachpro.app` / `CoachPro-2026`).
  - Regenerar los tokens de portal de los atletas: `update atletas set token = gen_random_uuid();`
- [ ] **Mover credenciales a GitHub Secrets** (el workflow ya soporta `QA_COACH_EMAIL/PASS/TOKEN`)
  y dejar solo placeholders en los archivos versionados.
- [ ] Considerar un **proyecto Supabase separado solo para la demo pública**, aislado de datos reales.

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
- [ ] Refactorizar los `setState` en **fase de render** de los sheets
  (`Rutinas`, `Catalogo`, `Hoy/RegistrarSerieSheet`, `AsignarSheet`) a `useEffect`.
  Funcionan y convergen, pero es un anti-patrón frágil.

## ⚙️ CI / mantenimiento
- [ ] Silenciar el warning de **Node 20** en Actions (`actions/*@v4`): optar por Node 24
  (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`) o esperar a que GitHub lo migre.
- [ ] (Opcional) Correr el QA también en **deploys de preview**, no solo producción.

## 🎨 Diseño (opcional)
- [ ] Versión "glifo" simplificada del logo para iconos chicos (192px), ya que el logo
  actual es una foto con detalle que se reduce mucho en tamaños pequeños.
