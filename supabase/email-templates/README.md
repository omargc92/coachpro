# Templates de correo (Supabase Auth)

Templates HTML branded de CoachPro para los correos transaccionales de Auth.

| Archivo | Uso | Config en Supabase Auth |
|---|---|---|
| `confirmation.html` | Confirmación de registro | `mailer_templates_confirmation_content` · asunto `mailer_subjects_confirmation` = "Confirma tu cuenta en CoachPro" |
| `recovery.html` | Reseteo de contraseña | `mailer_templates_recovery_content` · asunto `mailer_subjects_recovery` = "Restablece tu contraseña de CoachPro" |

## Variables
Ambos usan `{{ .ConfirmationURL }}` (el enlace de acción que arma Supabase). Otras disponibles: `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .RedirectTo }}`.

## Cómo se aplican
No hay `supabase/config.toml`; se aplican vía Management API sobre el proyecto `pmyulpzaqjujdfhrndzx`:

```
PATCH https://api.supabase.com/v1/projects/<ref>/config/auth
{ "mailer_templates_confirmation_content": "<html>", "mailer_subjects_confirmation": "...", ... }
```

(o pegarlos en Dashboard → Authentication → Email Templates). Al editar estos archivos, re-aplicar para que producción quede en sync.

## Notas de diseño
- Email-safe: tablas + estilos inline, sin CSS externo ni variables. Tema oscuro CoachPro (fondo `#0B0B0D`, botón lima `#D8FF3E`).
- El logo se referencia desde `https://coachpro.umbraldigital.com.mx/logo.png` (público). Si cambia el dominio, actualizar el `src`.
- Incluyen el enlace en texto como respaldo por si el botón no funciona.
