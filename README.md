# LogID — Laboratorio de I+D logístico

Laboratorio de I+D aplicada a la cadena de suministro. No es un producto único ni un
ERP: es una colección de **módulos independientes**, cada uno de los cuales agarra un
problema real y concreto de la logística y le construye una solución funcionando.

Empresa ficticia protagonista: **NanoCargo** (nombre editable desde el hub).

## Estructura

```
logid/
├── index.html          # Hub: landing del laboratorio, lista los módulos
├── shared/             # LO ÚNICO compartido entre módulos
│   ├── branding/       # Logo, colores, fuentes de LogID + empresa ficticia
│   ├── styles/         # Design tokens comunes (dark, tono cómic/gaming)
│   ├── particles/      # Partículas de fondo (identidad visual, canvas)
│   └── shell/          # Header/footer/navegación del hub
├── modules/            # Cada módulo nuevo = una carpeta hermana, autocontenida
├── docs/               # La enciclopedia (filosofía, módulos, arquitectura)
└── README.md
```

## Regla de oro: módulos autocontenidos

Cada carpeta en `modules/` es una app independiente: tiene todo su código adentro
(HTML, JS, CSS, datos), no importa código de otro módulo, y lo único que consume de
afuera es `shared/`. Si borrás un módulo, los demás siguen funcionando.

## Cómo se agrega un módulo nuevo

1. Crear `modules/NN-nombre/` con su `index.html`, lógica, estilos y datos.
2. Que consuma `shared/` para branding y tokens.
3. Agregar la tarjeta del módulo al hub (`index.html` raíz, contenedor `#module-grid`).
4. No tocar ningún otro módulo.
5. Documentar el módulo con su `.md` en `docs/`.

## Stack y despliegue

Hub y shell: HTML/CSS/JS estático, sin framework. Cada módulo elige su stack según su
problema, con la condición de poder buildearse a estático. Despliegue: Cloudflare Pages,
un solo build del repo completo.

## Estado

- [x] Estructura del repositorio + shell del hub
- [x] Módulo 01 — Detección temprana de zonas peligrosas
- [x] Capa de identidad visual (partículas, microanimaciones, polígono tech-glow)
