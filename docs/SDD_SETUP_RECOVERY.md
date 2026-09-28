# Compra complementaria de implementación

Fecha: 27-09-2026. Estado: candidato separado, no publicado. Base: copia exacta de `work/omg-print-landing`, conservando las 36 pruebas existentes. El manifiesto de hashes base se guarda fuera del candidato. No se toca la fuente bajo revisión de PR3.

## Requisito y causa

Un comprador que pagó sólo la licencia necesita un paso visible para pagar únicamente la implementación usando el mismo correo y la misma cuenta de Shopify. Los cuatro CTA de contratación inicial siempre agregan ambos conceptos; usarlos de nuevo agregaría otra licencia. El ACK `pending:implementation` del webhook sólo lo recibe Shopify, no el comprador.

La variante de implementación `gid://shopify/ProductVariant/55106552693035` ya existe en la fuente base. No se inventa un handle ni se crea otro producto. Se conservan los precios, el cupón de implementación y la vigencia existentes. No se incluyen los cupones de licencia.

## Diseño acotado

- Se añade un acceso visible «Ya compré mi licencia» y un CTA «Completar sólo implementación», enlazado también desde la FAQ.
- La copia exige el mismo correo y cuenta usados en la licencia. Si ya pagó ambos conceptos, no está seguro o su compra anterior tuvo problemas de activación, debe solicitar revisión antes de volver a pagar. No se afirma que el landing haya verificado la licencia, ni se promete activación automática o inmediata.
- «Solicitar revisión» abre el editor de correo hacia el contacto ya presente en el formulario público de la fuente base. No envía mensajes ni incorpora datos del pedido automáticamente.
- Se reutilizan creación, estado en memoria, bloqueo global, resumen, relectura y comprobaciones del controlador existente. Una selección explícita de implementación requiere exactamente una línea: variante conocida, cantidad uno, sin selling plan. Cualquier licencia, línea adicional, descuento ajeno, recurrencia, precio o subtotal incorrecto bloquea el checkout.
- El resumen muestra la implementación como pago único y que no se agrega otra licencia; oculta la fila de modalidad recurrente. Reabrir no crea otra línea ni otro carrito confirmado durante la misma página.
- El carrito complementario se crea de forma independiente. No se limpian ni alteran carritos previos. No se crean pedidos, pagos ni datos personales desde el landing.
- Se conserva la incertidumbre de red y el bloqueo de reintentos automáticos del controlador base. No se promete idempotencia de carritos entre recargas ni se interpreta un carrito creado como una compra pagada.

## Gate antes de publicar

Publicación retenida hasta verificar en el backend productivo el comando atómico `registrar_compra_shopify_v1`, el handler compatible y la provisión vigente. Publicar sólo este CTA no repara el emparejamiento antiguo. Las órdenes históricas ambiguas sin intención atómica permanecen sujetas a conciliación: este cambio no las adopta ni modifica.

Comprobar el recorrido complementario con identidad coincidente, reserva 1:1, replay y conflictos, y después el seguimiento visible del comprador. La prueba de carrito no acredita envío de correo ni activación. Este candidato no añade mensajes, automatizaciones ni un endpoint público de estado. Las pruebas existentes del backend se reutilizan; no se repiten aquí.

## Verificación realizada

`node --check script.js`: PASS.

`node --test tests/cart-api.test.mjs tests/offer-boundary.test.mjs tests/setup-recovery.test.mjs`: **54 PASS, 0 FAIL, 0 omitidas**. Las 36 pruebas originales se conservaron sin editar; se añadieron 18 pruebas con DOM y red simulados para: una sola implementación y ningún selling plan/licencia; precio y descuento vigente; resumen correcto y restauración al elegir un plan; doble clic y reapertura; lectura final; bloqueo de línea extra/licencia, recurrencia, cantidad, precio/descuento; expiración; error y timeout sin recreación; CTA/FAQ y advertencia de revisión.

El gate automatizado usa DOM/red simulados. Después, una revisión independiente y smoke con Shopify real confirmaron CTA → resumen → relectura → checkout: sólo implementación, cantidad uno, sin licencia ni recurrencia; BETAFOUNDER aplicado, subtotal $2,500, IVA estimado $400 y total $2,900 MXN. Sin solicitud de entrega/envío y con facturación. Aviso y acciones visibles a 390×844. No se introdujeron datos personales ni se realizó compra. Evidencia externa: `outputs/setup-recovery-review-smoke-20260927.md`, `.json` y capturas.

La fuente original se verificó mediante hashes y permaneció intacta. Esta prueba real sólo acredita el carrito complementario; no correo, pago completado ni activación. El esquema de cuatro migraciones se preparó en producción después de sus guardas, con legacy y datos existentes sin cambios, pero Edge v12 continúa activo: el gate de emparejamiento permanece pendiente del corte y su validación.

## Reversa

Revertir exclusivamente el cambio del landing por el flujo GitHub/Vercel existente. Conservar los pedidos, intenciones y reservas del backend. No se revierte una compra ni se promete una devolución desde este cambio.
