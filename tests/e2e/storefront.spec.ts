import { test, expect } from "@playwright/test";
test("browse, variant, cart quantity, compare and blocked demo checkout", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ROULEZ");
  await page.goto("/scooters");
  await expect(page.getByText("3 résultats")).toBeVisible();
  await page
    .getByRole("link", { name: "Urban One — Démo", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Urban One",
  );
  await page
    .getByRole("button", { name: "Ajouter au panier", exact: true })
    .click();
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { name: "Urban One — Démo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "+", exact: true }).click();
  await expect(page.locator("output")).toHaveText("2");
  await page.goto("/checkout");
  await expect(
    page.getByRole("button", { name: "Finaliser ma commande", exact: true }),
  ).toBeDisabled();
  await page.goto("/scooters");
  await page
    .getByRole("button", { name: "Comparer", exact: true })
    .nth(0)
    .click();
  await page
    .getByRole("button", { name: "Comparer", exact: true })
    .nth(1)
    .click();
  await page.goto("/compare");
  await expect(page.locator(".compare-table thead td")).toHaveCount(2);
  await page.goto("/search?q=Urban");
  await expect(page.getByText("1 résultats")).toBeVisible();
});
test("private and invalid routes fail closed without credentials", async ({
  page,
}) => {
  await page.goto("/account/orders");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/admin/products");
  await expect(
    page.getByRole("heading", { name: "Administration non configurée" }),
  ).toBeVisible();
  await page.goto("/order/success/JS-123");
  await expect(
    page.getByRole("heading", { name: "Cette route n’existe pas." }),
  ).toBeVisible();
  await page.goto("/unrelated");
  await expect(
    page.getByRole("heading", { name: "Cette route n’existe pas." }),
  ).toBeVisible();
});
for (const width of [360, 390, 768, 1024, 1440])
  test(`responsive homepage ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
    });
  });
test("language selection sets Arabic RTL and translated navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "المستقبل",
  );
});
test("required public and auth pages render and mobile search/language remain usable", async ({
  page,
}) => {
  for (const route of [
    "products",
    "ebikes",
    "accessories",
    "spare-parts",
    "wishlist",
    "compare",
    "about",
    "contact",
    "delivery",
    "warranty",
    "returns",
    "faq",
    "privacy",
    "terms",
    "login",
    "register",
    "forgot-password",
    "reset-password",
  ]) {
    await page.goto("/" + route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Cette route n’existe pas.")).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator(".mobile-menu summary").click();
  await page.getByLabel("Mobile language").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "Cart", exact: true }).click();
  await expect(page.locator("dialog.cart-drawer")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog.cart-drawer")).not.toBeVisible();
});
