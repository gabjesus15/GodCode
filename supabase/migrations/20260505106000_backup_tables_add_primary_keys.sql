-- Tablas de backup sin PK (advisor no_primary_key): añadir PK solo si `id` es NOT NULL y único.

DO $$
BEGIN
  IF to_regclass('public.backup_products') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conrelid = 'public.backup_products'::regclass AND contype = 'p'
    ) THEN
      IF NOT EXISTS (SELECT 1 FROM public.backup_products WHERE id IS NULL) THEN
        ALTER TABLE public.backup_products ALTER COLUMN id SET NOT NULL;
        ALTER TABLE public.backup_products ADD PRIMARY KEY (id);
      ELSE
        RAISE NOTICE 'backup_products: filas con id NULL; no se añadió PK automáticamente.';
      END IF;
    END IF;
  END IF;

  IF to_regclass('public.backup_product_prices') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conrelid = 'public.backup_product_prices'::regclass AND contype = 'p'
    ) THEN
      IF NOT EXISTS (SELECT 1 FROM public.backup_product_prices WHERE id IS NULL) THEN
        ALTER TABLE public.backup_product_prices ALTER COLUMN id SET NOT NULL;
        ALTER TABLE public.backup_product_prices ADD PRIMARY KEY (id);
      ELSE
        RAISE NOTICE 'backup_product_prices: filas con id NULL; no se añadió PK automáticamente.';
      END IF;
    END IF;
  END IF;
END $$;
