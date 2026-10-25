# Política de seguridad

## Cómo reportar una vulnerabilidad

**No abras un issue público** para reportar problemas de seguridad.

1. Ve a la pestaña **Security** de este repositorio y usa **Report a vulnerability** (reporte privado de GitHub).
2. Si esa opción no está disponible, escribe directamente a quien administra la organización **lNexapay** por un canal privado.

Incluye, en lo posible:

- Descripción del problema y su impacto.
- Pasos para reproducirlo.
- Versión, rama o commit afectado.
- Sugerencia de solución, si la tienes.

## Qué esperar

- Confirmaremos la recepción lo antes posible.
- Evaluaremos el riesgo y te mantendremos al tanto de la corrección.
- Una vez corregido, podremos documentar el hallazgo en el repositorio.

## Buenas prácticas para quienes contribuyen

- Nunca subas credenciales, tokens, llaves privadas ni archivos `.env`.
- Si un secreto se expuso, **rótalo de inmediato** y avisa al equipo.
- No uses datos reales de personas en pruebas, ejemplos ni capturas.
- Mantén las dependencias actualizadas (Dependabot abre PRs automáticamente).
- Valida y sanea siempre las entradas del usuario.

## Versiones soportadas

Mientras el proyecto esté en desarrollo, solo se da soporte a la rama `main`.
