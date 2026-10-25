# Guía de contribución

Gracias por colaborar en **nexapay-backend**. Este documento explica cómo trabajamos para mantener el código ordenado y estable.

## Antes de empezar

1. Lee el [README](README.md) y [docs/getting-started.md](docs/getting-started.md) para dejar el proyecto corriendo en tu máquina.
2. Revisa los Issues y el tablero de Projects de la organización y elige (o pide) una tarea.
3. Si la tarea no está clara, comenta en el issue **antes** de empezar a programar.

## Flujo de trabajo

Resumen (el detalle está en [docs/git-workflow.md](docs/git-workflow.md)):

1. Actualiza tu copia: `git checkout main && git pull`.
2. Crea una rama desde `main`: `git checkout -b feat/nombre-corto`.
3. Haz commits pequeños y con mensajes claros.
4. Sube la rama: `git push -u origin feat/nombre-corto`.
5. Abre un Pull Request hacia `main` y completa la plantilla.
6. Espera la aprobación de al menos **1 persona** y que el CI esté en verde.
7. Haz *Squash and merge* y borra la rama.

> Nadie hace push directo a `main`. La rama está protegida (ver [docs/repo-settings.md](docs/repo-settings.md)).

## Nombres de ramas

`<tipo>/<descripcion-corta-en-minusculas>`

| Tipo | Uso |
|------|-----|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de errores |
| `chore` | Mantenimiento, configuración, CI, dependencias |
| `docs` | Solo documentación |
| `refactor` | Cambios internos sin alterar el comportamiento |
| `test` | Agregar o corregir pruebas |
| `hotfix` | Corrección urgente |

Ejemplos: `feat/login-usuario`, `fix/error-saldo-negativo`, `chore/ci-and-docs`.

## Mensajes de commit

Usamos [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/):

```
<tipo>(<alcance opcional>): <descripción en imperativo>
```

Ejemplos:

```
feat(auth): agrega inicio de sesión con correo
fix(wallet): corrige cálculo del saldo disponible
docs: actualiza guía de instalación
chore(ci): agrega workflow de validación
```

## Pull Requests

- Un PR = un propósito. No mezcles cambios que no estén relacionados.
- El **título** del PR sigue el mismo formato que los commits (el CI lo valida). Como hacemos *Squash and merge*, ese título será el mensaje final en `main`.
- Enlaza el issue: `Closes #12`.
- Incluye capturas, ejemplos de petición/respuesta o resultados de pruebas cuando aplique.
- Mantén el PR pequeño (idealmente menos de ~400 líneas cambiadas).
- Quien abre el PR responde los comentarios y marca las conversaciones como resueltas.
- Si el PR aún no está listo para revisión, ábrelo como **Draft**.

## Revisión de código

Quien revisa verifica:

- [ ] Cumple lo pedido en el issue.
- [ ] Es legible y sigue las [convenciones](docs/conventions.md).
- [ ] Tiene pruebas o evidencia de que funciona.
- [ ] No expone secretos ni datos sensibles.
- [ ] El CI pasa.

Sé amable y específico: se critica el código, no a la persona. Intenta revisar en menos de 24 horas.

## Seguridad y secretos

- **Nunca** subas `.env`, llaves, tokens ni contraseñas. Usa `.env.example` con valores de ejemplo.
- Si subes un secreto por error, avisa de inmediato: hay que **rotarlo**; borrarlo del historial no basta.
- Reporta vulnerabilidades como indica [SECURITY.md](SECURITY.md), no en un issue público.

## Decisiones técnicas

Las decisiones importantes (framework, base de datos, librerías clave, cambios de arquitectura) se registran como ADR en [docs/adr](docs/adr/README.md).

## Código de conducta

Al participar aceptas cumplir el [Código de Conducta](CODE_OF_CONDUCT.md).
