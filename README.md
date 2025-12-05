# Generador Web de Configuración

Aplicación web para generar proyectos completos de configuración con iconos, archivos XML y JSON desde un formulario.

## Instalación y Configuración

Para crear el repositorio en GitHub, ejecuta los siguientes comandos desde la carpeta `web-generator`:

```bash
# Inicializar git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Crear commit inicial
git commit -m "Initial commit: Web generator for project configuration"

# Crear repositorio en GitHub y hacer push
gh repo create web-generator --public --source=. --remote=origin --push
```

**Nota:** Asegúrate de tener GitHub CLI instalado y autenticado. Si no lo tienes:
1. Instala GitHub CLI: https://cli.github.com/
2. Autentica: `gh auth login`

## Características

- Formulario completo con todos los campos de configuración
- Generación automática de imágenes desde SVG en múltiples tamaños
- Generación de archivos XML para Android
- Generación de archivos JSON de configuración
- Creación de ZIP con estructura completa del proyecto
- Preview del resultado con icono y screenshots

## Uso

1. Abrir `index.html` en un navegador web moderno
2. Completar todos los campos del formulario
3. Subir un archivo SVG para el icono
4. Hacer clic en "Generar"
5. Ver el preview del resultado
6. Descargar el ZIP generado

## Requisitos

- Navegador moderno con soporte para:
  - Canvas API
  - File API
  - Blob API
  - ES6+

## Estructura generada

El ZIP generado incluye:

```
{environment}{name}/
├── android/
│   ├── drawable/
│   │   └── ic_launcher_background.xml
│   ├── mipmap-anydpi-v26/
│   │   ├── ic_launcher.xml
│   │   └── ic_launcher_round.xml
│   ├── mipmap-mdpi/
│   │   ├── ic_launcher_foreground.webp
│   │   ├── ic_launcher.webp
│   │   └── ic_launcher_round.webp
│   ├── mipmap-hdpi/
│   │   └── ...
│   ├── mipmap-xhdpi/
│   │   └── ...
│   ├── mipmap-xxhdpi/
│   │   └── ...
│   ├── mipmap-xxxhdpi/
│   │   └── ...
│   └── values/
│       └── colors.xml
├── ios/
│   └── AppIcon.appiconset/
│       ├── 1024.png
│       ├── 1024 1.png
│       ├── 1024 2.png
│       └── Contents.json
└── example.json
```

## Tamaños de imágenes

### Android
- mdpi: 48x48px
- hdpi: 72x72px
- xhdpi: 96x96px
- xxhdpi: 144x144px
- xxxhdpi: 192x192px

### iOS
- 1024x1024px (3 variantes: normal, dark, tinted)

## Notas

- Los screenshots se cargan desde la carpeta `../screenshots/` relativa al archivo HTML
- Todas las imágenes se generan en formato WebP para Android
- Las imágenes de iOS se generan en formato PNG

