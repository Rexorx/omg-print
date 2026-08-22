# OMG Print Landing V4

Cambios:
- Rediseño inspirado en la interfaz visual de OMG POS.
- Integrados los 3 videos de YouTube.
- Favicon OMG! incluido.
- Eliminada la frase sobre testimonios inventados.
- Eliminado el texto “OBJECIONES REALES”.
- Formulario obligatorio: nombre, código de país con +, teléfono de 10 dígitos y email.
- Envío por email a Orlandohsanchez@gmail.com usando FormSubmit.
- Pantalla de éxito “Socio Fundador”.
- Botones de YouTube, TikTok, Facebook e Instagram preparados.

IMPORTANTE: FormSubmit puede enviar un correo de activación la primera vez. Debes confirmarlo una sola vez en Orlandohsanchez@gmail.com.

Para redes sociales, edita SOCIAL_LINKS en script.js.

Para publicar: reemplaza index.html, styles.css y script.js en GitHub y agrega favicon.svg. Haz commit en main; Vercel actualizará print.omaigad.com.mx automáticamente.

Los videos ya están embebidos; si todavía están programados/privados pueden aparecer como no disponibles hasta su publicación, pero no necesitarás editar la web cuando se hagan públicos.


## V4 — Supabase + redes sociales
- Formulario conectado a `public.omg_print_leads` en el proyecto Supabase Omaigad.
- Supabase es ahora el registro principal de leads.
- El email a Orlandohsanchez@gmail.com queda como notificación secundaria.
- Se guardan automáticamente:
  - estado = Nuevo
  - origen
  - utm_source
  - utm_medium
  - utm_campaign
  - URL de la página
- Redes configuradas:
  - YouTube: https://www.youtube.com/@OmaigadMx
  - TikTok: https://www.tiktok.com/@omaigad.mx
  - Facebook: https://www.facebook.com/share/1JZktjbHcK/?mibextid=wwXIfr
  - Instagram: https://www.instagram.com/omaigadmx/

## Prueba recomendada
Después de publicar:
1. Llena el formulario tú mismo.
2. Confirma que aparece la pantalla de felicitación.
3. Revisa en Supabase > Table Editor > omg_print_leads.
4. Revisa el correo de Orlando.
5. Si FormSubmit manda un correo de activación, confírmalo una sola vez.
