// ============================================================
// Vercel Serverless Function — manifest PWA por atleta.
//   GET /api/manifest?token=<token>  →  application/manifest+json
//
// Motivo: al INSTALAR la PWA la app arranca en el start_url del manifest.
// El manifest estático (start_url:'/') abre el login del coach, y recuperar
// el token de localStorage falla en iOS (la app instalada usa un
// almacenamiento separado de Safari). Reescribir el manifest a un blob: en el
// cliente (intento previo) NO lo honra iOS al "Agregar a inicio": sigue usando
// el manifest estático cacheado. Sirviendo un manifest REAL por HTTP con el
// token horneado en start_url/id, la app instalada abre directo en
// /?token=… sin depender del storage ni de detección de standalone.
//
// El <link rel="manifest"> del portal apunta aquí (ver useAthleteManifest);
// iOS/Chrome lo tratan como recurso nuevo (URL distinta) y lo leen fresco.
// ============================================================

// start_url/id resuelven contra el origin (rutas absolutas), así que dan '/'.
// Los íconos DEBEN ser absolutos: si fueran relativos resolverían contra
// /api/ (el manifest vive en /api/manifest) y romperían.
function buildManifest(startUrl) {
  return {
    name: 'CoachPro',
    short_name: 'CoachPro',
    description:
      'Seguimiento de coaching fitness: rutinas, nutrición, asistencia y progreso.',
    lang: 'es',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B0B0D',
    theme_color: '#0B0B0D',
    start_url: startUrl,
    id: startUrl,
    scope: '/',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }
}

export default function handler(req, res) {
  const raw = req.query?.token
  const token = Array.isArray(raw) ? raw[0] : raw

  // Sin token (o inválido) → manifest por defecto: no rompemos la instalación
  // del coach ni de quien entre a la raíz.
  const startUrl =
    typeof token === 'string' && token.length > 0 && token.length <= 256
      ? `/?token=${encodeURIComponent(token)}`
      : '/'

  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8')
  // Sin caché entre atletas distintos; must-revalidate como el manifest estático.
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
  res.status(200).send(JSON.stringify(buildManifest(startUrl)))
}
