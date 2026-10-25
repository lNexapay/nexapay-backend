# Documentación de nexapay-backend

Índice de la documentación técnica y de equipo.

## Para empezar

- [Primeros pasos](getting-started.md): instalar, configurar y correr el proyecto.
- [Flujo de trabajo con Git](git-workflow.md): ramas, commits y Pull Requests.
- [Convenciones de código](conventions.md): estilo y buenas prácticas.

## Diseño del sistema

- [Arquitectura](architecture.md): cómo está organizado el proyecto.
- [Base de datos y migraciones](database.md): esquema y flujo de migraciones.
- [Convenciones de la API](api.md): contrato entre backend y frontend y lista de endpoints.
- [Autenticación (AUTH_API)](AUTH_API.md): endpoints de sesión con ejemplos para React.
- [Decisiones técnicas (ADR)](adr/README.md): registro de decisiones importantes.

## Administración del repositorio

- [Configuración del repositorio](repo-settings.md): protección de ramas, equipos, etiquetas y seguridad en GitHub.

## Otros documentos

- [CONTRIBUTING](../CONTRIBUTING.md)
- [Código de Conducta](../CODE_OF_CONDUCT.md)
- [Política de seguridad](../SECURITY.md)

## Mantener esta documentación

- Si cambias algo que afecta a otras personas (variables de entorno, comandos, estructura), actualiza la documentación **en el mismo PR**.
- Si una decisión es importante, regístrala como ADR.
- Los documentos deben ser cortos y accionables. Si algo está desactualizado, corrígelo o abre un issue.
