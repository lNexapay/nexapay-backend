# ADR-0001: Registrar decisiones técnicas como ADR

- **Estado:** Aceptada
- **Fecha:** 2026-10-23
- **Autores:** Equipo NexaPay

## Contexto

El equipo está formado por varias personas que trabajan en repositorios separados (backend y frontend) y el stack todavía se está consolidando. Sin un registro, las decisiones se pierden en chats y reuniones, y se vuelven a discutir.

## Opciones consideradas

1. **No documentar:** cero esfuerzo, pero el contexto se pierde.
2. **Wiki de GitHub:** fácil de editar, pero fuera del flujo de revisión y del repositorio.
3. **ADR en `docs/adr/`:** viven junto al código, se revisan en PR y tienen historial.

## Decisión

Usamos **ADR en Markdown dentro de `docs/adr/`**, con la plantilla `0000-plantilla.md`.

## Consecuencias

- **Positivas:** las decisiones quedan versionadas, revisadas y fáciles de encontrar.
- **Negativas:** requiere un poco de disciplina para escribir los ADR a tiempo.
- **Qué cambia para el equipo:** cuando se tome una decisión técnica relevante, se abre un PR con su ADR.
