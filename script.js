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
    const messages = {
      inicio: "Selecciona cuándo te gustaría iniciar para poder preparar tu propuesta.",
      acepta_aviso_privacidad: "Para enviar tu solicitud, acepta el Aviso de Privacidad.",
      nombre: "Completa tu nombre para continuar.",
      empresa: "Completa el nombre de tu imprenta para continuar.",
      telefono: "Completa tu número de WhatsApp para continuar.",
      email: "Completa un correo válido para continuar.",
      usuarios: "Selecciona cuántas cuentas necesitas.",
      sucursales: "Selecciona cuántas sucursales operas.",
      pedidos_mensuales: "Selecciona el volumen aproximado de pedidos.",
      detalle: "Cuéntanos brevemente qué quieres mejorar."
    };
    enterpriseError.textContent = messages[firstInvalid.name] || "Completa los campos obligatorios marcados antes de continuar.";
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
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
