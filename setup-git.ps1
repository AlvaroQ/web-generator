# Script para inicializar git y crear repositorio en GitHub

Write-Host "Inicializando repositorio git..."
git init

Write-Host "Agregando archivos..."
git add .

Write-Host "Creando commit inicial..."
git commit -m "Initial commit: Web generator for project configuration"

Write-Host "Creando repositorio en GitHub..."
gh repo create web-generator --public --source=. --remote=origin --push

Write-Host "¡Completado! Repositorio creado en GitHub."

