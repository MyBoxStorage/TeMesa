# =============================================================================
# setup-testes.ps1
# Copia playwright.config.ts, tests/ e adiciona scripts ao package.json
# Execute na raiz do TeMesa: pwsh -ExecutionPolicy Bypass -File .\setup-testes.ps1
# =============================================================================

# ── 1. playwright.config.ts ──────────────────────────────────────────────────
Write-Host "Criando playwright.config.ts..." -ForegroundColor Cyan
[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location) "playwright.config.ts"),
  @'
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "dashboard",
      testMatch: /dashboard.*\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/fixtures/.auth/user.json",
      },
    },
    {
      name: "public",
      testMatch: /(widget|confirmacao|avaliacao|security)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "crons",
      testMatch: /crons\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
'@,
  [System.Text.Encoding]::UTF8
)
Write-Host "  [OK] playwright.config.ts" -ForegroundColor Green

# ── 2. .env.test ─────────────────────────────────────────────────────────────
if (-not (Test-Path -LiteralPath ".env.test")) {
  Write-Host "Criando .env.test..." -ForegroundColor Cyan
  [System.IO.File]::WriteAllText(
    (Join-Path (Get-Location) ".env.test"),
    @'
PLAYWRIGHT_BASE_URL=http://localhost:3000
NODE_ENV=test
TEST_USER_EMAIL=seu-email@dominio.com
TEST_USER_PASSWORD=sua-senha-aqui
CRON_SECRET=temesa_cron_secret_2026
'@,
    [System.Text.Encoding]::UTF8
  )
  Write-Host "  [OK] .env.test criado — edite com suas credenciais" -ForegroundColor Yellow
} else {
  Write-Host "  [SKIP] .env.test ja existe" -ForegroundColor Gray
}

# ── 3. Pastas de fixtures ─────────────────────────────────────────────────────
Write-Host "Criando estrutura tests/fixtures..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "tests\fixtures\.auth" | Out-Null
New-Item -ItemType File -Force -Path "tests\fixtures\.auth\.gitkeep" | Out-Null
Write-Host "  [OK] tests/fixtures/.auth/" -ForegroundColor Green

# ── 4. Adicionar scripts ao package.json ──────────────────────────────────────
Write-Host "Atualizando package.json com scripts de teste..." -ForegroundColor Cyan

$pkgPath = Join-Path (Get-Location) "package.json"
$pkg = Get-Content -LiteralPath $pkgPath -Raw | ConvertFrom-Json

$novosScripts = @{
  "test:e2e"         = "playwright test"
  "test:e2e:ui"      = "playwright test --ui"
  "test:e2e:headed"  = "playwright test --headed"
  "test:e2e:debug"   = "playwright test --debug"
  "test:e2e:widget"  = "playwright test tests/e2e/widget.spec.ts"
  "test:e2e:dash"    = "playwright test tests/e2e/dashboard-reservas.spec.ts"
  "test:e2e:critico" = "playwright test tests/e2e/widget.spec.ts tests/e2e/dashboard-reservas.spec.ts tests/e2e/confirmacao.spec.ts --project=public"
  "test:e2e:security"= "playwright test tests/e2e/security.spec.ts --project=public"
  "test:e2e:crons"   = "playwright test tests/e2e/crons.spec.ts --project=crons"
  "test:report"      = "playwright show-report"
}

foreach ($key in $novosScripts.Keys) {
  $pkg.scripts | Add-Member -NotePropertyName $key -NotePropertyValue $novosScripts[$key] -Force
}

$pkg | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $pkgPath -Encoding UTF8
Write-Host "  [OK] Scripts adicionados ao package.json" -ForegroundColor Green

# ── 5. Resumo final ───────────────────────────────────────────────────────────
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host " Setup concluido!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor White
Write-Host ""
Write-Host "1. Edite .env.test com seu e-mail e senha do Clerk:" -ForegroundColor Yellow
Write-Host "   notepad .env.test" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Inicie o servidor em modo test (Terminal 1):" -ForegroundColor Yellow
Write-Host '   $env:NODE_ENV="test"; pnpm dev' -ForegroundColor Gray
Write-Host ""
Write-Host "3. Login do Playwright (Terminal 2, uma unica vez):" -ForegroundColor Yellow
Write-Host "   pnpm playwright test --project=setup" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Rodar testes criticos:" -ForegroundColor Yellow
Write-Host "   pnpm test:e2e:critico" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Interface visual (recomendado):" -ForegroundColor Yellow
Write-Host "   pnpm test:e2e:ui" -ForegroundColor Gray
