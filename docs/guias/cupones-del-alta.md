# Cupones del alta

Códigos que un negocio nuevo escribe en el paso de pago de su registro (`/onboarding/pago`). Los creas en el super admin, en **Catálogo → Cupones del alta** (`/cupones`). No tienen nada que ver con los cupones que cada restaurante crea para sus comensales en el carrito.

## Qué puede hacer un cupón

| Tipo | Qué hace | Ejemplo |
|---|---|---|
| Porcentaje | Baja el primer pago ese porcentaje (plan × meses + extras) | `LANZAMIENTO20`: 20 % |
| Monto fijo | Resta esos dólares del primer pago. Si cubre todo, el alta se activa sin cobrar | `AMIGO10`: $10 |
| Meses gratis | No cambia el importe: suma meses de regalo a los que pague | `ALIADO`: +2 meses |

Cada cupón además tiene:

- **Mantener la promo «+1 mes gratis en tu primer pago».** Encendido por defecto: la persona recibe el descuento y también el mes de regalo. Apágalo si el cupón ya es generoso.
- **Meses mínimos a pagar.** Un cupón de 12 meses solo aplica si la persona paga 12. Si elige menos, la página le avisa y no lo aplica.
- **Planes.** Sin marcar ninguno vale para todos. Marcando, solo para esos.
- **Límite de usos** y **vigencia** (desde / hasta). Al llegar al límite o vencer, el cupón deja de aplicar solo.
- **Un uso por correo.** Nadie puede canjear el mismo cupón dos veces con el mismo correo.

## Cómo lo vive la persona

1. En el paso de pago pulsa «¿Tienes un cupón?», escribe el código y pulsa «Aplicar».
2. El resumen muestra la línea del cupón y el nuevo total (o los meses de regalo).
3. Paga como siempre: PayPal cobra el importe con descuento; con transferencia o Pago Móvil el monto a transferir ya trae el descuento.
4. Si el cupón cubre todo el importe, no hay pago: aparece «Activar mi cuenta» y el negocio queda activo al instante.

Si el cupón deja de valer entre que lo aplicó y que paga (venció, se agotó, cambió de plan), el checkout lo quita, se lo dice y puede pagar sin él o probar otro.

## Qué ves tú

- En **Pagos por validar** el concepto dice `cupón CODIGO (−$X)` o `(+N meses gratis)`: así el comprobante cuadra con el importe.
- Los avisos de Telegram y el correo al equipo también traen el cupón.
- En `/cupones`, cada tarjeta muestra usos, vigencia y el botón «Canjes» con quién lo usó, cuándo y cuánto se descontó.
- Un cupón con canjes no se borra, se desactiva: el historial se queda.

## Reglas que conviene saber

- El descuento se calcula en el servidor al iniciar el pago, con los meses definitivos. Lo que la página muestra antes es una vista previa con la misma fórmula.
- Al iniciar el pago se guarda una «foto» de lo prometido (descuento, meses gratis, si mantiene la promo). Si el cupón vence mientras revisas un comprobante, la persona recibe lo que vio al pagar.
- El canje se registra cuando el alta queda cobrada y activa. Un pago abandonado no gasta usos.
- El límite de usos se revisa al aplicar y al iniciar el pago; en una carrera muy ajustada pueden pasar uno o dos canjes de más. Para cupones de pocos usos, pon el límite con margen.
- Base: tablas `subscription_coupons` y `subscription_coupon_redemptions`, columnas `coupon_*` en `onboarding_applications`, función `redeem_subscription_coupon`. Migración `20261006_subscription_coupons.sql`, aplicada el 5 de octubre de 2026.
