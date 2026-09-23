<#
    DutyCalc.online — Build & Cache-Busting Script
    v2.1 — Combined SHA256 content hash across style.css AND main.js

    PURPOSE:
      Refreshes both style.css and main.js version query strings across all
      HTML files, guaranteeing global CDN edge nodes serve the latest assets
      after every deployment.

    WHY THE HASH CHANGED IN v2.1:
      v2.0 hashed style.css alone and reused that string for main.js. A JS-only
      fix (currency symbols, MPF rates, threshold basis) therefore produced no
      version change, and returning visitors kept executing the cached
      main.js — the P0 calculation fixes never reached them. The version is now
      derived from both files, so a change to either one busts both.

    WHY THE WRITER CHANGED IN v2.1:
      Set-Content -Encoding UTF8 under Windows PowerShell 5.1 emits a UTF-8
      BOM. Running v2.0 on this machine would have prepended a BOM to all 85
      HTML files. Writing goes through .NET with an explicit no-BOM encoder.

    USAGE:
      .\build.ps1                    # Combined SHA256 hash (recommended for prod)
      .\build.ps1 -Timestamp         # Fallback: timestamp-based version
      .\build.ps1 -WhatIf            # Dry-run: preview without writing
      .\build.ps1 -Version "v2.1.0"  # Custom semver string (overrides both)
#>

param(
    [string]$Version,          # Custom version string (overrides auto-generation)
    [switch]$Timestamp,        # Force timestamp-based version instead of hash
    [switch]$WhatIf            # Preview changes without writing
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# ── Generate version string ──────────────────────────────────
$hashReport = @()
if (-not $Version) {
    if ($Timestamp) {
        # Legacy: clock-based version — unique every run
        $now     = Get-Date -Format 'yyyyMMdd-HHmmss'
        $entropy = (Get-Date -Format 'ffffff')
        $Version = "v$now-$entropy"
    }
    else {
        # Default: combined SHA256 of style.css + main.js — changes when EITHER changes
        $assets = @('style.css', 'main.js')
        $concat = ''
        foreach ($asset in $assets) {
            $path = Join-Path $scriptDir $asset
            if (-not (Test-Path $path)) {
                Write-Host "  [X] $asset not found at $path" -ForegroundColor Red
                exit 1
            }
            $h = (Get-FileHash -Path $path -Algorithm SHA256).Hash.ToLower()
            $hashReport += ('  {0,-10} {1}' -f $asset, $h.Substring(0, 7))
            $concat += $h
        }
        $bytes   = [System.Text.Encoding]::UTF8.GetBytes($concat)
        $sha     = [System.Security.Cryptography.SHA256]::Create()
        $digest  = $sha.ComputeHash($bytes)
        $Version = -join ($digest[0..3] | ForEach-Object { $_.ToString('x2') })
        $Version = $Version.Substring(0, 7)
    }
}

$modeStr = if ($Timestamp) { 'Timestamp' } else { 'Combined SHA256' }
if ($Version -and -not $Timestamp -and $hashReport.Count -eq 0) { $modeStr = 'Custom' }

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  DutyCalc Build - Cache-Busting Pipeline"  -ForegroundColor Cyan
Write-Host "  Mode   : $modeStr"                        -ForegroundColor Magenta
Write-Host "  Version: $Version"                         -ForegroundColor Yellow
Write-Host "  Target : $scriptDir"                       -ForegroundColor DarkGray
foreach ($line in $hashReport) { Write-Host $line -ForegroundColor DarkGray }
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# ── Scan all HTML files ──────────────────────────────────────
$htmlFiles = Get-ChildItem -Path $scriptDir -Filter '*.html' -File
$count     = @($htmlFiles).Count
Write-Host "  Found $count HTML files" -ForegroundColor White
Write-Host ""

if ($count -eq 0) {
    Write-Host "  [!] No HTML files found. Nothing to do." -ForegroundColor Yellow
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

# UTF-8 without BOM — Set-Content -Encoding UTF8 adds a BOM on PowerShell 5.1
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

foreach ($file in $htmlFiles) {
    $content    = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $newContent = $content
    $fileChanged = $false
    $changes     = @()

    for ($i = 0; $i -lt $patterns.Count; $i++) {
        $currentMatch = [regex]::Match($newContent, $patterns[$i])
        if (-not $currentMatch.Success) { continue }

        $oldTag = $currentMatch.Value
        $newTag = "$($prefixes[$i])?v=$Version"

        if ($oldTag -eq $newTag) { continue }

        $changes += "$oldTag  ->  $newTag"
        $newContent = $newContent -replace [regex]::Escape($oldTag), $newTag
        $fileChanged = $true
    }

    if (-not $fileChanged) {
        $skipped++
        continue
    }

    if ($WhatIf) {
        Write-Host "  [dry] $($file.Name)" -ForegroundColor Magenta
        foreach ($c in $changes) { Write-Host "        $c" -ForegroundColor DarkGray }
        $updated++
        continue
    }

    try {
        [System.IO.File]::WriteAllText($file.FullName, $newContent, $utf8NoBom)
        Write-Host "  [ok]  $($file.Name)" -ForegroundColor Green
        foreach ($c in $changes) { Write-Host "        $c" -ForegroundColor DarkGray }
        $updated++
    }
    catch {
        Write-Host "  [FAIL] $($file.Name) - $_" -ForegroundColor Red
        $errors++
    }
}

# ── Verify: no BOM crept back in, version uniform ────────────
$bomCount = 0
$verSet   = @{}
foreach ($file in $htmlFiles) {
    $raw = [System.IO.File]::ReadAllBytes($file.FullName)
    if ($raw.Length -ge 3 -and $raw[0] -eq 0xEF -and $raw[1] -eq 0xBB -and $raw[2] -eq 0xBF) { $bomCount++ }
    $txt = [System.Text.Encoding]::UTF8.GetString($raw)
    foreach ($m in [regex]::Matches($txt, '(?:style\.css|main\.js)\?v=([\w\-.]+)')) {
        $verSet[$m.Groups[1].Value] = $true
    }
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  BUILD COMPLETE"                             -ForegroundColor Cyan
Write-Host "  Updated : $updated"                         -ForegroundColor Green
Write-Host "  Skipped : $skipped"                         -ForegroundColor DarkYellow
Write-Host "  Errors  : $errors"                          -ForegroundColor $(if ($errors -gt 0) { 'Red' } else { 'DarkGray' })
Write-Host "  Version : $Version"                         -ForegroundColor Yellow
Write-Host "  BOM in HTML files : $bomCount"              -ForegroundColor $(if ($bomCount -gt 0) { 'Red' } else { 'DarkGray' })
Write-Host "  Versions on page  : $($verSet.Keys -join ', ')" -ForegroundColor DarkGray

if ($WhatIf) {
    Write-Host '  MODE    : DRY-RUN (no files written)'   -ForegroundColor Magenta
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

if ($errors -gt 0 -or $bomCount -gt 0) {
    exit 1
}
exit 0
