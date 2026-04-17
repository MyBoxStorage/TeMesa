/**
 * tests/e2e/widget.spec.ts
 * Seletores baseados no código real de booking-widget.tsx
 */
import { test, expect } from "@playwright/test";

const WIDGET_URL = "/r/porto-cabral-bc";

// Helper: avança para o step 'schedule'
async function goToSchedule(page: any) {
  await page.goto(WIDGET_URL);
  await page.getByRole("button", { name: /curtindo mesmo/i }).click();
  await page.waitForTimeout(500);
}

// Helper: seleciona 2 pessoas + data de hoje + primeiro slot → avança para identity
async function goToIdentity(page: any) {
  await goToSchedule(page);
  await page.getByRole("button", { name: /^2 pessoas$/i }).click();
  // Primeira data não-desabilitada (hoje)
  await page.locator("div.grid.grid-cols-7").locator("button:not([disabled])").first().click();
  await page.waitForTimeout(1000);
  // Primeiro slot de horário (texto HH:MM)
  await page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first().click();
  await page.getByRole("button", { name: "Continuar →" }).click();
  await page.waitForTimeout(300);
}

// Helper: avança até o step 'referral' (último antes de confirmar)
async function goToReferral(page: any) {
  await goToIdentity(page);
  await page.getByPlaceholder(/nome completo/i).fill("Teste QA");
  await page.getByPlaceholder(/99999/i).fill("(47) 99999-0001");
  await page.getByRole("button", { name: "Continuar →" }).click();
  await page.waitForTimeout(300);
  // Pular profile
  await page.getByRole("button", { name: "Pular" }).click();
  await page.waitForTimeout(300);
  // Pular preferences
  await page.getByRole("button", { name: "Pular" }).click();
  await page.waitForTimeout(300);
}

// ── 3.1 Carregamento inicial ──────────────────────────────────────────────────

test.describe("3.1 — Carregamento inicial", () => {
  test.beforeEach(async ({ page }) => { await page.goto(WIDGET_URL); });

  test("3.1.1 — nome do restaurante visível", async ({ page }) => {
    await expect(page.getByText(/porto cabral bc/i)).toBeVisible();
  });

  test("3.1.2 — inicial do restaurante visível no header", async ({ page }) => {
    // div que mostra a letra inicial quando não há logo (primeiro char do nome = "P")
    await expect(page.getByText("P").first()).toBeVisible();
  });

  test("3.1.3 — 'Reservas online' visível", async ({ page }) => {
    await expect(page.getByText(/reservas online/i)).toBeVisible();
  });

  test("3.1.5 — seletor PT / EN / ES visível", async ({ page }) => {
    // exact:true para evitar conflito com outros botões que contêm "PT","EN","ES" como substring
    await expect(page.getByRole("button", { name: "PT", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "EN", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "ES", exact: true })).toBeVisible();
  });

  test("3.1.6 — 'Powered by TeMesa' no rodapé", async ({ page }) => {
    await expect(page.getByText(/powered by temesa/i)).toBeVisible();
  });
});

// ── 3.2 Fluxo completo ────────────────────────────────────────────────────────

test("3.2 — fluxo completo até tela de sucesso", async ({ page }) => {
  await goToReferral(page);

  // O LGPD é um <div> com onClick dentro de um <label>.
  // Clicar no <label> propaga para o div e aciona o toggle.
  await page.locator("label").filter({ hasText: /li e aceito os termos/i }).click();
  await page.waitForTimeout(200);

  const confirmBtn = page.getByRole("button", { name: /confirmar reserva/i });
  await expect(confirmBtn).toBeEnabled({ timeout: 3000 });
  await confirmBtn.click();

  await expect(page.getByText(/reserva confirmada/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/você receberá uma confirmação no whatsapp/i)).toBeVisible();
});

// ── 3.3 Validações ────────────────────────────────────────────────────────────

test("3.3.4 — sem LGPD o botão confirmar fica desabilitado", async ({ page }) => {
  await goToReferral(page);
  await expect(page.getByRole("button", { name: /confirmar reserva/i })).toBeDisabled();
});

// ── 3.4 Idiomas ───────────────────────────────────────────────────────────────

test.describe("3.4 — Idiomas", () => {
  test.beforeEach(async ({ page }) => { await page.goto(WIDGET_URL); });

  test("3.4.1 — EN muda textos para inglês", async ({ page }) => {
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.getByText(/online reservations/i)).toBeVisible();
  });

  test("3.4.2 — ES muda textos para espanhol", async ({ page }) => {
    await page.getByRole("button", { name: "ES", exact: true }).click();
    await expect(page.getByText(/solo a disfrutar/i)).toBeVisible();
  });

  test("3.4.3 — voltar para PT restaura textos em português", async ({ page }) => {
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page.getByRole("button", { name: "PT", exact: true }).click();
    await expect(page.getByText(/reservas online/i)).toBeVisible();
    await expect(page.getByText(/curtindo mesmo/i)).toBeVisible();
  });
});

// ── 3.5 Slug inexistente ──────────────────────────────────────────────────────

test("3.5.1 — slug inexistente retorna 404", async ({ page }) => {
  const response = await page.goto("/r/slug-que-nao-existe-zzz");
  expect(response?.status()).toBe(404);
});
