# Flujo de trabajo con Git

Usamos un flujo simple basado en `main` y ramas cortas por tarea. Es el recomendado para equipos pequeños: poca ceremonia y cambios que llegan rápido.

```
main  ●────●────●────●────●   (siempre estable, protegida)
       \        / \       /
feat/x  ●──●──●    fix/y ●
```

## Reglas

1. `main` siempre debe estar en un estado funcional.
2. **Nadie hace push directo a `main`.** Todo entra por Pull Request.
3. Cada tarea vive en su propia rama, creada desde `main` actualizado.
4. Las ramas son **cortas**: idealmente se integran en 1 a 3 días. Si una tarea es grande, divídela.
5. Todo PR necesita **1 aprobación** y el **CI en verde** antes de integrarse.
6. Se integra con **Squash and merge** y la rama se borra al terminar.

## Paso a paso

### 1. Empezar una tarea

```bash
git checkout main
git pull origin main
git checkout -b feat/nombre-corto
```

### 2. Trabajar y hacer commits

```bash
git add .
git commit -m "feat(auth): agrega validación de correo"
```

Haz commits pequeños y frecuentes. Revisa qué vas a subir con `git status` y `git diff --staged` antes de cada commit para no incluir archivos por accidente (por ejemplo `.env`).

### 3. Mantener tu rama al día

Si `main` avanzó mientras trabajabas:

```bash
git fetch origin
git rebase origin/main
# o, si prefieres no reescribir historial:
git merge origin/main
```

Si hay conflictos, resuélvelos en tu editor, luego `git add <archivo>` y `git rebase --continue`.

### 4. Subir la rama y abrir el PR

```bash
git push -u origin feat/nombre-corto
```

En GitHub, abre el Pull Request hacia `main`, completa la plantilla y enlaza el issue (`Closes #N`). Si todavía no está listo, ábrelo como **Draft**.

### 5. Revisión

- Quien revisa deja comentarios o aprueba.
- Quien abre el PR hace los cambios pedidos con nuevos commits y responde cada comentario.
- Cuando hay aprobación y el CI está en verde, se hace **Squash and merge**.

### 6. Limpiar

```bash
git checkout main
git pull origin main
git branch -d feat/nombre-corto
```

## Convención de commits y ramas

Ver [CONTRIBUTING.md](../CONTRIBUTING.md#nombres-de-ramas). Resumen de tipos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`, `perf`, `ci`, `build`, `revert`.

## Situaciones comunes

**Hice commit en `main` por error (aún sin push):**

```bash
git branch feat/mi-rama      # guarda tu trabajo en una rama nueva
git reset --hard origin/main # devuelve main a como está en el remoto
git checkout feat/mi-rama
```

**Subí un secreto por error:** no basta con borrarlo. Rota la credencial de inmediato y avisa al equipo (ver [SECURITY.md](../SECURITY.md)).

**Corrección urgente en producción (`hotfix`):** ramifica desde `main` con `hotfix/descripcion`, abre el PR marcándolo como urgente y pide revisión directa.

## Qué no hacer

- No uses `git push --force` en ramas compartidas ni en `main`.
- No hagas commits gigantes con cambios sin relación.
- No subas `node_modules`, `dist`, `.env` ni archivos del sistema.
