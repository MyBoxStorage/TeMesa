/**
 * tests/e2e/dashboard-reservas.spec.ts — Seções 4, 5 e 6 do guia de QA
 */
import { test, expect, Page } from "@playwright/test";

test.describe("4 — Autenticação", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("4.1 — /dashboard sem login redireciona", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in/);
  });
  test("4.5 — widget carrega sem login", async ({ page }) => {
    await page.goto("/r/porto-cabral-bc");
    await expect(page).not.toHaveURL(/sign-in/);
  });
});

test.describe("4 — Login autenticado", () => {
  test("4.2 — acessa dashboard autenticado", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/dashboard/);
    await expect(page).not.toHaveURL(/sign-in/);
  });
});

test.describe("5 — Visão geral", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/dashboard"); });
  test("5.1 — data de hoje em português", async ({ page }) => {
    const months = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    await expect(page.getByText(new RegExp(months[new Date().getMonth()], "i"))).toBeVisible();
  });
  test("5.2 — cards de métricas visíveis", async ({ page }) => {
    await expect(page.locator('[data-testid="metric-confirmed"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-people"]')).toBeVisible();
  });
});

test.describe("6.1 — Listagem", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/dashboard/reservas"); });
  test("6.1.1 — lista carrega", async ({ page }) => {
    await expect(page.locator('[data-testid="reservation-group"]').first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("6.2 — Filtros", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/dashboard/reservas"); });
  test("6.2.5 — busca sem resultado mostra empty state", async ({ page }) => {
    const search = page.locator('[data-testid="search-input"], input[placeholder*="buscar" i]');
    await search.fill("zzzzzz_inexistente_99999");
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="empty-state"], [data-testid="no-results"]')).toBeVisible();
  });
});

test.describe("6.3 — Navegação de data", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/dashboard/reservas"); });
  test("6.3.1 — avançar dia muda a data", async ({ page }) => {
    const before = await page.locator('[data-testid="current-date"]').textContent();
    await page.locator('[data-testid="date-next"]').click();
    const after = await page.locator('[data-testid="current-date"]').textContent();
    expect(before).not.toBe(after);
  });
});

test.describe("6.4 — Criar reserva manual", () => {
  test("6.4 — cria reserva e aparece na lista", async ({ page }) => {
    await page.goto("/dashboard/reservas");
    await page.getByRole("button", { name: /nova reserva/i }).click();
    await expect(page.locator('[data-testid="reservation-form-modal"]')).toBeVisible();
    await page.getByLabel(/nome.*hóspede|guest name/i).fill("Reserva Manual QA");
    await page.getByLabel(/whatsapp|telefone/i).fill("+5547999990099");
    const dateInput = page.getByLabel(/data/i);
    await dateInput.fill(new Date().toISOString().slice(0, 10));
    await page.getByLabel(/pessoas|party size/i).fill("3");
    const lgpd = page.getByRole("checkbox", { name: /lgpd/i });
    if (await lgpd.isVisible().catch(() => false)) await lgpd.check();
    await page.getByRole("button", { name: /salvar|criar reserva/i }).click();
    await expect(page.locator('[data-testid="reservation-card"]', { hasText: "Reserva Manual QA" })).toBeVisible();
  });
});

test.describe("6.5 — Detalhe da reserva", () => {
  test("6.5.1 — clicar no card abre painel lateral", async ({ page }) => {
    await page.goto("/dashboard/reservas");
    const card = page.locator('[data-testid="reservation-card"]').first();
    if (await card.isVisible({ timeout: 8000 }).catch(() => false)) {
      await card.click();
      await expect(page.locator('[data-testid="reservation-detail-panel"]')).toBeVisible();
    }
  });
  test("6.5.5 — fechar painel com X", async ({ page }) => {
    await page.goto("/dashboard/reservas");
    const card = page.locator('[data-testid="reservation-card"]').first();
    if (await card.isVisible({ timeout: 8000 }).catch(() => false)) {
      await card.click();
      const panel = page.locator('[data-testid="reservation-detail-panel"]');
      await expect(panel).toBeVisible();
      await panel.getByRole("button", { name: /fechar|close|×/i }).click();
      await expect(panel).not.toBeVisible();
    }
  });
});

test.describe("6.6 — Ciclo de vida", () => {
  test("6.6.1 — PENDING → CONFIRMED", async ({ page }) => {
    await page.goto("/dashboard/reservas");
    const card = page.locator('[data-testid="reservation-card"][data-status="PENDING"]').first();
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      await card.click();
      await page.getByRole("button", { name: /confirmar/i }).click();
      await expect(card.locator('[data-testid="status-badge"]')).toHaveAttribute("data-status", "CONFIRMED");
    }
  });
  test("6.6.5 — CONFIRMED → CANCELLED", async ({ page }) => {
    await page.goto("/dashboard/reservas");
    const card = page.locator('[data-testid="reservation-card"][data-status="CONFIRMED"]').first();
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      await card.click();
      await page.getByRole("button", { name: /cancelar/i }).click();
      const confirm = page.getByRole("button", { name: /confirmar cancelamento|sim/i });
      if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) await confirm.click();
      await expect(card.locator('[data-testid="status-badge"]')).toHaveAttribute("data-status", "CANCELLED");
    }
  });
});
