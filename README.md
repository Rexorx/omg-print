# OMG Print Landing

Landing page estática lista para desplegar en `print.omaigad.com.mx`.

## Archivos
- `index.html`: estructura completa
- `styles.css`: diseño responsive
- `script.js`: formulario + salida a WhatsApp

## Antes de publicar
1. WhatsApp ya configurado: +52 981 175 5666.
2. Los tres espacios de video incluyen el guion de grabación. Cuando estén listos, reemplaza cada bloque por el video correspondiente.
3. Cuando tengas testimonios beta reales, sustituye los placeholders.
4. Supabase se conectará en una etapa posterior.
5. Si quieres cobrar una reserva, conecta el CTA final con Shopify Checkout, Mercado Pago o Stripe.

## Despliegue automático recomendado

### Opción A — Vercel
1. Crea un repositorio GitHub con estos archivos.
2. Importa el repo en Vercel.
3. Configura el dominio `print.omaigad.com.mx`.
4. En el DNS de tu dominio agrega el registro que Vercel indique.
5. Cada `git push` actualizará la web automáticamente.

### Opción B — Netlify
Mismo flujo: GitHub → Netlify → dominio personalizado → deploy automático.

## Dominio
Recomendado:
`print.omaigad.com.mx`

La tienda principal puede seguir en:
`www.omaigad.com.mx`

## Próxima integración
Para que la landing no dependa de WhatsApp como almacenamiento:
- Guardar leads en Supabase.
- Enviar notificación automática.
- Crear pipeline: Nuevo → Contactado → Demo → Fundador → No apto.
- Añadir analítica de conversión y eventos de TikTok Pixel/Meta Pixel.

## Nota
La urgencia de “10 imprentas” debe mantenerse real. Cuando se llenen los lugares,
cambia la página a lista de espera.
