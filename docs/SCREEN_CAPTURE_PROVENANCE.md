# Pantallas de demostración · octubre de 2026

Las seis imágenes de `assets/screens/` muestran componentes del sistema OMG Print actual renderizados en un entorno local aislado. No son capturas de cuentas o pedidos reales.

## Fuente y datos

- Fuente consultada: app118, commit `f06221e91530cb4819ea4f2b59b00750140e04da`.
- Capturas: 1600 × 1000 px; escala de interfaz 90%, una preferencia disponible en el sistema.
- Componentes y estilos copiados a un ejecutor separado, con API local simulada y fixtures creados para esta demostración.
- Empresa, integrantes, clientes, productos, pedidos, folios, fechas, precios y movimientos de las imágenes son ficticios.
- El navegador sólo solicitó recursos del servidor local. Las solicitudes externas se bloquearon antes de navegar; el informe de captura registró cero solicitudes externas y cero errores de página.
- La aplicación y sus datos de producción no se modificaron.

## Lo que muestra cada imagen

| Archivo | Componente o vista | Función comprobada |
| --- | --- | --- |
| `quote.webp` | Nueva cotización / `Sale` | Productos por m² y pieza, medidas, acabado, carrito y total |
| `order.webp` | Saldos y `OrderDetail` | Total, anticipo, saldo, historial de pagos y controles PDF/ticket |
| `production.webp` | `OrdersKanban`, departamento Diseño | Pedidos por etapa y controles para mover trabajos |
| `cash.webp` | `Cash` | Caja abierta, turnos, entradas, salidas y medios de pago |
| `products.webp` | Catálogo de productos | Precios y unidades m² / pieza |
| `team.webp` | Configuración del equipo | Permisos de un integrante ficticio |

La cotización muestra un estado de desplazamiento de la interfaz para dar prioridad a los productos y sus importes. La vista de permisos es un diálogo real del sistema. Los controles contenidos en las imágenes son ilustrativos; el carrusel ofrece navegación y ampliación de las capturas.

## Validación de la landing

Se revisaron los tamaños 320, 390, 768, 1440 y 1920 px, las seis imágenes, los controles de 44 px, flechas/Home/End, gesto táctil nativo, ampliación, cierre con Escape y recuperación del foco. Sin desbordamiento horizontal ni errores JavaScript.

Las 54 pruebas existentes de carrito, recuperación de implementación y vigencia de precios pasaron. Los cinco CTA de contratación se comprobaron también con respuestas Shopify ficticias, sin abrir pagos ni crear carritos reales. Se conservan íntegros el script comercial, precios, cupones, enlaces, formulario Enterprise, videos y configuración de publicación existente.

El proyecto es HTML/CSS/JavaScript estático: no tiene tareas de compilación, tipos o lint configuradas. Se comprobaron la sintaxis de ambos archivos JavaScript y la estructura/recursos del documento en navegador. La publicación continúa en el proyecto Vercel existente de `Rexorx/omg-print`.
