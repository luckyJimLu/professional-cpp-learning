param(
    [ValidateSet("init","symbols","firmware","scripts","all")]
    [string]$Mode = "init",

    [string]$RemoteHost = "cpp-dev",
    [string]$RemoteBuild = "~/project/build",
    [string]$RemoteScripts = "~/project/scripts/windows",
    [string]$LocalRoot = "D:\Dev\target-runtime",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$symbolsDir  = Join-Path $LocalRoot "symbols"
$firmwareDir = Join-Path $LocalRoot "firmware"
$scriptsDir  = Join-Path $LocalRoot "scripts"
$manifestDir = Join-Path $LocalRoot "manifest"
$logsDir     = Join-Path $LocalRoot "logs"
$manifestPath = Join-Path $manifestDir "build-manifest.json"
$previousManifestPath = Join-Path $manifestDir "build-manifest.previous.json"

@($LocalRoot, $symbolsDir, $firmwareDir, $scriptsDir, $manifestDir, $logsDir) | ForEach-Object {
    New-Item -ItemType Directory -Force $_ | Out-Null
}

function Copy-RemoteFile {
    param(
        [Parameter(Mandatory = $true)][string]$RemotePath,
        [Parameter(Mandatory = $true)][string]$LocalPath
    )

    Write-Host "[remote-bridge] scp ${RemoteHost}:$RemotePath -> $LocalPath"
    & scp "${RemoteHost}:$RemotePath" $LocalPath
    if ($LASTEXITCODE -ne 0) {
        throw "SCP failed for $RemotePath with exit code $LASTEXITCODE"
    }
}

# Preserve the previous manifest so the hook can report whether the remote build changed.
if (Test-Path $manifestPath) {
    Copy-Item $manifestPath $previousManifestPath -Force
}

# The manifest is intentionally small and is always refreshed when a local terminal starts.
Copy-RemoteFile "$RemoteBuild/build-manifest.json" $manifestPath
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$previousManifest = $null
if (Test-Path $previousManifestPath) {
    $previousManifest = Get-Content $previousManifestPath -Raw | ConvertFrom-Json
}

$buildChanged = $true
if ($previousManifest -and $previousManifest.build_id -eq $manifest.build_id -and $previousManifest.commit -eq $manifest.commit) {
    $buildChanged = $false
}

# init is the terminal-start hook: keep it lightweight. It refreshes metadata and scripts,
# but deliberately avoids large symbols and firmware transfers.
if ($Mode -in @("init", "scripts", "all")) {
    Write-Host "[remote-bridge] syncing Windows scripts"
    & scp "${RemoteHost}:$RemoteScripts/*.ps1" $scriptsDir
    if ($LASTEXITCODE -ne 0) {
        throw "SCP failed for Windows scripts with exit code $LASTEXITCODE"
    }
}

if ($Mode -in @("symbols", "all")) {
    if ($Force -or $buildChanged -or -not (Test-Path (Join-Path $symbolsDir "app.elf"))) {
        Copy-RemoteFile "$RemoteBuild/app.elf" $symbolsDir
        Copy-RemoteFile "$RemoteBuild/app.map" $symbolsDir
    } else {
        Write-Host "[remote-bridge] symbols unchanged; skipping download"
    }
}

if ($Mode -in @("firmware", "all")) {
    if ($Force -or $buildChanged -or -not (Test-Path (Join-Path $firmwareDir "app.bin"))) {
        Copy-RemoteFile "$RemoteBuild/app.bin" $firmwareDir
        Copy-RemoteFile "$RemoteBuild/app.hex" $firmwareDir
    } else {
        Write-Host "[remote-bridge] firmware unchanged; skipping download"
    }
}

Set-Location $LocalRoot

Write-Host ""
Write-Host "[remote-bridge] ready"
Write-Host "  mode      : $Mode"
Write-Host "  build_id  : $($manifest.build_id)"
Write-Host "  commit    : $($manifest.commit)"
Write-Host "  changed   : $buildChanged"
Write-Host "  local     : $LocalRoot"
Write-Host "  cwd       : $(Get-Location)"

if ($Mode -eq "init" -and $buildChanged) {
    Write-Host ""
    Write-Host "[remote-bridge] a different remote build is available."
    Write-Host "  Symbols and firmware were NOT downloaded by the terminal hook."
    Write-Host "  Run on demand:"
    Write-Host "    .\sync-build.ps1 -Mode symbols"
    Write-Host "    .\sync-build.ps1 -Mode firmware"
    Write-Host "    .\sync-build.ps1 -Mode all"
}
