/**
 * tests/e2e/confirmacao.spec.ts — Seções 16 e 17 do guia de QA
 *
 * REQUISITO: servidor rodando com NODE_ENV=test para os endpoints /api/test/* funcionarem.
 * Comando: $env:NODE_ENV="test"; pnpm dev
 */
import { test, expect } from "@playwright/test";
import { getLatestConfirmToken, BASE_URL } from "../fixtures/helpers";

test.describe("16 — Confirmação/cancelamento pelo cliente", () => {
  let validToken: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      // Requer servidor com NODE_ENV=test
      validToken = await getLatestConfirmToken(page);
    } catch {
      // Fallback: cria reserva pelo widget com seletores reais do booking-widget.tsx
      await page.goto("/r/porto-cabral-bc");
      // Step occasion
      await page.getByRole("button", { name: /curtindo mesmo/i }).click();
      await page.waitForTimeout(500);
      // Step schedule
      await page.getByRole("button", { name: /^2 pessoas$/i }).click();
      await page.locator("div.grid.grid-cols-7").locator("button:not([disabled])").first().click();
      await page.waitForTimeout(1000);
      await page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first().click();
      await page.getByRole("button", { name: "Continuar →" }).click();
      await page.waitForTimeout(300);
      // Step identity
      await page.getByPlaceholder(/nome completo/i).fill("QA Confirmacao");
      await page.getByPlaceholder(/99999/i).fill("(47) 99999-0097");
      await page.getByRole("button", { name: "Continuar →" }).click();
      await page.waitForTimeout(300);
      // Pular profile e preferences
      await page.getByRole("button", { name: "Pular" }).click();
      await page.waitForTimeout(300);
      await page.getByRole("button", { name: "Pular" }).click();
      await page.waitForTimeout(300);
      // Step referral: marcar LGPD e confirmar
      await page.locator("label").filter({ hasText: /li e aceito os termos/i }).click();
      await page.waitForTimeout(200);
      await page.getByRole("button", { name: /confirmar reserva/i }).click();
      await expect(page.getByText(/reserva confirmada/i)).toBeVisible({ timeout: 15_000 });
      validToken = await getLatestConfirmToken(page);
    }
    await page.close();
  });

  test("16.1 — página carrega com token válido", async ({ page }) => {
    await page.goto(`/confirmar/${validToken}`);
    await expect(page.locator('[data-testid="reservation-details"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /confirmar presença/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /cancelar/i })).toBeVisible();
  });

  test("16.4 — token inválido exibe mensagem de erro", async ({ page }) => {
    await page.goto("/confirmar/token-invalido-zzz-9999");
    await expect(page.getByText(/reserva não encontrada|token inválido|não encontrado/i)).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("17 — Avaliação pós-visita", () => {
  test("17.5 — token inválido não quebra a página", async ({ page }) => {
    await page.goto("/avaliar/token-totalmente-invalido-999");
    await expect(page.getByText(/internal server error/i)).not.toBeVisible();
  });
});
