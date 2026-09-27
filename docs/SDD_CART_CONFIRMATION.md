# Contratación inicial: carrito verificado y vigencia de lanzamiento

Fecha: 2026-09-27. Estado: cuatro contrataciones iniciales verificadas con Shopify real; publicación retenida por los gates del backend de activación. No publicado.

Nota de esta copia separada: el controlador base descrito aquí se amplía con una selección de sólo implementación en [SDD_SETUP_RECOVERY.md](SDD_SETUP_RECOVERY.md). Conserva las 36 pruebas originales y suma 18 focales; la publicación del acceso complementario espera verificar el backend de emparejamiento. La evidencia comercial histórica de este documento no acredita ese nuevo recorrido.

## Fuente y despliegue existente

Landing `Rexorx/omg-print`, rama `main`, base `dc780f4eb885441c12ffd8179ada7e3c18706c15`, del 1 de septiembre de 2026. Los seis archivos base se obtuvieron del conector GitHub. No hay `AGENTS.md` en ese árbol ni instrucciones adicionales encontradas en las carpetas ascendentes. No se reconstruyó código de capturas ni se usó el repositorio Sites de la aplicación.

El Git local no pudo descargar el historial por conexión HTTPS bloqueada desde el proceso. La carpeta es una copia de fuente verificada, no un checkout con historial. El README original declara `main` → Vercel automático. El commit base tiene estado Vercel `success`, «Deployment has completed», destino `print.omaigad.com.mx` / `omg-print.vercel.app`. La presencia pública de `script.js?v=20260906` se confirmó en navegador; no equivale a un hash completo del despliegue.

## Requisito y decisiones vigentes

- Contratación inicial: exactamente una implementación de pago único y una licencia, con variante/selling plan/modalidad correctos y cantidades de uno.
- Conservar los importes y códigos existentes. El último acuerdo del usuario mantiene la promoción hasta terminar el **1 de octubre de 2026**, America/Mexico_City. Corte exclusivo: `2026-10-02T06:00:00Z`. Desde el 2 de octubre se muestran los precios regulares ya definidos.
- Las empresas nuevas no se presentan como fundadoras. El código técnico de descuento `BETAFOUNDER` se conserva para compatibilidad; no se modifican beneficios históricos ni se infiere un cupo de diez en el landing.
- Cupones para lives posteriores: decisión comercial futura, sin automatización añadida.
- Una respuesta incierta no puede mostrarse como compra lista ni provocar reintentos ciegos.

## Causa confirmada

El helper anterior interpretaba cualquier evento `shopify:cart:lines-update` o 1.5 segundos transcurridos como éxito, luego agregaba la licencia y abría el modal sin validar contenido. La primera propuesta de esperar `event.promise` pasó pruebas simuladas pero **falló con el CDN real**: el componente agregó implementación y no emitió ese evento estándar. Una sonda local de captura en window/document confirmó ausencia de eventos; el DOM del componente mostró el alta. Por eso no se promovió esa propuesta.

El parche final usa directamente la API pública Storefront Cart, cuyo resultado es comprobable. No depende del CDN ni de estado privado/shadow DOM.

## Diseño final

1. Una operación global bloquea todos los CTA; doble clic comparte/ignora la misma preparación.
2. `cartCreate` envía ambas líneas juntas, país MX y los códigos existentes mientras la promoción esté vigente. No modifica, limpia ni elimina carritos anteriores.
3. Se revisan errores GraphQL, `userErrors` y `warnings`. Se valida el carrito completo: dos líneas, variante, selling plan, cantidades, moneda MXN, precios por línea, subtotal anunciado, códigos aplicables y URL HTTPS de la tienda esperada.
4. Se conserva sólo en memoria el ID de cada carrito confirmado por plan/vigencia. Abrir otra vez ese plan vuelve a leerlo; no agrega líneas ni repite `cartCreate`.
5. Si la creación agota el plazo o pierde respuesta, se bloquean nuevos intentos en esa página y se informa que no se inició pago. Puede haber quedado un carrito huérfano en Shopify, nunca un pedido/cobro causado por este controlador. No se promete idempotencia entre recargas.
6. Una lectura adicional confirma el carrito antes de mostrar un resumen nativo con el estilo del landing. «Continuar a Shopify» hace otra lectura y las mismas validaciones antes de navegar a la URL confirmada. No se crea pedido ni pago desde este código.
7. Si cambia la vigencia mientras el resumen está abierto, se bloquea ese checkout y se pide seleccionar nuevamente el plan. Quitar setup/cambiar cantidades en otro contexto también bloquea la lectura final; no se repara o borra silenciosamente.
8. Banner, FAQ, claims promocionales y README coinciden con la última vigencia. Al expirar, los precios cambian a los regulares ya presentes y los claims dejan de anunciar lanzamiento.

No se envían datos de cliente, email ni credenciales. No se imprimen ni almacenan IDs de carrito/URLs de checkout. El diagnóstico temporal fue retirado.

## Verificación

`node --check script.js`

`node --test tests/cart-api.test.mjs tests/offer-boundary.test.mjs`

36 pruebas locales: cuatro planes, dos líneas en una creación, setup no recurrente, reread, doble clic, reutilización, eliminación de setup, modalidad/variante/cantidad incompatibles, precios y descuentos inválidos, moneda/paginación/checkout ajeno, error/advertencia/red/timeout, mensaje específico de descuento inactivo, lectura fallida sin recrear, corte de fecha y expiración durante resumen. Transportes y DOM simulados: no son Auth/Shopify E2E.

Query y mutation pasaron el validador oficial local de Shopify. Antes de corregir la vigencia, la API real respondió con dos líneas y sin `userErrors`, pero con `DISCOUNT_CURRENTLY_INACTIVE`; el controlador bloqueó el pago correctamente. El defecto de configuración se corrigió después y se repitieron los cuatro planes con resultado PASS, como se detalla a continuación.

El 27 de septiembre, entre 22:37:58Z y 22:38:48Z, el smoke real confirmó `BETAFOUNDER` aplicable en los cuatro planes y los cuatro códigos de licencia no aplicables:

| Plan | Código no aplicable | Implementación real | Licencia real | Subtotal real | Subtotal anunciado |
| --- | --- | ---: | ---: | ---: | ---: |
| 1–5 mensual | BETA6MENSUAL | $2,500 | $499 | $2,999 | $2,799 |
| 1–5 anual | BETA6ANUAL | $2,500 | $4,990 | $7,490 | $5,490 |
| 6–10 mensual | BETA10MENSUAL | $2,500 | $899 | $3,399 | $2,999 |
| 6–10 anual | BETA10ANUAL | $2,500 | $8,990 | $11,490 | $7,490 |

Importes MXN, antes del cálculo final de impuestos. Este registro conserva la reproducción del fallo anterior: cantidades uno, implementación no recurrente, licencia con selling plan y bloqueo visible. No se conservaron IDs de carrito ni URLs de checkout en evidencia.

Después, se guardó en Shopify el fin de los cinco descuentos a las 00:00 CST del 2 de octubre, conservando importes, productos, combinaciones, 12 pagos mensuales y primer pago anual. Los cuatro planes de PR3 `04b41a8` pasaron resumen, relectura y navegación a checkout real: subtotales $2,799 / $5,490 / $2,999 / $7,490; exactamente dos líneas de cantidad uno y ambos descuentos aplicados. Resumen móvil 390×844 PASS. Equipo mensual pedía envío por estar marcado como producto físico; se corrigió sólo esa opción y la regresión del checkout a las 23:04:53Z confirmó facturación sin entrega, conservando cantidades e importes. Evidencia externa: `outputs/OMG-Print-landing-smoke-20260927.md` y `.json`.

El primer candidato con eventos fue descartado; su suite simulada no se cuenta como evidencia del controlador final. Ninguna prueba realizó compra, ingresó datos personales ni pagó. Los ajustes administrativos de vigencia y envío fueron correcciones separadas; no son cambios realizados por el controlador del landing.

## Límites y gates

- Contratación inicial: 4/4 carritos y checkout PASS. La ampliación de sólo implementación tiene su evidencia y gates separados; no se extrapola este resultado.
- Se verificaron los ciclos de descuento en Admin, pero no se ejecutó un cobro recurrente. El rótulo de subtotal recurrente del checkout excluye descuentos aplicables y no acredita una renovación.
- No publicar hasta verificar HMAC y el corte al backend de alta regular/emparejamiento. Preparar el esquema SQL por sí solo no activa el nuevo caller. Carrito confirmado no equivale a compra pagada, correo recibido ni empresa activada.
- Este flujo no evita compras sueltas desde otros canales de Shopify ni asegura atomicidad del checkout externo. Backend de activación debe manejar licencia sin implementación por su flujo autorizado.
- La fuente base no tenía un CTA de **sólo implementación**: los cuatro CTA eran setup + licencia. Esta copia añade el candidato complementario documentado por separado; su gate de emparejamiento y seguimiento del comprador sigue pendiente antes de publicar.
- No hay persistencia de cartId entre recargas. Se evita duplicación de líneas en el mismo carrito; otro carrito abandonado no se considera compra/pago duplicado.

Publicación: comparar contra el commit base, volver a comprobar que `main` no avanzó y publicar por GitHub→Vercel existente. No Sites para este landing. Esperar el estado Vercel del commit nuevo y confirmar el script público y smoke. Rollback: revertir sólo el commit del landing y verificar el despliegue del revert; no cambiar Shopify ni datos de aplicación.

## Fuentes primarias

- [Repositorio base](https://github.com/Rexorx/omg-print/tree/dc780f4eb885441c12ffd8179ada7e3c18706c15).
- [Cambio histórico al 6 de septiembre](https://github.com/Rexorx/omg-print/commit/b361b4248f68d58d79343739cb838fa911fc2156).
- [cartCreate](https://shopify.dev/docs/api/storefront/latest/mutations/cartCreate).
- [Cart: creación, lectura y checkout](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).
- [Acceso tokenless de Cart](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api).
- [CartLineCost](https://shopify.dev/docs/api/storefront/latest/objects/CartLineCost) y [CartCost](https://shopify.dev/docs/api/storefront/latest/objects/CartCost).
- [Componente original](https://shopify.dev/docs/api/storefront-web-components/components/shopify-cart).
