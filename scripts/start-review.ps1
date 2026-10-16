param([switch]$InspectWebView)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$listener = Get-NetTCPConnection -LocalPort 1420 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  throw "Port 1420 is already in use (PID $($listener.OwningProcess -join ', ')). Inspect the existing review server before starting another."
}
$compilers = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(cargo|rustc)\.exe$' })
if ($compilers.Count) { throw 'Cargo/rustc is already running. Reuse or close the existing development session first.' }
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$logDir = Join-Path $projectRoot '.tmp'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stdout = Join-Path $logDir "review-$stamp.stdout.log"
$stderr = Join-Path $logDir "review-$stamp.stderr.log"
$previousArgs = $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS
try {
  if ($InspectWebView) {
    $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = '--remote-debugging-port=9223 --remote-debugging-address=127.0.0.1'
  }
  # Start-Process survives the invoking shell. Keep Tauri and its Vite child together.
  $process = Start-Process -FilePath $nodePath -ArgumentList 'scripts/with-cargo-cache.mjs tauri dev --config src-tauri/tauri.portable.conf.json' -WorkingDirectory $projectRoot -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden -PassThru
} finally {
  $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = $previousArgs
}
[pscustomobject]@{
  launcherPid = $process.Id
  stdout = $stdout
  stderr = $stderr
  url = 'http://localhost:1420'
} | ConvertTo-Json | Tee-Object -FilePath (Join-Path $logDir 'review-session.json')
