#!/usr/bin/env pwsh
# Script para publicar los 5 tickets de Indumentaria en Jira (Proyecto SCRUM)
# Uso:
#   $env:JIRA_USERNAME = "agusalbo2024@gmail.com"
#   $env:JIRA_API_TOKEN = "<tu-api-token>"
#   pwsh ./scripts/publish-apparel-tickets-jira.ps1

$issuesDir = "C:\Proyectos\punto_de_venta\.scratch\apparel-product-matrix\issues"
$ticketFiles = Get-ChildItem -Path $issuesDir -Filter "*.md" | Sort-Object Name

Write-Host "Iniciando publicacion de $($ticketFiles.Count) tickets en Jira..." -ForegroundColor Cyan

foreach ($file in $ticketFiles) {
    $content = Get-Content $file.FullName -Raw
    $titleLine = ($content -split "`r?`n")[0]
    $summary = $titleLine -replace "^#\s*\d+\s*—\s*", ""
    $moduleName = "Productos"

    Write-Host "Creando ticket: $summary" -ForegroundColor Yellow

    $content | pwsh ./scripts/jira-create.ps1 -Summary $summary -ModuleName $moduleName
}

Write-Host "Todos los tickets han sido procesados." -ForegroundColor Green
