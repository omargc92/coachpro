# 📋 Checklist de QA — CoachPro

**App:** https://coachpro-livid.vercel.app
**Coach:** `coach@coachpro.app` / `CoachPro-2026`
**Atleta (Ana):** `/?token=ed866fae-d554-44b6-a98b-0df2c329e307`
**Atleta (Luis):** `/?token=d9faa07a-bd14-4676-88b6-b0b13e7c4fd1`
**Atleta (Marta):** `/?token=52751f5a-6c82-495a-aa4f-f713153e8134`

> ⚠️ **Dependencia de fecha:** El Score y la rutina del día dependen del día de la semana. La rutina *Full Body A* está asignada a **Lun/Mié/Vie**. En Mar/Jue/Sáb/Dom **no hay rutina** → el portal "Hoy" muestra "Día de descanso" y el sub-score de rutina no penaliza (sube el Score). Anota qué día corres el QA.
>
> ⚠️ Es un entorno **demo con datos sembrados**. Escribir/registrar desde QA **modifica datos reales** del proyecto Supabase. La contraseña del coach es de demo: cámbiala tras el QA.

Convención: marca **PASS / FAIL** y anota observación + severidad (🔴 bloqueante / 🟠 mayor / 🟡 menor).

---

## 1. Login del coach (auth)
| # | Paso | Resultado esperado |
|---|---|---|
| 1.1 | Abrir la URL raíz | Pantalla login: logo rayo lima, "CoachPro", "Panel del entrenador", campos Email/Contraseña |
| 1.2 | Botón "Entrar" con campos vacíos | Deshabilitado (lima a ~50% opacidad), no hace nada |
| 1.3 | Email + password **incorrectos** → Entrar | Mensaje de error en naranja (credenciales inválidas), no entra |
| 1.4 | Credenciales correctas → Entrar | Entra al panel; aparece header "Atletas" y "Hola, Entrenador Demo" |
| 1.5 | Toggle "¿Primera vez? Crear cuenta" | Cambia el formulario a modo alta (texto del botón → "Crear cuenta") |
| 1.6 | Recargar la página estando logueado | Mantiene sesión (no vuelve al login) |
| 1.7 | Icono salir (esquina sup. der.) | Cierra sesión y vuelve al login |

## 2. Coach — Home "Atletas"
| # | Paso | Resultado esperado |
|---|---|---|
| 2.1 | Ver tarjetas de stats | **Atletas** = nº activos, **Hoy en gym** (lima) = quienes registraron hoy, **En riesgo** (naranja) = con ≥3 días sin registrar |
| 2.2 | Orden de la lista | Descendente por **Score** (mayor arriba) |
| 2.3 | Color del score | ≥75 lima · 50–74 blanco · <50 naranja |
| 2.4 | Avatar | Iniciales correctas (p. ej. "AR" para Ana Reyes) |
| 2.5 | Subtítulo de cada atleta | "{Objetivo} · Semana {n}" (Ana ≈ Semana 6, Luis ≈ 13, Marta ≈ 3) |
| 2.6 | Badge de riesgo | **Marta** muestra "⚠ {n}d" (no registra; ~15d). Ana/Luis sin badge |
| 2.7 | "Nuevo atleta" → llenar nombre → Crear | Se cierra el sheet y el atleta nuevo aparece en la lista (score 0 o 100 según día) |
| 2.8 | Crear atleta **sin nombre** | Botón "Crear" deshabilitado |
| 2.9 | Tap en una tarjeta | Abre el Detalle de ese atleta |
| 2.10 | Icono pesa (header) | Abre el Catálogo |

## 3. Coach — Detalle de atleta (abrir **Ana Reyes**)
| # | Paso | Resultado esperado |
|---|---|---|
| 3.1 | Header | "Ana Reyes", overline "Pérdida de grasa", flecha atrás funciona |
| 3.2 | Mediciones | Peso actual **68.9 kg**, Cambio **−3.1 kg** (lima), Grasa **28.4%** |
| 3.3 | Gráfica (Recharts) | Línea lima descendente con 4 puntos (73→68.9), tooltip al pasar/tocar |
| 3.4 | Rutina asignada | 3 filas con badges **Lun / Mié / Vie** = "Full Body A" |
| 3.5 | Adherencia nutricional · hoy | Proteína 78/130 (lima), Calorías 1000/1700 (azul), Carbos 105/150, Grasas 26/55 — barras proporcionales |
| 3.6 | Asistencias recientes | Chips con fechas (Ana tiene hoy, −2, −4) |
| 3.7 | "Copiar link del portal" | Cambia a "Link copiado" ~2s; el portapapeles trae `/?token=...` de Ana |
| 3.8 | Abrir **Luis** | Gráfica ascendente (78→81), Cambio **+1.0 kg** mostrado en azul |
| 3.9 | Abrir **Marta** | Sin asistencias / pocos datos; no rompe la vista |

## 4. Coach — Catálogo de ejercicios
| # | Paso | Resultado esperado |
|---|---|---|
| 4.1 | Ver lista | 8 ejercicios agrupados por grupo muscular (Pecho, Espalda, Piernas, Brazos, Core) |
| 4.2 | "+" (header) → crear | Sheet con Nombre, Grupo (select), URL opcional |
| 4.3 | Guardar nuevo ejercicio | Aparece en su grupo correspondiente |
| 4.4 | Tap en un ejercicio → editar campos → Guardar | Cambios reflejados en la lista |
| 4.5 | Editar → "Eliminar" → confirmar | Desaparece de la lista |
| 4.6 | Crear sin nombre | Botón Guardar deshabilitado |

## 5. Coach — Rutinas (builder + asignación)
| # | Paso | Resultado esperado |
|---|---|---|
| 5.1 | Ver lista | "Full Body A · 6 ejercicios" |
| 5.2 | "+" → nueva rutina → "Crear y editar" | Crea y abre el builder de la rutina nueva |
| 5.3 | Abrir Full Body A | 6 ejercicios en orden con "series×reps · peso · descanso" |
| 5.4 | Flechas ↑/↓ en un ejercicio | Reordena y persiste (recargar mantiene el orden) |
| 5.5 | Tap ejercicio → editar series/reps/peso → Guardar | Refleja los nuevos valores |
| 5.6 | "Agregar ejercicio" | Sheet: select del catálogo + series/reps/peso/descanso; al agregar aparece al final |
| 5.7 | Icono basura en ejercicio | Lo quita de la rutina |
| 5.8 | "Asignar a atleta" → elegir atleta + día → Asignar | Aparece en "Asignada a" con badge del día |
| 5.9 | Quitar asignación (x) | Desaparece de "Asignada a" |
| 5.10 | "Eliminar rutina" → confirmar | Vuelve a la lista sin esa rutina |

## 6. Coach — Agenda
| # | Paso | Resultado esperado |
|---|---|---|
| 6.1 | Subtítulo | "Hoy · {día}" correcto |
| 6.2 | Si hoy es Lun/Mié/Vie | Atletas con Full Body A bajo "Entrenan hoy" con estado (Pendiente naranja / En curso azul / Completada lima) |
| 6.3 | Si hoy es día de descanso | Atletas bajo "Descanso" con "Día de descanso" |
| 6.4 | Estado tras registrar sets (ver §8) | El atleta pasa a "En curso"/"Completada" al recargar Agenda |

## 7. Coach — Chat
| # | Paso | Resultado esperado |
|---|---|---|
| 7.1 | Lista de conversaciones | Atletas con último mensaje; **Marta** con badge de no leídos (1) |
| 7.2 | Abrir hilo de Ana | Mensajes existentes: coach "¡Bien la semana!…" + atleta "Listo, hoy lo pruebo 💪" |
| 7.3 | Enviar un mensaje | Aparece como burbuja lima a la derecha, al instante |
| 7.4 | Volver a conversaciones | El último mensaje refleja lo enviado ("Tú: …") |
| 7.5 | Abrir hilo de Marta | Al abrir, su badge de no leídos desaparece (se marcan leídos) |

## 8. Atleta — "Hoy" (link de Ana) — feature estrella
| # | Paso | Resultado esperado |
|---|---|---|
| 8.1 | Cargar portal | Anillo de **Score** protagonista, color por umbral; "Hola, Ana" |
| 8.2 | Racha | "🔥 {n} días de racha (≥70)" |
| 8.3 | Mini-stats | Asistencia (✓ lima si registró), Rutina **{hechos}/20**, Comida **{%}** (proteína: 78/130 → 60%) |
| 8.4 | Marcar asistencia (si no aparece ✓) | Botón "Marcar asistencia" desaparece y mini-stat de asistencia pasa a ✓; Score sube |
| 8.5 | Rutina del día | Tarjetas de los 6 ejercicios con "series×reps · peso" y **dots** de series |
| 8.6 | Tocar el dot "1" (lima) | Se marca ✓ (lima); el siguiente dot pasa a ser el activo; mini-stat Rutina sube (p. ej. 1/20) |
| 8.7 | Completar todas las series de un ejercicio | Tarjeta muestra ✓ y borde lima; Score sube |
| 8.8 | "Registrar serie" (sheet) | Permite elegir ejercicio, ver "Serie N de M", capturar reps/peso y registrar |
| 8.9 | Botón cámara "Foto" | Lleva a la pestaña Nutrición |
| 8.10 | Recargar | Los sets registrados persisten (dots siguen en ✓) |
| 8.11 | Día de descanso (Mar/Jue/Sáb/Dom) | "Día de descanso", sin tarjetas de ejercicio; "Registrar serie" deshabilitado |

## 9. Atleta — Nutrición
| # | Paso | Resultado esperado |
|---|---|---|
| 9.1 | Anillo protagonista | "Proteína de hoy" → 78/130 g (≈60%) |
| 9.2 | Barras de macros | Calorías 1000/1700 (azul), Proteína (lima), Carbos, Grasas |
| 9.3 | Tarjeta de sugerencia | "Te quedan **700 kcal** y **52 g** de proteína para hoy" (meta − consumido) |
| 9.4 | Comidas por momento | Desayuno "Avena con claras y fruta" (380/30P), Comida "Pollo, arroz y ensalada" (620/48P) |
| 9.5 | "Agregar" → llenar macros → Guardar | Nueva comida aparece bajo su momento; barras/anillo/sugerencia se recalculan |
| 9.6 | "Buscar alimento" | Muestra aviso "próximamente" (stub) |
| 9.7 | "Foto del plato" → elegir imagen | Sube a Storage, abre el sheet con la foto precargada; al guardar, la comida muestra miniatura |
| 9.8 | Verificación de Storage | La foto carga vía URL pública (no rota / no 403) |

## 10. Atleta — Progreso
| # | Paso | Resultado esperado |
|---|---|---|
| 10.1 | Pestaña por defecto "Peso" | Gráfica lima 72→68.9; Peso actual 68.9, Cambio −3.1 (lima) |
| 10.2 | Cambiar a "Grasa" | Gráfica con datos de grasa (31→28.4) |
| 10.3 | Cambiar a "Cintura" | Gráfica de cintura |
| 10.4 | Historial | Lista descendente por fecha con peso y % grasa |

## 11. Atleta — Chat
| # | Paso | Resultado esperado |
|---|---|---|
| 11.1 | Ver hilo | Mensajes del coach (gris, izq.) y del atleta (lima, der.) |
| 11.2 | Enviar mensaje | Aparece a la derecha al instante; scroll baja al final |
| 11.3 | Cruzar con el coach | Lo enviado aquí aparece en el chat del coach (y viceversa, con refetch ~15s) |

## 12. PWA / instalación
| # | Paso | Resultado esperado |
|---|---|---|
| 12.1 | Lighthouse → PWA (desktop) | Pasa "Installable" |
| 12.2 | `/manifest.webmanifest` | 200, name "CoachPro", display standalone, theme/background `#0B0B0D`, 3 iconos |
| 12.3 | `/sw.js` | 200, service worker registrado |
| 12.4 | Banner de instalación (portal atleta, Chrome) | Aparece banner discreto "Instala CoachPro"; "Instalar" dispara el prompt; "x" lo descarta y no reaparece |
| 12.5 | iOS Safari | Sin banner de Chrome; muestra instrucción "Compartir → Agregar a inicio" |
| 12.6 | Instalada en móvil | Abre en pantalla completa (sin barra del navegador), status bar integrada con el carbón |
| 12.7 | Offline básico | Con la app cargada, modo avión: el shell carga y muestra última data cacheada (no pantalla en blanco) |

## 13. Seguridad / RLS
| # | Paso | Resultado esperado |
|---|---|---|
| 13.1 | `/?token=00000000-0000-0000-0000-000000000000` | "Link inválido / Pide a tu coach un nuevo enlace" |
| 13.2 | Portal de Ana | Solo datos de Ana (no se filtran otros atletas) |
| 13.3 | Sin sesión, intentar ver panel del coach | Redirige a login |
| 13.4 | (Técnico) `GET /rest/v1/atletas` con anon key | Devuelve `[]` (RLS bloquea acceso directo a tablas) |

## 14. Diseño / responsive
| # | Paso | Resultado esperado |
|---|---|---|
| 14.1 | Identidad | Un solo acento lima por pantalla; sin gradientes ni sombras decorativas |
| 14.2 | Tipografía | Números grandes con tracking negativo (scores, pesos); overlines uppercase |
| 14.3 | Mobile (≤430px) | Layout correcto, nav inferior fija respeta el notch (safe-area) |
| 14.4 | Desktop ancho | Contenido centrado, máx ~520px (no se estira) |
| 14.5 | Áreas táctiles | Dots de series, botones y nav cómodos de tocar |

---

### Reporte sugerido
Por cada FAIL: **pantalla · paso (#) · esperado vs. observado · severidad · captura · pasos para reproducir.**

### Datos de referencia del seed
- **Atletas:** Ana Reyes (pérdida de grasa, ~sem 6), Luis Mora (hipertrofia, ~sem 13), Marta Díaz (recomposición, ~sem 3).
- **Rutina Full Body A** (20 series totales): Sentadilla 4×8·60kg · Press banca 4×8·40kg · Remo con barra 3×10·35kg · Jalón al pecho 3×12·45kg · Curl bíceps 3×12·12kg · Plancha 3×1.
- **Metas de nutrición Ana:** 1700 kcal · 130 P · 150 C · 55 G. Consumido hoy: 1000 kcal · 78 P.
- **Mediciones Ana:** 72 → 70.8 → 69.6 → 68.9 kg (grasa 31 → 28.4 %).
