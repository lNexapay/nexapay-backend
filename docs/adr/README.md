# Registro de decisiones técnicas (ADR)

Un **ADR** (*Architecture Decision Record*) es un documento corto que explica **qué decisión técnica se tomó, por qué y con qué consecuencias**. Sirve para que cualquier persona nueva del equipo entienda el razonamiento sin tener que preguntar.

## Cuándo escribir uno

- Elegir o cambiar un framework, librería clave, base de datos o servicio externo.
- Definir cómo se estructura el código, la autenticación o el manejo de errores.
- Cualquier decisión que sería costosa de revertir o que genera debate.

## Cómo crear uno

1. Copia [`0000-plantilla.md`](0000-plantilla.md) a un archivo nuevo con el siguiente número: `0002-titulo-corto.md`.
2. Complétalo (máximo una página).
3. Ábrelo en un PR para que el equipo lo revise. Estado inicial: `Propuesta`.
4. Al aprobarse el PR, cambia el estado a `Aceptada`.

No se borran ni reescriben ADR antiguos: si una decisión cambia, se crea uno nuevo y el anterior pasa a `Reemplazada por ADR-XXXX`.

## Estados posibles

`Propuesta` · `Aceptada` · `Rechazada` · `Reemplazada`

## Índice

| # | Título | Estado |
|---|--------|--------|
| [0001](0001-registrar-decisiones.md) | Registrar decisiones técnicas como ADR | Aceptada |
