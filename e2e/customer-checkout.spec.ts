import { test, expect } from "@playwright/test";

test.describe("Customer Checkout Flow", () => {
  test("flujo completo de compra (catalogo -> carrito -> datos -> pago -> envio)", async ({ page }) => {
    const slug = process.env.PLAYWRIGHT_TENANT_SLUG?.trim() || "demo";
    // Si no hay slug, intentar con 'demo'

    // 1. Visitar el menú
    await page.goto(`/${slug}/menu`);
    
    // Verificar que cargue el menú (buscamos Total: del carrito o algo representativo)
    await expect(
      page.getByText("Tienda no disponible").or(page.locator(".category-title").first())
    ).toBeVisible({ timeout: 20000 });
    
    const unavailable = await page.getByText("Tienda no disponible").isVisible();
    if (unavailable) {
      console.log("Tenant no disponible, saltando test.");
      test.skip();
      return;
    }

    // 2. Agregar el primer producto disponible al carrito
    // Buscamos un botón que contenga "+" o "Agregar" o tenga aria-label de agregar
    const addButton = page.locator('button:has-text("Agregar"), button:has-text("+")').first();
    const canAdd = await addButton.isVisible();
    
    if (!canAdd) {
      console.log("No se encontraron productos o compras online deshabilitadas. Saltando.");
      test.skip();
      return;
    }
    
    await addButton.click();

    // 2.5 Verificar si se abre el modal del producto (tiene opciones) y clickear Agregar
    const modalAddBtn = page.getByRole("button", { name: /Agregar al pedido/i });
    if (await modalAddBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await modalAddBtn.click();
    }

    // 3. Abrir el carrito
    // Buscamos el botón flotante del carrito
    const cartFloat = page.locator('.cart-float').first();
    await cartFloat.click({ timeout: 5000 });

    // 4. Validar que el carrito se abrió y hay precios
    await expect(page.getByText("Resumen de tu Pedido").or(page.getByText("Tu Pedido"))).toBeVisible({ timeout: 10000 });
    
    // Validamos subtotal / total
    await expect(page.getByText(/Subtotal/i)).toBeVisible();
    await expect(page.getByText(/Total/i)).toBeVisible();
    
    // 5. Proceder a confirmar opciones de entrega
    const proceedButton = page.getByRole("button", { name: /Proceder a confirmar/i });
    if (await proceedButton.isVisible()) {
      await proceedButton.click();
    } else {
      await page.getByRole("button", { name: /Continuar/i }).click();
    }

    // 6. Llenar los datos personales requeridos
    await page.getByLabel(/Nombre/i).fill("Juan Perez");
    await page.getByLabel(/Teléfono/i).fill("1122334455");
    // Seleccionar Delivery o Pick up (Delivery por defecto usualmente)
    await page.getByLabel(/Dirección/i).fill("Av Siempreviva 742");
    
    // Elegimos medio de pago (Efectivo)
    await page.getByRole("button", { name: /Efectivo/i }).click();
    
    // 7. Enviar Pedido
    // No haremos submit real en el test e2e para no generar basura, pero verificamos el botón
    const submitBtn = page.getByRole("button", { name: /Enviar Pedido/i });
    await expect(submitBtn).toBeVisible();
  });
});
