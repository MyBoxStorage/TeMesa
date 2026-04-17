import { Page, expect } from "@playwright/test";

export const WIDGET_URL = "/r/porto-cabral-bc";
export const CRON_SECRET = process.env.CRON_SECRET ?? "temesa_cron_secret_2026";
export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export const TEST_GUEST = {
  name: "Teste QA",
  phone: "(47) 99999-0001",
  phoneE164: "+5547999990001",
  email: "qa@temesa.test",
};

export async function completeWidgetBooking(page: Page) {
  const ocasiaoCard = page.locator('[data-testid="occasion-card"]').first();
  if (await ocasiaoCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await ocasiaoCard.click();
  }
  await page.locator('[data-testid="party-size-card"]').first().click();
  await page.locator('[data-testid="calendar-day"][data-today="true"]').click();
  await page.locator('[data-testid="time-slot"]').first().click();
  const continueBtn = page.getByRole("button", { name: /continuar|próximo/i });
  if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await continueBtn.click();
  }
  await page.getByLabel(/nome|name/i).fill(TEST_GUEST.name);
  await page.getByLabel(/whatsapp|telefone|phone/i).fill(TEST_GUEST.phone);
  await page.getByRole("checkbox", { name: /lgpd|privacidade/i }).check();
  await page.getByRole("button", { name: /confirmar reserva|confirm/i }).click();
  await expect(page.locator('[data-testid="booking-success"]')).toBeVisible({ timeout: 15_000 });
}

export async function callCron(page: Page, endpoint: string) {
  const response = await page.request.get(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status(), body };
}

export async function getLatestConfirmToken(page: Page): Promise<string> {
  const response = await page.request.get(`${BASE_URL}/api/test/latest-token`);
  if (!response.ok()) throw new Error("Endpoint /api/test/latest-token indisponível");
  const { token } = await response.json();
  return token;
}
