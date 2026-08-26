# Avisos de software libre del editor de documentos

El editor de documentos de Dhyrium se ejecuta completamente en el navegador y
en la infraestructura propia. No necesita Tiptap Cloud, servicios de IA,
servidores de colaboración ni conversiones de terceros.

## Canvas Editor

El procesador de documentos paginados usa `@hufe921/canvas-editor` 1.0.0,
publicado bajo licencia MIT. El paquete se compila dentro del frontend de
Dhyrium: no usa CDN, claves, cuentas, límites por usuario ni servidores del
autor. Su motor aporta páginas, regla, encabezados, pies, tablas y comandos de
edición con renderizado Canvas.

Copyright (c) 2022-present, Hufe921

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Tiptap OSS

Los paquetes `@tiptap/*` usados por el editor corresponden a la distribución
de código abierto de Tiptap y se distribuyen bajo licencia MIT. Dhyrium no usa
extensiones Pro ni servicios Cloud de Tiptap.

Copyright (c) 2023-present, Tiptap GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Mammoth.js

El repositorio conserva Mammoth.js 1.12.0, publicado bajo licencia
BSD-2-Clause, para experimentos de conversión no canónicos. H01-WEB bloquea la
importación `.docx`; el runtime editorial actual no descomprime ni convierte el
archivo con Mammoth. Este aviso se mantiene mientras la dependencia o su código
experimental permanezcan distribuidos en el proyecto.

Copyright (c) 2013, Michael Williamson

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## PDF.js

La vista paginada de documentos usa `pdfjs-dist` 5.4.54, la distribución web
de Mozilla PDF.js publicada bajo Apache License 2.0. El paquete, incluido su
Web Worker, se compila y sirve desde Dhyrium; no requiere CDN ni servicios
externos.

Copyright Mozilla Foundation y colaboradores.

La licencia completa se conserva en `node_modules/pdfjs-dist/LICENSE`.

## EMF Converter

La conversión local de imágenes antiguas WMF/EMF incrustadas en documentos
Word utiliza `emf-converter` 2.0.2, publicado bajo licencia Apache-2.0. El
paquete se compila dentro del frontend y rasteriza esos gráficos a PNG usando
el Canvas del navegador, sin enviar el documento a servicios externos.

La licencia completa se conserva en `node_modules/emf-converter/LICENSE` y en
la distribución original del paquete.

## Fuentes Carlito y Caladea

El editor incluye localmente Carlito 5.3.0 y Caladea 5.3.0 mediante Fontsource.
Ambas familias se distribuyen bajo SIL Open Font License 1.1 y se empaquetan
dentro del frontend; el navegador no consulta Google Fonts ni otro servicio
externo para mostrarlas.

Las licencias completas se conservan en `node_modules/@fontsource/carlito` y
`node_modules/@fontsource/caladea`.

## DOMPurify

El HTML producido durante la importacion se limpia localmente con DOMPurify
3.4.13. DOMPurify se distribuye bajo licencia dual Apache-2.0 o MPL-2.0.
Dhyrium no invoca ningun servicio remoto para esta limpieza.

Los demás componentes conservan sus licencias y avisos originales en sus
paquetes. Antes de incorporar una extensión nueva al editor se debe comprobar
que sea OSS y compatible con uso comercial local.

## Fluent UI React y Fluent System Icons

La cinta de opciones utiliza `@fluentui/react-components` 9.x y
`@fluentui/react-icons` 2.x, ambos publicados por Microsoft bajo licencia MIT.
Los paquetes se compilan y distribuyen dentro del frontend de Dhyrium; la
interfaz no descarga iconos, estilos ni componentes desde una CDN durante su
uso.

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
