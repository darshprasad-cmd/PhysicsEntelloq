param([switch]$SkipSetup)
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    if (-not $SkipSetup -and -not $env:LEAN_BIN) { & (Join-Path $PSScriptRoot 'setup-lean.ps1'); if ($LASTEXITCODE -ne 0) { throw 'Lean setup failed.' } }
    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules'))) { & npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' } }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Interface build failed.' }
    $proofPython = $env:PROOF_PYTHON
    if (-not $proofPython) {
        $proofBundledPython = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
        if (Test-Path -LiteralPath $proofBundledPython) { $proofPython = $proofBundledPython } else { $proofPython = 'python' }
    }
    & $proofPython (Join-Path $PSScriptRoot 'server\app.py')
} finally { Pop-Location }
