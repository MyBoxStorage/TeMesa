import { clerk } from "@clerk/testing/playwright";
import { test as setup, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, ".auth/user.json");

setup("autenticar usuário de testes", async ({ page }) => {
  // /sign-in usa AuthedProviders → ClerkProvider → window.Clerk carrega aqui
  await page.goto("/sign-in");

  // Login programático com email + senha
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: process.env.E2E_CLERK_USER_IDENTIFIER!,
      password: process.env.E2E_CLERK_USER_PASSWORD!,
    },
  });

  // Confirma que chegou no dashboard
  await page.goto("/dashboard/reservas");
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });

  // Salva sessão para todos os outros testes
  await page.context().storageState({ path: AUTH_FILE });
  console.log("\n  Sessao salva!\n");
});
