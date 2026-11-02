# Política de seguridad

## Cómo reportar una vulnerabilidad

No abras un issue público. Repórtala en privado desde la pestaña **Security → Report a vulnerability** de este repositorio (GitHub Private Vulnerability Reporting).

Incluye:

- qué componente afecta (tienda pública, panel, `/cuenta`, super admin, API, servicio de alta);
- cómo reproducirla, paso a paso;
- el impacto que ves (qué datos o acciones quedan expuestos).

No accedas a datos de otros negocios o clientes más allá de lo mínimo para demostrar el problema, no hagas pruebas de denegación de servicio y no uses ingeniería social contra el equipo ni los clientes.

## Plazos

| Severidad | Primera respuesta | Corrección objetivo |
|-----------|-------------------|---------------------|
| Crítica   | 24 horas          | 7 días              |
| Alta      | 3 días            | 30 días             |
| Media     | 7 días            | 90 días             |
| Baja      | 14 días           | Próxima versión     |

Te avisamos cuando esté corregida y, si quieres, te damos crédito en la nota del cambio.

## Alcance

- La aplicación de este repositorio (`godcode.me`, los subdominios de los negocios y sus dominios propios).
- El servicio `services/onboarding-billing`.

Fuera de alcance: servicios de terceros (Supabase, Mercado Pago, PayPal, Resend), informes automáticos sin una prueba de impacto, y cabeceras o configuraciones sin un ataque concreto.
