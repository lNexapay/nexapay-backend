# Configuración del repositorio en GitHub

Esta guía es para quien **administra** la organización. Son ajustes que viven en GitHub (no en el código) y hay que hacerlos una vez por repositorio. Marca cada casilla cuando la completes.

## 1. Equipos y permisos

En la organización: **People** → invita a las personas; **Teams** → crea los equipos.

- [ ] Equipo `backend` con rol **Write** en `nexapay-backend`.
- [ ] Equipo `frontend` con rol **Write** en `nexapay-frontend`.
- [ ] Equipo `maintainers` (quienes aprueban y administran) con rol **Maintain** o **Admin** en ambos repos.

Ruta en cada repo: **Settings → Collaborators and teams → Add teams**.

> Si el equipo es pequeño y todos trabajan en ambos repos, puedes usar un solo equipo `devs` con rol Write.

## 2. Proteger la rama `main`

**Settings → Rules → Rulesets → New ruleset → New branch ruleset**

- Name: `protect-main`
- Enforcement status: **Active**
- Target branches: **Include default branch**
- Activa:
  - [ ] **Restrict deletions**
  - [ ] **Block force pushes**
  - [ ] **Require a pull request before merging**
    - Required approvals: **1**
    - [ ] Dismiss stale pull request approvals when new commits are pushed
    - [ ] Require conversation resolution before merging
  - [ ] **Require status checks to pass**
    - Agrega los checks: `CI` (workflow de CI, el nombre del job aparece tras la primera ejecución) y `Conventional Commits`
    - [ ] Require branches to be up to date before merging

> Los checks solo aparecen en la lista cuando el workflow ya corrió al menos una vez. Haz primero el PR de documentación y luego agrega los checks.

Si usas "Branch protection rules" clásico (**Settings → Branches → Add rule**), las opciones equivalentes son las mismas.

## 3. Opciones de merge

**Settings → General → Pull Requests**

- [ ] Allow squash merging (marcado)
  - Default commit message: **Pull request title**
- [ ] Allow merge commits (desmarcado)
- [ ] Allow rebase merging (desmarcado, opcional)
- [ ] **Automatically delete head branches**

## 4. Seguridad

**Settings → Code security** (o *Security*):

- [ ] **Private vulnerability reporting**: habilitado (lo usa [SECURITY.md](../SECURITY.md)).
- [ ] **Dependency graph** y **Dependabot alerts**: habilitados.
- [ ] **Dependabot security updates**: habilitado.
- [ ] **Secret scanning** y **Push protection**: habilitados (disponible gratis en repos públicos).

## 5. Actions

**Settings → Actions → General**

- [ ] Allow all actions and reusable workflows (o limitar a las de GitHub y verificadas).
- [ ] Workflow permissions: **Read repository contents** (los workflows ya declaran lo que necesitan).

## 6. Etiquetas (labels)

Las plantillas de issues usan etiquetas `type: ...`. Créalas una vez con la [GitHub CLI](https://cli.github.com/):

```bash
REPO=lNexapay/nexapay-backend

gh label create "type: bug"       --color D73A4A --description "Algo no funciona"          --repo $REPO --force
gh label create "type: feature"   --color 0E8A16 --description "Nueva funcionalidad"       --repo $REPO --force
gh label create "type: chore"     --color C5DEF5 --description "Mantenimiento y tareas"    --repo $REPO --force
gh label create "type: docs"      --color 0075CA --description "Documentación"             --repo $REPO --force
gh label create "priority: high"  --color B60205 --description "Atender primero"           --repo $REPO --force
gh label create "priority: low"   --color FBCA04 --description "Puede esperar"             --repo $REPO --force
gh label create "status: blocked" --color 000000 --description "Bloqueado por algo externo" --repo $REPO --force
gh label create "good first issue" --color 7057FF --description "Ideal para empezar"       --repo $REPO --force
```

(O créalas a mano en **Issues → Labels**.)

## 7. Metadatos del repo

En la página principal del repo, engranaje junto a **About**:

- [ ] Descripción corta (una línea).
- [ ] Topics: por ejemplo `typescript`, `nodejs`, `express`, `postgresql` (backend) o `react`, `vite`, `typescript` (frontend).

## 8. Tablero del proyecto

**Organización → Projects → New project → Board**

- [ ] Columnas: `Backlog`, `Todo`, `In progress`, `In review`, `Done`.
- [ ] Vincula los repos y agrega los primeros issues (por ejemplo, definir el stack, diseñar el modelo de datos, definir las pantallas).

## 9. Después de aplicar esto

- [ ] Descomentar y completar `.github/CODEOWNERS` con usuarios o equipos reales.
- [ ] Comprobar que el CI y la validación del título del PR corren en un PR de prueba.
