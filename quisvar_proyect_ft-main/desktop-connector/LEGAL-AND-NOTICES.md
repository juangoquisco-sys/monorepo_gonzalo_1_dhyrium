# Licencia, procedencia y avisos

## Decisión tomada

Dhyrium Desktop se implementa desde cero como un proceso separado que usa las
API propias de Dhyrium. No incorpora código fuente, binarios, recursos
visuales, traducciones, nombres, iconos ni instaladores de Nextcloud.

La idea funcional de abrir un archivo con una aplicación local y sincronizar
sus cambios puede implementarse independientemente. Si se copiara código de
Nextcloud, la separación de procesos no eliminaría sus obligaciones de
licencia; por eso este proyecto no lo reutiliza.

## Referencias de licencia verificadas

- Nextcloud Desktop declara GPL-2.0-or-later:
  https://github.com/nextcloud/desktop/blob/master/REUSE.toml
- Nextcloud Server declara AGPL-3.0-or-later:
  https://github.com/nextcloud/server/blob/master/COPYING-README

No se deben copiar archivos de esos repositorios a Dhyrium sin revisión legal
y sin cumplir sus licencias aplicables. Esto incluye ejemplos, fragmentos,
recursos de interfaz, archivos de idioma e instaladores.

## Dependencias

Este proyecto usa únicamente bibliotecas de .NET y APIs de Windows; no agrega
paquetes de terceros. Si el instalador final empaqueta el runtime de .NET,
debe conservar los avisos de Microsoft que correspondan a dicho runtime.

Este documento es un control técnico de procedencia, no asesoría legal.
