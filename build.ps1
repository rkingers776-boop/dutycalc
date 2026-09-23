<#
    DutyCalc.online — Build & Cache-Busting Script
    v2.2 — Combined SHA256 content hash across all four shipped assets

    PURPOSE:
      Refreshes the style.css / main.js / rate-data.js / sw-register.js version
      query strings across all HTML files, guaranteeing global CDN edge nodes
      serve the latest assets after every deployment.

    WHY THE HASH CHANGED IN v2.1:
      v2.0 hashed style.css alone and reused that string for main.js. A JS-only
      fix (currency symbols, MPF rates, threshold basis) therefore produced no
      version change, and returning visitors kept executing the cached
      main.js — the P0 calculation fixes never reached them. The version is now
      derived from every asset, so a change to any one busts all.

    WHY rate-data.js / sw-register.js JOINED IN v2.2:
      Neither carried a version query, and sw.js serves every *.css/*.js
      request cache-first. A returning visitor therefore kept the copy captured
      on their first visit forever: the GCC corridors added to rate-data.js in
      September never reached them, and the same would have been true of any
      future fix to the nav helper. Unversioned + cache-first is a permanent
      staleness trap, so both files are now hashed and stamped like the rest.

    WHY THE PATTERNS ALLOW AN ABSENT QUERY IN v2.2:
      The old patterns only matched "name.js?v=...", so a tag written without a
      query was silently skipped forever. The query is optional now, which both
      upgrades the legacy unversioned tags and keeps the run idempotent.

    WHY THE WRITER CHANGED IN v2.1:
      Set-Content -Encoding UTF8 under Windows PowerShell 5.1 emits a UTF-8
      BOM. Running v2.0 on this machine would have prepended a BOM to all 85
      HTML files. Writing goes through .NET with an explicit no-BOM encoder.

    USAGE:
      .\build.ps1                    # Combined SHA256 hash (recommended for prod)
      .\build.ps1 -Timestamp         # Fallback: timestamp-based version
      .\build.ps1 -WhatIf            # Dry-run: preview without writing
      .\build.ps1 -Version "v2.2.0"  # Custom semver string (overrides both)
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
        # Default: combined SHA256 of the shipped assets — changes when ANY changes
        $assets = @('style.css', 'main.js', 'rate-data.js', 'sw-register.js')
        $concat = ''
        foreach ($asset in $assets) {
            $path = Join-Path $scriptDir $asset
            if (-not (Test-Path $path)) {
                Write-Host "  [X] $asset not found at $path" -ForegroundColor Red
                exit 1
            }
            $h = (Get-FileHash -Path $path -Algorithm SHA256).Hash.ToLower()
            $hashReport += ('  {0,-16} {1}' -f $asset, $h.Substring(0, 7))
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
# The pattern is anchored inside src="..." / href="..." on purpose. An earlier
# pass matched a bare "rate-data.js" anywhere in the file, and the generated
# rate-updates.html carries a maintenance comment naming that source file — so
# the stamp landed inside a sentence and corrupted the prose. Only real asset
# references may be rewritten.
$assetPattern = '(?<=src="|href="|src=''|href='')(style\.css|main\.js|rate-data\.js|sw-register\.js)(\?v=[^"\s<>'']+)?'
$evaluator = [System.Text.RegularExpressions.MatchEvaluator] {
    param($m)
    "$($m.Groups[1].Value)?v=$Version"
}
$updated  = 0
$skipped  = 0
$errors   = 0

# UTF-8 without BOM — Set-Content -Encoding UTF8 adds a BOM on PowerShell 5.1
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

foreach ($file in $htmlFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $changes = @()

    foreach ($m in [regex]::Matches($content, $assetPattern)) {
        $old = $m.Value
        $new = "$($m.Groups[1].Value)?v=$Version"
        if ($old -ne $new) { $changes += "$old  ->  $new" }
    }

    if ($changes.Count -eq 0) {
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
        $newContent = [regex]::Replace($content, $assetPattern, $evaluator)
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

# ── Verify: no BOM crept back in, version uniform, nothing left unversioned ──
$bomCount  = 0
$verSet    = @{}
$bareCount = 0
foreach ($file in $htmlFiles) {
    $raw = [System.IO.File]::ReadAllBytes($file.FullName)
    if ($raw.Length -ge 3 -and $raw[0] -eq 0xEF -and $raw[1] -eq 0xBB -and $raw[2] -eq 0xBF) { $bomCount++ }
    $txt = [System.Text.Encoding]::UTF8.GetString($raw)
    foreach ($m in [regex]::Matches($txt, $assetPattern)) {
        if ($m.Groups[2].Success) { $verSet[$m.Groups[2].Value.Substring(3)] = $true }
    }
    # A tag with no query string is invisible to the cache-busting above and will
    # be served cache-first by sw.js forever — treat it as a build failure.
    $bareCount += [regex]::Matches($txt, '(?:src|href)="(?:style\.css|main\.js|rate-data\.js|sw-register\.js)"').Count
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  BUILD COMPLETE"                             -ForegroundColor Cyan
Write-Host "  Updated : $updated"                         -ForegroundColor Green
Write-Host "  Skipped : $skipped"                         -ForegroundColor DarkYellow
Write-Host "  Errors  : $errors"                          -ForegroundColor $(if ($errors -gt 0) { 'Red' } else { 'DarkGray' })
Write-Host "  Version : $Version"                         -ForegroundColor Yellow
Write-Host "  BOM in HTML files : $bomCount"              -ForegroundColor $(if ($bomCount -gt 0) { 'Red' } else { 'DarkGray' })
Write-Host "  Unversioned tags  : $bareCount"               -ForegroundColor $(if ($bareCount -gt 0) { 'Red' } else { 'DarkGray' })
Write-Host "  Versions on page  : $($verSet.Keys -join ', ')" -ForegroundColor DarkGray

if ($WhatIf) {
    # A dry run has not written anything, so the unversioned-tag count is still
    # the pre-build state. Reporting it is useful; failing on it is not.
    Write-Host '  MODE    : DRY-RUN (no files written)'   -ForegroundColor Magenta
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

if ($errors -gt 0 -or $bomCount -gt 0 -or $bareCount -gt 0) {
    exit 1
}
exit 0
