# Seguridad / runbook de rotación

Este repo es **público**. Las credenciales demo fueron **rotadas y blindadas**:
ya **no** están en el código. Viven solo en **GitHub Secrets** y el QA (CI) las usa
desde ahí.

| Credencial | Dónde vive ahora | En el repo |
|---|---|---|
| Email coach | Secret `QA_COACH_EMAIL` (y default `coach@coachpro.app`) | visible (no sensible) |
| Pass coach | Secret `QA_COACH_PASS` | placeholder vacío |
| Tokens de atletas | Secret `QA_TOKEN` (Ana) | placeholder vacío |

`qa/run.mjs` y el workflow usan `process.env.QA_*` / `secrets.QA_*`. Para correr el QA
**local** hay que exportar las variables (`QA_COACH_PASS=… QA_TOKEN=… npm run qa`).
La demo pública dejó de ser logueable por visitantes anónimos (es lo buscado al blindar).

> El script `scripts/rotar-credenciales.mjs` permite **volver a rotar** cuando se quiera
> (lee `SUPABASE_SERVICE_ROLE_KEY` / `NEW_COACH_PASS` de entorno o de `.env.local`).

---

## Runbook: rotar credenciales cuando quieras blindar

Proyecto Supabase: `coachpro` (ref `pmyulpzaqjujdfhrndzx`).

### 1. Rotar la contraseña del coach
Opción simple — **Dashboard**: Supabase → Authentication → Users → `coach@coachpro.app`
→ *Reset / Update password*.

Opción CLI (necesita el **service_role key**, no lo subas al repo):
```bash
curl -X PUT "https://pmyulpzaqjujdfhrndzx.supabase.co/auth/v1/admin/users/<USER_ID>" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"password":"<NUEVA_PASS>"}'
```

### 2. Regenerar los tokens de portal de los atletas
En Supabase → SQL Editor:
```sql
update atletas set token = gen_random_uuid();
select nombre, token from atletas order by nombre;  -- copia el token nuevo de Ana para el QA
```

### 3. Guardar los valores reales como GitHub Secrets
Con el CLI `gh` (te pedirá pegar cada valor):
```bash
gh secret set QA_COACH_EMAIL   # coach@coachpro.app (o el nuevo)
gh secret set QA_COACH_PASS    # la nueva contraseña
gh secret set QA_TOKEN         # el nuevo token de Ana
```
El workflow `qa.yml` ya los consume con `${{ secrets.QA_* || 'default' }}`.

### 4. Quitar los defaults reales de los archivos versionados (opcional)
Si decides cerrar la demo, reemplaza los valores en `qa/run.mjs`, `.github/workflows/qa.yml`
y `QA.md` por placeholders (`<set QA_COACH_PASS>`), y corre el QA local con:
```bash
QA_COACH_EMAIL=… QA_COACH_PASS=… QA_TOKEN=… npm run qa
```

### 5. (Opcional) Proyecto Supabase aislado para la demo
Para no mezclar datos reales con la demo pública, crear un proyecto Supabase separado,
aplicar `supabase/migrations/*` + `supabase/seed.sql`, y apuntar la demo a ese proyecto
con sus propias `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en Vercel.
