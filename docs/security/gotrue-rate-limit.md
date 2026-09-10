# Rate limiting del login de Supabase (GoTrue self-hosted)

> Discrepancia nº5 del nodo *Discrepancias Arquitectónicas*. **Requiere infraestructura, no código.**
> Ningún cambio en este repositorio puede cerrarla.

## El problema

El endpoint de login acepta intentos fallidos sin límite:

```
POST https://supabase.ghamnas.online/auth/v1/token?grant_type=password
8 intentos consecutivos con credenciales inválidas → 400 ×8. Ningún 429.
```

El Portal no puede protegerlo. La `anon key` (`sb_publishable_…`) viaja en el bundle
del cliente y GoTrue está expuesto en internet, así que un atacante llama al endpoint
directamente y se salta la aplicación entera. Un guard en `/api/*` sería cosmético:
solo cortaría a bots que respeten la ruta del navegador.

El Panel POS no tiene este agujero porque autentica server-side a través de su BFF
(`api/auth/login.ts`), con 50 req/IP + 10 req/IP+email en ventana de 15 minutos.

## Por qué no se arregla con variables de GoTrue

GoTrue expone `GOTRUE_RATE_LIMIT_*` para **email enviado, SMS, verify, OTP y refresh
de token**. No hay ninguna variable que cubra el *password grant*
(`/token?grant_type=password`), que es justo el endpoint de login.

Las que sí conviene fijar, aunque no resuelvan esto, para limitar el abuso de los
flujos de correo:

```bash
GOTRUE_RATE_LIMIT_HEADER=x-forwarded-for   # sin esto cuenta la IP del proxy, no la real
GOTRUE_RATE_LIMIT_EMAIL_SENT=30            # por hora
GOTRUE_RATE_LIMIT_VERIFY=30                # por 5 min
GOTRUE_RATE_LIMIT_TOKEN_REFRESH=150        # por 5 min
```

`GOTRUE_RATE_LIMIT_HEADER` es el más importante de los cuatro: detrás de un reverse
proxy, sin él GoTrue ve siempre la misma IP y sus límites se agotan de forma global
en lugar de por atacante.

## La solución: límite en el reverse proxy

Aplicar delante de `supabase.ghamnas.online`, acotado al endpoint de login.

### nginx

```nginx
# Zona de 10 MB ≈ 160 000 IPs. 5 intentos de login por minuto y IP.
limit_req_zone $binary_remote_addr zone=gotrue_login:10m rate=5r/m;

server {
    server_name supabase.ghamnas.online;

    location /auth/v1/token {
        # burst=5 permite una ráfaga corta (reintentos legítimos, autofill del
        # gestor de contraseñas); nodelay evita encolar y responder lento.
        limit_req zone=gotrue_login burst=5 nodelay;
        limit_req_status 429;

        proxy_pass http://gotrue_upstream;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

### Traefik

```yaml
http:
  middlewares:
    gotrue-login-ratelimit:
      rateLimit:
        average: 5      # por minuto
        burst: 5
        period: 1m
        sourceCriterion:
          requestHeaderName: X-Forwarded-For

  routers:
    gotrue-login:
      rule: "Host(`supabase.ghamnas.online`) && PathPrefix(`/auth/v1/token`)"
      middlewares:
        - gotrue-login-ratelimit
      service: gotrue
```

### Cloudflare

Si el dominio pasa por Cloudflare, una Rate Limiting Rule equivalente:

- **Expresión:** `http.host eq "supabase.ghamnas.online" and starts_with(http.request.uri.path, "/auth/v1/token")`
- **Límite:** 5 peticiones por minuto y por IP
- **Acción:** Block, 1 minuto

## Cómo verificar que quedó cerrado

Diez intentos con un email inexistente. Los primeros deben dar `400`; a partir del
límite, `429`:

```bash
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST "https://supabase.ghamnas.online/auth/v1/token?grant_type=password" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"email":"noexiste@example.invalid","password":"x"}'
done
```

Resultado esperado tras aplicar el límite: `400 ×5`, luego `429` en adelante.

## Precaución al elegir el umbral

5 por minuto y por IP es holgado para una persona y estrecho para fuerza bruta. Antes
de bajarlo, ten en cuenta que varios usuarios legítimos pueden compartir IP pública
(oficina con NAT, red móvil). Un umbral demasiado agresivo bloquea a un local entero
de cajeros que salen por la misma línea.
