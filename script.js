
const form = document.getElementById('betaForm');

// Cambia este número antes de publicar.
// Formato internacional sin "+"; ejemplo México: 529811234567
const SALES_WHATSAPP = "529811755666";

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const lines = [
    "Hola, quiero solicitar un lugar en OMG Print Beta.",
    "",
    `Nombre: ${data.get("nombre")}`,
    `Imprenta: ${data.get("empresa")}`,
    `WhatsApp: ${data.get("whatsapp")}`,
    `Producción: ${data.get("produccion")}`,
    `Equipo: ${data.get("equipo")}`,
    `Control actual: ${data.get("control")}`,
    `Problema principal: ${data.get("problema")}`
  ];
  const url = `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(lines.join("\\n"))}`;
  window.open(url, "_blank", "noopener");
});

// Los placeholders de video se pueden reemplazar por iframe de YouTube/Vimeo,
// o por <video controls> cuando tengas los archivos finales.
