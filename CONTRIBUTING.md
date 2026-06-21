# Contribuir a CoachPro

Guía de trabajo para el equipo. Para arrancar el proyecto ver [README.md](README.md);
para entender el sistema ver [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Flujo de trabajo (Git)

`main` está **protegido**: no se puede pushear directo. Todo entra por **Pull Request**.

```bash
# 1. Parte siempre de main actualizado
git checkout main && git pull origin main

# 2. Rama por cambio
git checkout -b <tipo>/<descripcion-corta>

# 3. Commitea (ver convención abajo) y sube
git push -u origin <tipo>/<descripcion-corta>

# 4. Abre el PR contra main
gh pr create --base main
```

- **Nombres de rama:** `feat/…`, `fix/…`, `docs/…`, `chore/…`, `refactor/…`.
- **Una rama = un tema.** PRs chicos y enfocados se revisan mejor.
- El **PR necesita aprobación** y que pase el check **`qa`** (Playwright) antes de mergear.
- Usa **auto-merge** para que entre en cuanto QA pase sin babysitting:
  `gh pr merge <n> --auto --merge`.
- Borra la rama tras el merge (`git push origin --delete <rama>`).

## Convención de commits

Estilo [Conventional Commits](https://www.conventionalcommits.org/), en español:

```
<tipo>(<área>): <resumen en imperativo>

<cuerpo opcional: qué y por qué>
```

`feat` · `fix` · `docs` · `refactor` · `chore` · `security` · `test`. Ejemplos:
`feat(planes): tarjeta de upsell en el header` · `fix(api): macros como ESM`.

## Revisión de PRs

Revisa **antes de mergear**, sobre todo si el PR toca:
- 💳 **Pagos / Stripe** (Edge Functions, webhook) — que el webhook valide firma.
- 🔐 **RLS / migraciones** — que no se abran datos ni se rompan políticas existentes.
- 📦 **Dependencias** (`package.json`) — paquetes reputados, sin sorpresas.

---

## Estándares de código

- **JSX sin TypeScript.** Sigue el estilo del archivo vecino (naming, densidad de comentarios).
- **Estilos 100% inline** con los tokens de [`src/lib/theme.js`](src/lib/theme.js). Sin Tailwind
  ni CSS modules. Componentes reutilizables en [`src/lib/ui.jsx`](src/lib/ui.jsx) — ver [DESIGN.md](DESIGN.md).
- **Datos** vía TanStack Query (`src/lib/queries.js`). No llames a Supabase suelto desde una vista.
- **Nada de `setState` en fase de render** (montaje condicional + `useState(() => …)`).
- Antes de subir: `npm run build` debe pasar.

## Migraciones (SQL)

- Una migración nueva = archivo numerado en `supabase/migrations/` (`000N_descripcion.sql`).
- **Hazlas idempotentes** cuando se pueda (`if not exists`, `create or replace`,
  `drop policy if exists`) para poder re-aplicar sin romper.
- Si tocas límites de plan, actualiza **también** [`src/lib/plans.js`](src/lib/plans.js)
  (los números están duplicados a propósito; mantenerlos en sync).
- Refleja el cambio en `EJECUTAR_EN_SUPABASE.sql` si aplica a un deploy nuevo.

---

## Seguridad — reglas duras

- **Nunca** commitees secretos. `.env` / `.env.local` están en `.gitignore`; mantenlos así.
- El repo es **público**: las credenciales demo viven en **GitHub Secrets**, no en el código
  (ver [SECURITY.md](SECURITY.md)).
- Llaves sensibles (`service_role`, `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`) van **solo** en
  los *secrets* de Supabase / env de Vercel. Si una se expone, **rótala**.
- ¿Tocaste el portal del atleta? Revalida el token y acota al `atleta_id` (ver §4.2 de ARCHITECTURE).

## Cuenta de GitHub

Este repo usa la cuenta **omargc92**. Si tienes un `GITHUB_TOKEN` inválido en el entorno,
antepón `env -u GITHUB_TOKEN` a los comandos `gh`/`git push`.
