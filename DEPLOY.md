# Instrucciones para crear el repositorio en GitHub

## Opción 1: Usando GitHub CLI (recomendado)

Si tienes GitHub CLI instalado y autenticado:

```bash
cd web-generator
git init
git add .
git commit -m "Initial commit: Web generator for project configuration"
gh repo create web-generator --public --source=. --remote=origin --push
```

## Opción 2: Crear repositorio manualmente en GitHub

1. Ve a https://github.com/new
2. Crea un nuevo repositorio llamado `web-generator` (público)
3. **NO** inicialices con README, .gitignore o licencia
4. Ejecuta estos comandos:

```bash
cd web-generator
git init
git add .
git commit -m "Initial commit: Web generator for project configuration"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/web-generator.git
git push -u origin main
```

Reemplaza `TU_USUARIO` con tu nombre de usuario de GitHub.

## Verificar instalación de GitHub CLI

```bash
gh --version
gh auth status
```

Si no está instalado, descárgalo desde: https://cli.github.com/

