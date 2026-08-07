# LogID — Arquitectura del Repositorio

**Documento 03: Estructura de código y regla de módulos**

---

## Decisión: repositorio único

Todo LogID vive en un solo repositorio. Razones:

- Se despliega de una en Cloudflare Pages (un solo build, un solo dominio).
- Se muestra como un cuerpo de trabajo unificado en GitHub/LinkedIn.
- Cada módulo sigue siendo autocontenido DENTRO del repo (ver regla abajo).

## Estructura de carpetas

```
logid/
├── index.html                      # Hub: landing del laboratorio, lista los módulos
├── shared/                         # LO ÚNICO compartido entre módulos
│   ├── branding/                   # Logo, colores, fuentes de LogID + empresa ficticia
│   ├── styles/                     # Design tokens comunes (dark, tono cómic/gaming)
│   └── shell/                      # Header/footer/navegación del hub
├── modules/
│   ├── 01-zonas-peligrosas/        # Módulo 1, TODO adentro
│   │   ├── index.html
│   │   ├── logic.js                # Geometría controlada, point-in-polygon, cálculo
│   │   ├── styles.css
│   │   └── data.json               # Datos simulados / defaults
│   └── ...                         # Cada módulo nuevo = una carpeta hermana
├── docs/                           # La enciclopedia (los .md: filosofía, módulos, esta arq.)
└── README.md                       # Presentación del laboratorio
```

## Regla de oro: módulos autocontenidos

Cada carpeta en `modules/` es una app independiente:

- Tiene TODO su código adentro (HTML, JS, CSS, datos).
- NO importa código de otro módulo. NO depende de que otro módulo exista o funcione.
- Lo ÚNICO que consume de afuera es `shared/` (branding, tokens, shell del hub).
- Si borrás un módulo, los demás siguen funcionando. Si uno se rompe, no arrastra a nadie.

Esto es lo que permite crecer sin límite y sin infierno de integración: agregar un módulo
nuevo NUNCA puede romper los viejos, porque no se tocan entre sí.

## Qué es compartido y qué NO

**COMPARTIDO** (vive en `shared/`, lo usan todos):

- Branding de LogID y de la empresa ficticia.
- Design tokens: paleta dark, tipografías, el tono visual cómic/gaming.
- El shell del hub: cómo se ve la navegación entre módulos.

**NO COMPARTIDO** (vive dentro de cada módulo, aislado):

- Toda la lógica de negocio del módulo.
- Sus datos, sus cálculos, sus animaciones, sus mapas.
- Sus dependencias específicas (si el módulo 5 necesitara algo raro, queda en el módulo 5).

## Empresa ficticia: NanoCargo (editable)

NanoCargo es la marca protagonista por defecto. PERO, igual que la calculadora deja al
usuario cargar sus propios números, el branding de empresa es EDITABLE: el usuario puede
reemplazar "NanoCargo" por el nombre de su propia empresa y ver la simulación con SU marca.
Gancho de demo: el que prueba ve "su" logística.

**Implementación**: el nombre de empresa es una variable, no un texto hardcodeado.

## Stack del hub y despliegue

- Hub y shell: HTML/CSS/JS estático (sin framework para el shell — es simple).
- Cada módulo elige SU stack según su problema (ver [Documento 01](01-fundacional.md), mapa
  de tecnología). El módulo 1 es Leaflet + JS vanilla estático. Otros podrán ser React
  estático si el problema lo justifica. Todos deben poder buildearse a estático para
  Cloudflare.
- Despliegue: Cloudflare Pages, un solo build del repo completo.

## Cómo se agrega un módulo nuevo (checklist)

1. Crear carpeta `modules/NN-nombre/` con su `index.html`, logic, styles, data.
2. Que consuma `shared/` para branding y tokens (coherencia visual).
3. Agregar la tarjeta del módulo al hub (`index.html` raíz).
4. NO tocar ningún otro módulo. Si sentís que tenés que tocar otro, algo está mal.
5. Documentar el módulo con su `.md` en `docs/`.
