# Migraciones solo del Panel

Estos archivos cambian funciones y tablas que usa la caja del Panel (GodCode-Panel), no la app del
menú. **No se corren con las migraciones de la app.** Van junto con el despliegue del Panel que las
usa: los parches 0009 a 0015 de la tasa BCV, que hoy están solo en el hilo de trabajo de Venezuela.

- `20261008_venezuela_cobro_y_caja.sql`: cobro en bolívares o mixto con la tasa de la base, vuelto en
  otra moneda y caja por moneda (apertura, arqueo y cierre). Requiere `20261007_exchange_rates.sql`.
- `20261009_payment_method_policy_v3_binance_pay.sql`: Binance Pay con comprobante obligatorio y
  liquidado en USD en la caja.

Antes de aplicar cualquiera, comparar las funciones vivas con `pg_get_functiondef` como dice la
cabecera de cada archivo: parten de versiones del repo del Panel.
