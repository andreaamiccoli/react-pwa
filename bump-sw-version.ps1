# Script PowerShell: aggiorna la versione patch in public/sw.js
# Uso: .\bump-sw-version.ps1

$swPath = Join-Path $PSScriptRoot "public\sw.js"
$content = Get-Content $swPath -Raw

# Estrae la versione corrente es. "v14.0.1"
if ($content -match "CACHE_NAME\s*=\s*'[^']*-v(\d+)\.(\d+)\.(\d+)") {
    $major = [int]$Matches[1]
    $minor = [int]$Matches[2]
    $patch = [int]$Matches[3]

    $newPatch = $patch + 1
    $oldVersion = "v$major.$minor.$patch"
    $newVersion = "v$major.$minor.$newPatch"

    $newContent = $content -replace [regex]::Escape($oldVersion), $newVersion
    Set-Content -Path $swPath -Value $newContent -NoNewline

    Write-Host "sw.js aggiornato: $oldVersion -> $newVersion"
} else {
    Write-Host "ATTENZIONE: pattern versione non trovato in sw.js"
    exit 1
}
