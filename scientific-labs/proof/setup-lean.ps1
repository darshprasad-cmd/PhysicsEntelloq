$ErrorActionPreference = 'Stop'
$proofRuntime = Join-Path $PSScriptRoot 'work\runtime'
$proofArchive = Join-Path $proofRuntime 'lean-4.35.0-windows.tar.zst'
$proofExecutable = Join-Path $proofRuntime 'lean-4.35.0-windows\bin\lean.exe'
$proofExpectedHash = '893fde3f52b48c647e3edcf33844cbb61f8ef70fcd88e0536bfc83f29844081e'
if (Test-Path -LiteralPath $proofExecutable) {
    & $proofExecutable --version
    exit $LASTEXITCODE
}
New-Item -ItemType Directory -Path $proofRuntime -Force | Out-Null
if (-not (Test-Path -LiteralPath $proofArchive)) {
    Write-Host 'Downloading official Lean 4.35.0 for Windows (about 594 MiB)…'
    curl.exe -L --fail --retry 2 --output $proofArchive 'https://github.com/leanprover/lean4/releases/download/v4.35.0/lean-4.35.0-windows.tar.zst'
    if ($LASTEXITCODE -ne 0) { throw 'Lean download failed. Remove the partial archive before retrying.' }
}
if ((Get-FileHash -LiteralPath $proofArchive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $proofExpectedHash) {
    throw 'The archive hash does not match the official release. Do not use this archive.'
}
Write-Host 'Verified official release hash. Extracting Lean…'
tar -xf $proofArchive -C $proofRuntime
if ($LASTEXITCODE -ne 0) { throw 'Extraction failed. A recent Windows tar with zstd support is required.' }
& $proofExecutable --version
if ($LASTEXITCODE -ne 0) { throw 'Lean installation did not pass its version check.' }
