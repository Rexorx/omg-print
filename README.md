# OMG Print Landing

Landing pública de OMG Print, desplegada automáticamente en Vercel:

- https://print.omaigad.com.mx
- https://omg-print.vercel.app

## Contratación de OMG Print

La página presenta el producto y permite contratar sin abandonar el recorrido de venta. Los carritos y el pago continúan procesándose de forma segura en Shopify.

Incluye:

- Los tres videos de presentación y demostración.
- Comparativa, funciones disponibles y preguntas frecuentes.
- Precios base en MXN más IVA, iguales en el HTML inicial y la vista cargada.
- Implementación de pago único: $4,500.
- Equipo de 1–5 cuentas: $499/mes o $4,990/año. Equipo de 6–10 cuentas: $899/mes o $8,990/año.
- Cuatro planes por tamaño de equipo y modalidad de pago, con suscripción de Shopify.
- Carrito verificado de implementación y licencia, sin códigos de campaña automáticos.
- Recuperación de sólo implementación para quien ya compró su licencia, con avisos de revisión.
- Favicon oficial unificado de OMG Print.

El formulario anterior y sus conexiones de captura fueron retirados.

## Publicación

Los cambios en `main` se despliegan automáticamente en Vercel.

## Verificación

`node --check script.js`

`node --test tests/*.test.mjs`

Las pruebas usan DOM y transporte simulados; no realizan compras ni activaciones.

Las notas SDD de septiembre en `docs/` conservan la evidencia histórica de esos cambios. La normalización del 22 de octubre retira la campaña vencida del código servido y mantiene las validaciones y la recuperación existentes. No modifica Shopify ni el backend ERP.
