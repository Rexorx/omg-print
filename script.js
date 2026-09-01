const DEADLINE = new Date("2026-09-01T05:30:30Z").getTime();
const IMPLEMENTATION_VARIANT_ID = "gid://shopify/ProductVariant/55106552693035";

const PLANS = {
  "basic-monthly": {
    variantId: "gid://shopify/ProductVariant/55107587113259",
    sellingPlanId: "gid://shopify/SellingPlan/119845617963"
  },
  "basic-annual": {
    variantId: "gid://shopify/ProductVariant/55107590291755",
    sellingPlanId: "gid://shopify/SellingPlan/119845585195"
  },
  "team-monthly": {
    variantId: "gid://shopify/ProductVariant/55136323862827",
    sellingPlanId: "gid://shopify/SellingPlan/119845388587"
  },
  "team-annual": {
    variantId: "gid://shopify/ProductVariant/55136315375915",
    sellingPlanId: "gid://shopify/SellingPlan/119845552427"
  }
};

const countdown = {
  days: document.getElementById("countDays"),
  hours: document.getElementById("countHours"),
  minutes: document.getElementById("countMinutes"),
  seconds: document.getElementById("countSeconds")
};

function twoDigits(value) {
  return String(value).padStart(2, "0");
}

function markOfferExpired() {
  document.body.classList.add("offer-expired");
  document.getElementById("launchMessage").textContent = "La oferta de lanzamiento finalizó. Consulta los planes vigentes:";
  document.getElementById("setupCurrent").textContent = document.getElementById("setupRegular").textContent;
  document.getElementById("setupRegular").hidden = true;

  document.querySelectorAll("shopify-cart").forEach((cart) => cart.removeAttribute("discount-codes"));
  document.querySelectorAll(".plan-card").forEach((card) => {
    const regularPrice = card.querySelector(".plan-price s");
    const currentPrice = card.querySelector("[data-promo-price]");
    const regularTotal = card.querySelector(".plan-total s");
    const currentTotal = card.querySelector("[data-promo-total]");
    const note = card.querySelector(".plan-note");

    currentPrice.textContent = regularPrice.textContent;
    currentTotal.textContent = `${regularTotal.textContent} + IVA`;
    regularPrice.hidden = true;
    regularTotal.hidden = true;
    note.textContent = "Precio regular vigente. Sin contrato forzoso.";
  });
}

function updateCountdown() {
  const remaining = Math.max(0, DEADLINE - Date.now());
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  countdown.days.textContent = twoDigits(days);
  countdown.hours.textContent = twoDigits(hours);
  countdown.minutes.textContent = twoDigits(minutes);
  countdown.seconds.textContent = twoDigits(seconds);

  if (remaining === 0) markOfferExpired();
  return remaining;
}

function addCartLine(cart, line) {
  return new Promise((resolve) => {
    let timeoutId;
    const finish = () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("shopify:cart:lines-update", finish);
      resolve();
    };

    document.addEventListener("shopify:cart:lines-update", finish, { once: true });
    cart.addLine(line);
    timeoutId = window.setTimeout(finish, 1500);
  });
}

async function openPlanCart(planId) {
  const plan = PLANS[planId];
  if (!plan) throw new Error("Plan no encontrado");

  await Promise.race([
    customElements.whenDefined("shopify-cart"),
    new Promise((_, reject) => window.setTimeout(() => reject(new Error("No fue posible cargar el carrito")), 10000))
  ]);

  const cart = document.getElementById(`cart-${planId}`);
  if (!cart?.addLine || !cart?.showModal) throw new Error("El carrito no está disponible");

  await addCartLine(cart, { variantId: IMPLEMENTATION_VARIANT_ID, quantity: 1 });
  await addCartLine(cart, {
    variantId: plan.variantId,
    quantity: 1,
    sellingPlanId: plan.sellingPlanId
  });
  cart.showModal();
}

document.querySelectorAll("[data-plan]").forEach((button) => {
  const originalLabel = button.textContent;
  button.addEventListener("click", async () => {
    const error = document.getElementById("checkoutError");
    button.disabled = true;
    button.textContent = "Preparando carrito…";
    error.textContent = "";

    try {
      await openPlanCart(button.dataset.plan);
    } catch {
      error.textContent = "No pudimos abrir el carrito. Inténtalo nuevamente o escríbenos por WhatsApp.";
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
});

const remaining = updateCountdown();
if (remaining > 0) {
  const timer = window.setInterval(() => {
    if (updateCountdown() === 0) window.clearInterval(timer);
  }, 1000);
}

const ENTERPRISE_SUPABASE_URL = "https://ejbdozhbnfekhckaskbg.supabase.co";
const ENTERPRISE_SUPABASE_KEY = "sb_publishable_oEQcwx--eNG0wUEamzO6pQ_5dxcK4qo";
const enterpriseModal = document.getElementById("enterpriseModal");
const enterpriseForm = document.getElementById("enterpriseForm");
const enterpriseSuccess = document.getElementById("enterpriseSuccess");
const enterpriseError = document.getElementById("enterpriseError");
const enterpriseSteps = [...document.querySelectorAll(".enterprise-step")];
const enterpriseProgress = [...document.querySelectorAll(".enterprise-progress span")];
const enterpriseBack = document.getElementById("enterpriseBack");
const enterpriseNext = document.getElementById("enterpriseNext");
const enterpriseSubmit = document.getElementById("enterpriseSubmit");
let enterpriseStep = 1;

function setEnterpriseStep(step) {
  enterpriseStep = step;
  enterpriseSteps.forEach((element) => element.classList.toggle("active", Number(element.dataset.step) === step));
  enterpriseProgress.forEach((element, index) => element.classList.toggle("active", index < step));
  enterpriseBack.hidden = step === 1;
  enterpriseBack.parentElement.classList.toggle("final", step === enterpriseSteps.length);
  enterpriseError.textContent = "";
}

function openEnterpriseForm() {
  enterpriseModal.classList.add("open");
  enterpriseModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("enterprise-open");
  window.setTimeout(() => enterpriseForm.elements.nombre.focus(), 100);
}

function closeEnterpriseForm() {
  enterpriseModal.classList.remove("open");
  enterpriseModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("enterprise-open");
}

function stepIsValid(step) {
  const currentStep = enterpriseSteps.find((element) => Number(element.dataset.step) === step);
  const requiredInputs = [...currentStep.querySelectorAll("[required]")];
  const firstInvalid = requiredInputs.find((input) => !input.checkValidity());
  if (firstInvalid) {
    firstInvalid.reportValidity();
    return false;
  }
  if (step === 3 && !currentStep.querySelector("input[name='necesidades']:checked")) {
    enterpriseError.textContent = "Selecciona al menos una necesidad de tu operación.";
    return false;
  }
  return true;
}

document.getElementById("openEnterpriseForm")?.addEventListener("click", openEnterpriseForm);
document.querySelectorAll("[data-close-enterprise]").forEach((button) => button.addEventListener("click", closeEnterpriseForm));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && enterpriseModal?.classList.contains("open")) closeEnterpriseForm();
});

document.getElementById("enterpriseCountry")?.addEventListener("change", (event) => {
  const option = event.target.options[event.target.selectedIndex];
  document.getElementById("enterpriseCountryCode").value = option.dataset.code || "";
});

function toggleCustomField(field, show) {
  const customField = enterpriseForm.querySelector(`[data-custom-for="${field}"]`);
  if (!customField) return;
  customField.classList.toggle("visible", show);
  const input = customField.querySelector("input, textarea");
  input.required = show;
  if (!show) input.value = "";
}

["pais", "usuarios", "sucursales", "pedidos_mensuales", "inicio", "inversion"].forEach((field) => {
  enterpriseForm.elements[field]?.addEventListener("change", (event) => toggleCustomField(field, event.target.value === "Otro"));
});
document.getElementById("otraNecesidad")?.addEventListener("change", (event) => toggleCustomField("otra_necesidad", event.target.checked));

enterpriseNext?.addEventListener("click", () => {
  if (stepIsValid(enterpriseStep)) setEnterpriseStep(Math.min(enterpriseSteps.length, enterpriseStep + 1));
});
enterpriseBack?.addEventListener("click", () => setEnterpriseStep(Math.max(1, enterpriseStep - 1)));

async function submitEnterpriseForm() {
  if (!stepIsValid(enterpriseStep)) return;
  const data = new FormData(enterpriseForm);
  const phone = String(data.get("telefono") || "").replace(/\D/g, "");
  const countryCode = String(data.get("codigo_pais") || "").replace(/\D/g, "");
  const integrations = String(data.get("integraciones_texto") || "").split(",").map((item) => item.trim()).filter(Boolean);
  const url = new URL(window.location.href);
  const payload = {
    nombre: String(data.get("nombre")).trim(), empresa: String(data.get("empresa")).trim(), pais: String(data.get("pais")) === "Otro" ? String(data.get("pais_otro")).trim() : String(data.get("pais")),
    codigo_pais: `+${countryCode}`, telefono: phone, email: String(data.get("email")).trim().toLowerCase(),
    usuarios: String(data.get("usuarios")) === "Otro" ? null : Number(data.get("usuarios")), usuarios_otro: String(data.get("usuarios_otro") || "") || null,
    sucursales: String(data.get("sucursales")) === "Otro" ? null : Number(data.get("sucursales")), sucursales_otro: String(data.get("sucursales_otro") || "") || null,
    pedidos_mensuales: String(data.get("pedidos_mensuales")) === "Otro" ? "Otro" : String(data.get("pedidos_mensuales")), pedidos_mensuales_otro: String(data.get("pedidos_mensuales_otro") || "") || null,
    necesidades: data.getAll("necesidades"), necesidades_otras: String(data.get("necesidades_otras") || "") || null, integraciones, detalle: String(data.get("detalle")).trim(),
    inicio: String(data.get("inicio")) === "Otro" ? "Otro" : String(data.get("inicio")), inicio_otro: String(data.get("inicio_otro") || "") || null,
    inversion: String(data.get("inversion")) === "Otro" ? "Otro" : String(data.get("inversion") || "") || null, inversion_otro: String(data.get("inversion_otro") || "") || null,
    consentimiento_email: data.get("consentimiento_email") === "on", consentimiento_whatsapp: data.get("consentimiento_whatsapp") === "on",
    acepta_aviso_privacidad: data.get("acepta_aviso_privacidad") === "on", utm_source: url.searchParams.get("utm_source"),
    utm_medium: url.searchParams.get("utm_medium"), utm_campaign: url.searchParams.get("utm_campaign")
  };
  if (!/^\+[0-9]{1,4}$/.test(payload.codigo_pais) || !/^[0-9]{7,15}$/.test(payload.telefono)) {
    enterpriseError.textContent = "Revisa el código de país y tu número de WhatsApp.";
    return;
  }
  enterpriseSubmit.disabled = true;
  enterpriseSubmit.textContent = "Enviando solicitud…";
  enterpriseError.textContent = "";
  try {
    const response = await fetch(`${ENTERPRISE_SUPABASE_URL}/rest/v1/omg_print_enterprise_leads`, {
      method: "POST", headers: { apikey: ENTERPRISE_SUPABASE_KEY, Authorization: `Bearer ${ENTERPRISE_SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`No fue posible registrar la solicitud (${response.status})`);
    enterpriseForm.hidden = true;
    enterpriseSuccess.hidden = false;
  } catch {
    enterpriseError.textContent = "No pudimos enviar tu solicitud. Inténtalo de nuevo en unos minutos.";
    enterpriseSubmit.disabled = false;
    enterpriseSubmit.textContent = "Solicitar propuesta Enterprise →";
  }
}

enterpriseForm?.addEventListener("submit", (event) => { event.preventDefault(); submitEnterpriseForm(); });
enterpriseSubmit?.addEventListener("click", submitEnterpriseForm);
