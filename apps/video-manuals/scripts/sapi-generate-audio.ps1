#Requires -Version 5.1
# Genera audio TTS con SAPI (Windows Speech API) para un tutorial dado.
# Lee los IDs y narraciones de public/tutorials/<id>/script.yaml,
# sintetiza cada paso con la voz Helena (es-ES), guarda WAV temporal
# y convierte a MP3 con ffmpeg (hoisted desde apps/video-manuals).

param(
    [Parameter(Mandatory=$true)]
    [string]$TutorialId
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
Add-Type -AssemblyName System.Globalization

# Paths
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }
$monorepoRoot = (Resolve-Path "$scriptDir/../../..").Path
$tutorialDir  = "$appsVmRoot/public/tutorials/$TutorialId"
$audioDir     = "$tutorialDir/audio"
$tmpDir       = Join-Path $env:TEMP "sapi-tts-$TutorialId-$(Get-Random)"

if (-not (Test-Path -LiteralPath $audioDir)) {
    Write-Error "No existe el directorio de audio: $audioDir"
    exit 1
}
New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null

$scriptYaml = Join-Path $tutorialDir 'script.yaml'
if (-not (Test-Path -LiteralPath $scriptYaml)) {
    Write-Error "No existe script.yaml: $scriptYaml"
    exit 1
}

# Verificar voz Helena disponible
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$helena = $synth.GetInstalledVoices() | Where-Object {
    $_.Enabled -and $_.VoiceInfo.Name -like '*Helena*'
} | Select-Object -First 1
if (-not $helena) {
    Write-Error "Voz Helena (es-ES) no disponible. Voces habilitadas:"
    $synth.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object {
        Write-Host " - $($_.VoiceInfo.Name) ($($_.VoiceInfo.Culture))"
    }
    exit 1
}
$synth.SelectVoice($helena.VoiceInfo.Name)
# Rate: default es 0 (-10..10). Subimos un poco para tutoriales (mas natural).
$synth.Rate = 1
$synth.Volume = 100
Write-Host "Usando voz: $($helena.VoiceInfo.Name) ($($helena.VoiceInfo.Culture))"

# Parsear YAML (simple): extraer bloques `id:` y `narration:` por step.
# Soporta `narration: |` multilinea.
$yamlLines = Get-Content -LiteralPath $scriptYaml -Encoding UTF8
$steps = @()
$current = $null
$inNarration = $false
$narrationBuf = New-Object System.Collections.Generic.List[string]

function Commit-Current {
    if ($current -and $current.id -and $current.narration) {
        $script:steps += $current
    }
}

foreach ($raw in $yamlLines) {
    $line = $raw -replace '\r$',''
    if ($inNarration) {
        # Narracion multilinea: contenido esta indentado con 6+ espacios
        # (4 espacios = field declarations como "screenshot:", "zoom:")
        # (2 espacios = list item como "- id:")
        if ($line -match '^[ ]{6,}(\S.*)$') {
            $captured = $Matches[1]
            $narrationBuf.Add($captured)
            continue
        } elseif ($line -match '^[ ]{2,}\S') {
            # Linea con 2-5 espacios: termina el bloque narration, procesar afuera
            $current.narration = ($narrationBuf -join ' ').Trim()
            $narrationBuf.Clear()
            $inNarration = $false
            # No continue: cae al bloque de deteccion de "- id:" o field
        } else {
            # Linea vacia o con menos indent: termina el bloque
            $current.narration = ($narrationBuf -join ' ').Trim()
            $narrationBuf.Clear()
            $inNarration = $false
            # Continua procesando la linea actual fuera del bloque
        }
    }
    if ($line -match '^\s*-\s*id:\s*"?([A-Za-z0-9_-]+)"?\s*$') {
        Commit-Current
        $current = [PSCustomObject]@{ id = $Matches[1]; narration = $null }
        continue
    }
    if ($current -and $line -match '^\s*narration:\s*\|\s*$') {
        $inNarration = $true
        continue
    }
    if ($current -and $line -match '^\s*narration:\s*"?(.+?)"?\s*$') {
        $current.narration = $Matches[1]
        $inNarration = $false
        continue
    }
}
Commit-Current

if ($steps.Count -eq 0) {
    Write-Error "No se encontraron steps en $scriptYaml"
    exit 1
}
Write-Host "Steps parseados: $($steps.Count) -> $($steps.id -join ', ')"

# ffmpeg embebido en Remotion
$ffmpeg = "$monorepoRoot/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe"
if (-not (Test-Path -LiteralPath $ffmpeg)) {
    Write-Error "ffmpeg no encontrado: $ffmpeg (corriste npm install?)"
    exit 1
}

foreach ($step in $steps) {
    $wav = Join-Path $tmpDir "$($step.id).wav"
    $mp3 = Join-Path $audioDir "$($step.id).mp3"

    Write-Host ""
    Write-Host "Generando: $($step.id)"
    Write-Host "  Texto: $($step.narration.Substring(0, [Math]::Min(80, $step.narration.Length)))..."

    # Limpiar texto para TTS: remover acentos raros si Helena tiene problemas
    # (Helena es es-ES, asi que acentos en general los maneja bien)
    $txt = $step.narration

    # Sintetizar a WAV
    $synth.SetOutputToWaveFile($wav)
    try {
        $synth.Speak($txt)
    } finally {
        $synth.SetOutputToNull()
    }

    # Convertir a MP3
    if (Test-Path -LiteralPath $mp3) { Remove-Item -LiteralPath $mp3 -Force }
    & $ffmpeg -y -loglevel error -i $wav -c:a libmp3lame -b:a 96k -ar 44100 $mp3
    if ($LASTEXITCODE -ne 0) {
        Write-Error "ffmpeg fallo convirtiendo $($step.id)"
        exit 1
    }

    $size = (Get-Item -LiteralPath $mp3).Length
    Write-Host "  -> $mp3 ($([Math]::Round($size/1KB, 1)) KB)"
}

# Cleanup
Remove-Item -LiteralPath $tmpDir -Recurse -Force

Write-Host ""
Write-Host "Listo. ${TutorialId}: $($steps.Count) audios generados en $audioDir"
