# Seguridad / runbook de rotación

Este repo es **público** y la demo se deja **abierta a propósito**. Las credenciales
demo están versionadas como *defaults* para que el QA y la demo funcionen sin secrets:

| Credencial | Dónde aparece | Valor demo actual |
|---|---|---|
| Email coach | `qa/run.mjs`, `.github/workflows/qa.yml`, `QA.md` | `coach@coachpro.app` |
| Pass coach | idem | `CoachPro-2026` |
| Token atleta (Ana) | idem | `ed866fae-…` |

El código ya está preparado para **secrets**: tanto `qa/run.mjs` (`process.env.QA_*`)
como el workflow (`secrets.QA_* || default`) usan los valores reales si existen, y caen
al default demo si no. Por eso rotar **no rompe nada**: en cuanto definas los secrets,
se usan solos.

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
