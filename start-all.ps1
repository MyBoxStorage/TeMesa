# start-all.ps1 — Abre 4 janelas PowerShell, uma por serviço

$s = "C:\Users\pc\Desktop\Projetos\balneario-camboriu\TeMesa\scripts"

Write-Host "Iniciando projetos..." -ForegroundColor Cyan

Start-Process pwsh -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$s\start-wpp.ps1"
Start-Sleep -Seconds 2

Start-Process pwsh -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$s\start-bc.ps1"
Start-Sleep -Seconds 2

Start-Process pwsh -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$s\start-temesa.ps1"
Start-Sleep -Seconds 2

Start-Process pwsh -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$s\start-ngrok.ps1"

Write-Host "Pronto! 4 janelas abertas." -ForegroundColor Green
