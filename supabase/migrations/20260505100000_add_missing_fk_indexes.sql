-- Índices de soporte para FKs frecuentemente referenciados por advisors (unindexed_foreign_keys).
-- Usa CREATE INDEX (no CONCURRENTLY) para compatibilidad con el runner transaccional de migraciones.
-- En producción muy cargada, valorar ejecutar equivalentes CONCURRENTLY en ventana de mantenimiento.

-- cash_reconciliations
CREATE INDEX IF NOT EXISTS cash_reconciliations_branch_id_idx ON public.cash_reconciliations (branch_id);
CREATE INDEX IF NOT EXISTS cash_reconciliations_company_id_idx ON public.cash_reconciliations (company_id);
CREATE INDEX IF NOT EXISTS cash_reconciliations_created_by_idx ON public.cash_reconciliations (created_by);
CREATE INDEX IF NOT EXISTS cash_reconciliations_shift_id_idx ON public.cash_reconciliations (shift_id);

-- cash_shifts
CREATE INDEX IF NOT EXISTS cash_shifts_closed_by_idx ON public.cash_shifts (closed_by);

-- category_branch
CREATE INDEX IF NOT EXISTS category_branch_company_id_idx ON public.category_branch (company_id);

-- companies
CREATE INDEX IF NOT EXISTS companies_plan_id_idx ON public.companies (plan_id);

-- company_addons
CREATE INDEX IF NOT EXISTS company_addons_addon_id_idx ON public.company_addons (addon_id);

-- company_plan_change_schedules (FK a plans)
CREATE INDEX IF NOT EXISTS company_plan_change_schedules_current_plan_id_idx
  ON public.company_plan_change_schedules (current_plan_id);
CREATE INDEX IF NOT EXISTS company_plan_change_schedules_target_plan_id_idx
  ON public.company_plan_change_schedules (target_plan_id);

-- email_log
CREATE INDEX IF NOT EXISTS email_log_application_id_idx ON public.email_log (application_id);

-- onboarding
CREATE INDEX IF NOT EXISTS onboarding_application_addons_addon_id_idx
  ON public.onboarding_application_addons (addon_id);
CREATE INDEX IF NOT EXISTS onboarding_applications_plan_id_idx ON public.onboarding_applications (plan_id);

-- order_items
CREATE INDEX IF NOT EXISTS order_items_branch_id_idx ON public.order_items (branch_id);
CREATE INDEX IF NOT EXISTS order_items_company_id_idx ON public.order_items (company_id);
CREATE INDEX IF NOT EXISTS order_items_created_by_idx ON public.order_items (created_by);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items (product_id);

-- order_payments
CREATE INDEX IF NOT EXISTS order_payments_branch_id_idx ON public.order_payments (branch_id);
CREATE INDEX IF NOT EXISTS order_payments_company_id_idx ON public.order_payments (company_id);
CREATE INDEX IF NOT EXISTS order_payments_created_by_idx ON public.order_payments (created_by);
CREATE INDEX IF NOT EXISTS order_payments_method_id_idx ON public.order_payments (method_id);
CREATE INDEX IF NOT EXISTS order_payments_order_id_idx ON public.order_payments (order_id);
CREATE INDEX IF NOT EXISTS order_payments_shift_id_idx ON public.order_payments (shift_id);

-- order_status_history
CREATE INDEX IF NOT EXISTS order_status_history_changed_by_idx ON public.order_status_history (changed_by);
CREATE INDEX IF NOT EXISTS order_status_history_company_id_idx ON public.order_status_history (company_id);
CREATE INDEX IF NOT EXISTS order_status_history_order_id_idx ON public.order_status_history (order_id);

-- payments_history
CREATE INDEX IF NOT EXISTS payments_history_company_id_idx ON public.payments_history (company_id);
CREATE INDEX IF NOT EXISTS payments_history_plan_id_idx ON public.payments_history (plan_id);

-- product_branch / product_prices / products
CREATE INDEX IF NOT EXISTS product_branch_company_id_idx ON public.product_branch (company_id);
CREATE INDEX IF NOT EXISTS product_branch_category_id_idx ON public.product_branch (category_id);
CREATE INDEX IF NOT EXISTS product_prices_company_id_idx ON public.product_prices (company_id);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products (category_id);

-- users
CREATE INDEX IF NOT EXISTS users_created_by_idx ON public.users (created_by);

-- Tablas de cupones (pueden no existir en entornos antiguos)
DO $$
BEGIN
  IF to_regclass('public.discount_coupons') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'discount_coupons' AND column_name = 'restricted_client_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS discount_coupons_restricted_client_id_idx ON public.discount_coupons (restricted_client_id)';
    END IF;
  END IF;

  IF to_regclass('public.discount_coupon_redemptions') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'discount_coupon_redemptions' AND column_name = 'coupon_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS discount_coupon_redemptions_coupon_id_idx ON public.discount_coupon_redemptions (coupon_id)';
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'discount_coupon_redemptions' AND column_name = 'order_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS discount_coupon_redemptions_order_id_idx ON public.discount_coupon_redemptions (order_id)';
    END IF;
  END IF;

  IF to_regclass('public.orders') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'discount_coupon_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS orders_discount_coupon_id_idx ON public.orders (discount_coupon_id)';
    END IF;
  END IF;

  IF to_regclass('public.inventory_movements') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'inventory_movements' AND column_name = 'inventory_item_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS inventory_movements_inventory_item_id_idx ON public.inventory_movements (inventory_item_id)';
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'inventory_movements' AND column_name = 'branch_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS inventory_movements_branch_id_idx ON public.inventory_movements (branch_id)';
    END IF;
  END IF;

  IF to_regclass('public.product_extras_groups') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'product_extras_groups' AND column_name = 'product_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS product_extras_groups_product_id_idx ON public.product_extras_groups (product_id)';
    END IF;
  END IF;

  IF to_regclass('public.product_inventory_recipe') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'product_inventory_recipe' AND column_name = 'inventory_item_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS product_inventory_recipe_inventory_item_id_idx ON public.product_inventory_recipe (inventory_item_id)';
    END IF;
  END IF;

  IF to_regclass('public.product_upsell_beverages') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'product_upsell_beverages' AND column_name = 'product_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS product_upsell_beverages_product_id_idx ON public.product_upsell_beverages (product_id)';
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'product_upsell_beverages' AND column_name = 'branch_id'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS product_upsell_beverages_branch_id_idx ON public.product_upsell_beverages (branch_id)';
    END IF;
  END IF;
END $$;
