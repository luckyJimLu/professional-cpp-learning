param(
    [ValidateSet("symbols","firmware","scripts","all")]
    [string]$Mode = "all",

    [string]$RemoteHost = "cpp-dev",
    [string]$RemoteBuild = "~/project/build",
    [string]$RemoteScripts = "~/project/scripts/windows",
    [string]$LocalRoot = "D:\Dev\target-runtime"
)

$ErrorActionPreference = "Stop"

$symbolsDir  = Join-Path $LocalRoot "symbols"
$firmwareDir = Join-Path $LocalRoot "firmware"
$scriptsDir  = Join-Path $LocalRoot "scripts"
$manifestDir = Join-Path $LocalRoot "manifest"
$logsDir     = Join-Path $LocalRoot "logs"

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

# Manifest is always synchronized first. A failed transfer stops the hook so a stale
# local build is never silently treated as the current build.
Copy-RemoteFile "$RemoteBuild/build-manifest.json" (Join-Path $manifestDir "build-manifest.json")

if ($Mode -in @("symbols", "all")) {
    Copy-RemoteFile "$RemoteBuild/app.elf" $symbolsDir
    Copy-RemoteFile "$RemoteBuild/app.map" $symbolsDir
}

if ($Mode -in @("firmware", "all")) {
    Copy-RemoteFile "$RemoteBuild/app.bin" $firmwareDir
    Copy-RemoteFile "$RemoteBuild/app.hex" $firmwareDir
}

if ($Mode -in @("scripts", "all")) {
    Write-Host "[remote-bridge] syncing Windows scripts"
    & scp "${RemoteHost}:$RemoteScripts/*.ps1" $scriptsDir
    if ($LASTEXITCODE -ne 0) {
        throw "SCP failed for Windows scripts with exit code $LASTEXITCODE"
    }
}

$manifestPath = Join-Path $manifestDir "build-manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

# The SCP destination is also the Windows local working directory. This makes the
# local terminal, downloaded artifacts, debugger scripts and logs share one root.
Set-Location $LocalRoot

Write-Host ""
Write-Host "[remote-bridge] ready"
Write-Host "  build_id : $($manifest.build_id)"
Write-Host "  commit   : $($manifest.commit)"
Write-Host "  local    : $LocalRoot"
Write-Host "  cwd      : $(Get-Location)"
