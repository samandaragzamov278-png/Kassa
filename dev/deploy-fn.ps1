# Выкладка серверной функции Supabase из supabase/functions/<имя> одной командой (без Docker).
# Запуск: powershell -File dev\deploy-fn.ps1 billz-sync   (или billz-collect)
# Один раз до этого: supabase login  (вход в браузере, токен сохраняется сам)
param([Parameter(Mandatory = $true)][ValidateSet('billz-sync', 'billz-collect', 'billz-probe', 'billz-docs')][string]$Name)
$ErrorActionPreference = 'Stop'
$cli = "$env:USERPROFILE\.local\supabase\supabase.exe"
if (-not (Test-Path $cli)) { throw "нет Supabase CLI: $cli" }
Push-Location (Split-Path $PSScriptRoot)
try {
  & $cli functions deploy $Name --project-ref qvblxhyftwivkzxucfak --use-api --no-verify-jwt
  if ($LASTEXITCODE) { throw "выкладка $Name не прошла" }
  "выложено: $Name"
} finally { Pop-Location }
