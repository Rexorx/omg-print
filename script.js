const form = document.getElementById("betaForm");
const statusEl = document.getElementById("formStatus");
const success = document.getElementById("successScreen");
const closeSuccess = document.getElementById("closeSuccess");

// Supabase — proyecto Omaigad
const SUPABASE_URL = "https://ejbdozhbnfekhckaskbg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oEQcwx--eNG0wUEamzO6pQ_5dxcK4qo";

// Email de aviso. Supabase es el registro principal.
// FormSubmit puede pedir una activación única por correo en el primer envío.
const FORM_ENDPOINT = "https://formsubmit.co/ajax/Orlandohsanchez@gmail.com";

const SOCIAL_LINKS = {
  youtube: "https://www.youtube.com/@OmaigadMx",
  tiktok: "https://www.tiktok.com/@omaigad.mx",
  facebook: "https://www.facebook.com/share/1JZktjbHcK/?mibextid=wwXIfr",
  instagram: "https://www.instagram.com/omaigadmx/"
};

document.querySelectorAll("[data-social]").forEach(link => {
  const key = link.dataset.social;
  if (SOCIAL_LINKS[key]) {
    link.href = SOCIAL_LINKS[key];
  }
});

function validPhone(countryCode, phone) {
  return /^\+\d{1,4}$/.test(countryCode) && /^\d{10}$/.test(phone);
}

function getAttribution() {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign");

  let origen = utmSource || "Directo";

  if (!utmSource && document.referrer) {
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (host.includes("tiktok")) origen = "TikTok";
      else if (host.includes("instagram")) origen = "Instagram";
      else if (host.includes("facebook")) origen = "Facebook";
      else if (host.includes("youtube") || host.includes("youtu.be")) origen = "YouTube";
      else origen = host.replace(/^www\./, "");
    } catch (_) {}
  }

  return {
    origen,
    utm_source: utmSource || null,
    utm_medium: utmMedium || null,
    utm_campaign: utmCampaign || null
  };
}

async function saveLeadToSupabase(lead) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/omg_print_leads`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(lead)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${response.status}: ${text}`);
  }
}

async function sendEmailNotification(payload) {
  try {
    await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        ...payload,
        _subject: "Nueva aplicación — OMG Print Beta Fundadores",
        _template: "table",
        _captcha: "false"
      })
    });
  } catch (error) {
    // No bloqueamos la aplicación: el lead ya está registrado en Supabase.
    console.warn("No se pudo enviar la notificación por email:", error);
  }
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.className = "form-status";
  statusEl.textContent = "";

  const data = new FormData(form);
  const nombre = (data.get("nombre") || "").trim();
  const countryCode = (data.get("codigo_pais") || "").trim();
  const phone = (data.get("telefono") || "").trim();
  const email = (data.get("email") || "").trim();
  const attribution = getAttribution();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (!validPhone(countryCode, phone)) {
    statusEl.classList.add("error");
    statusEl.textContent = "Usa un código de país con + y un teléfono de exactamente 10 dígitos.";
    return;
  }

  const lead = {
    nombre,
    codigo_pais: countryCode,
    telefono: phone,
    email,
    empresa: (data.get("empresa") || "").trim() || null,
    produccion: data.get("produccion") || null,
    equipo: data.get("equipo") || null,
    control_actual: data.get("control") || null,
    problema_principal: (data.get("problema") || "").trim() || null,
    estado: "Nuevo",
    origen: attribution.origen,
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    pagina: window.location.href
  };

  try {
    statusEl.classList.add("loading");
    statusEl.textContent = "Enviando aplicación…";

    // 1) Registro principal
    await saveLeadToSupabase(lead);

    // 2) Aviso por email sin bloquear la experiencia del usuario
    sendEmailNotification({
      nombre,
      telefono: `${countryCode} ${phone}`,
      email,
      empresa: lead.empresa || "",
      produccion: lead.produccion || "",
      equipo: lead.equipo || "",
      control_actual: lead.control_actual || "",
      problema_principal: lead.problema_principal || "",
      origen: lead.origen,
      utm_source: lead.utm_source || "",
      utm_medium: lead.utm_medium || "",
      utm_campaign: lead.utm_campaign || ""
    });

    statusEl.textContent = "";
    form.reset();

    success.classList.add("show");
    success.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  } catch (err) {
    console.error(err);
    statusEl.className = "form-status error";
    statusEl.textContent = "No pudimos enviar tu aplicación. Revisa tu conexión e inténtalo nuevamente.";
  }
});

closeSuccess?.addEventListener("click", () => {
  success.classList.remove("show");
  success.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
});

success?.addEventListener("click", e => {
  if (e.target === success) closeSuccess.click();
});
