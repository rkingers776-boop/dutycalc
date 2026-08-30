<#
    DutyCalc.online — Build & Cache-Busting Script
    v2.0 — Dual-file SHA256 content-hash versioning

    PURPOSE:
      Refreshes both style.css and main.js version query strings across all
      HTML files, guaranteeing global CDN edge nodes serve the latest assets
      after every deployment. One SHA256 hash, two files busted in lockstep.

    USAGE:
      .\build.ps1                    # SHA256 content hash (recommended for prod)
      .\build.ps1 -Timestamp         # Fallback: timestamp-based version
      .\build.ps1 -WhatIf            # Dry-run: preview without writing
      .\build.ps1 -Version "v2.1.0"  # Custom semver string (overrides both)
      .\build.ps1 -Hash -WhatIf      # Dry-run with SHA256 hash
#>

param(
    [string]$Version,          # Custom version string (overrides auto-generation)
    [switch]$Hash,             # Use SHA256 content hash of style.css (default: on)
    [switch]$Timestamp,        # Force timestamp-based version instead of hash
    [switch]$WhatIf            # Preview changes without writing
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# ── Generate version string ──────────────────────────────────
if (-not $Version) {
    if ($Timestamp) {
        # Legacy: clock-based version — unique every run
        $now       = Get-Date -Format 'yyyyMMdd-HHmmss'
        $entropy   = (Get-Date -Format 'ffffff')
        $Version   = "v$now-$entropy"
    }
    else {
        # Default: SHA256 content hash — changes ONLY when CSS changes
        $cssPath   = Join-Path $scriptDir 'style.css'
        if (-not (Test-Path $cssPath)) {
            Write-Host "  ❌  style.css not found at $cssPath" -ForegroundColor Red
            exit 1
        }
        $sha256    = (Get-FileHash -Path $cssPath -Algorithm SHA256).Hash
        $shortHash = $sha256.Substring(0, 7).ToLower()
        $Version   = $shortHash
    }
}

$modeStr = if ($Timestamp) { 'Timestamp' } else { 'SHA256 Hash' }
if ($Version -and -not ($Timestamp -or $Hash)) { $modeStr = 'Custom' }

Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DutyCalc Build — Cache-Busting Pipeline"   -ForegroundColor Cyan
Write-Host "  Mode   : $modeStr"                         -ForegroundColor Magenta
Write-Host "  Version: $Version"                          -ForegroundColor Yellow
Write-Host "  Target : $scriptDir"                        -ForegroundColor DarkGray
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── Scan all HTML files ──────────────────────────────────────
$htmlFiles = Get-ChildItem -Path $scriptDir -Filter '*.html' -File
$count     = @($htmlFiles).Count
Write-Host "  Found $count HTML files" -ForegroundColor White
Write-Host ""

if ($count -eq 0) {
    Write-Host "  ⚠️  No HTML files found. Nothing to do." -ForegroundColor Yellow
    exit 0
}

# ── Process each file ────────────────────────────────────────
$updated  = 0
$skipped  = 0
$errors   = 0
$patterns = @(
    'style\.css\?v=[^"''\s<>]+',
    'main\.js\?v=[^"''\s<>]+'
)
$prefixes = @('style.css', 'main.js')

foreach ($file in $htmlFiles) {
    $content  = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    $newContent = $content
    $fileChanged = $false
    $changes     = @()

    for ($i = 0; $i -lt $patterns.Count; $i++) {
        $currentMatch = [regex]::Match($newContent, $patterns[$i])
        if (-not $currentMatch.Success) { continue }

        $oldTag = $currentMatch.Value
        $newTag = "$($prefixes[$i])?v=$Version"

        if ($oldTag -eq $newTag) { continue }

        $changes += "$oldTag  →  $newTag"
        $newContent = $newContent -replace [regex]::Escape($oldTag), $newTag
        $fileChanged = $true
    }

    if (-not $fileChanged) {
        $skipped++
        continue
    }

    if ($WhatIf) {
        Write-Host "  🔍 DRY-RUN  $($file.Name)" -ForegroundColor Magenta
        foreach ($c in $changes) { Write-Host "       $c" -ForegroundColor DarkGray }
        $updated++
        continue
    }

    try {
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
        Write-Host "  ✅  DONE  $($file.Name)" -ForegroundColor Green
        foreach ($c in $changes) { Write-Host "       $c" -ForegroundColor DarkGray }
        $updated++
    }
    catch {
        Write-Host "  ❌  FAIL  $($file.Name) — $_" -ForegroundColor Red
        $errors++
    }
}

# ── Summary ──────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  BUILD COMPLETE"                            -ForegroundColor Cyan
Write-Host "  Updated : $updated"                        -ForegroundColor Green
Write-Host "  Skipped : $skipped"                        -ForegroundColor DarkYellow
Write-Host "  Errors  : $errors"                         -ForegroundColor $(if ($errors -gt 0) { 'Red' } else { 'DarkGray' })
Write-Host "  Version : $Version"                        -ForegroundColor Yellow

if ($WhatIf) {
    Write-Host '  MODE    : DRY-RUN (no files written)'  -ForegroundColor Magenta
}

Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($errors -gt 0) {
    exit 1
}
exit 0
