// Exclusive end: October 1, 2026 remains valid through 23:59:59.999 in Mexico City.
const DEADLINE = new Date("2026-10-02T06:00:00Z").getTime();
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
  document.querySelectorAll("[data-regular-text]").forEach((element) => {
    element.textContent = element.dataset.regularText;
  });
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

const CART_TIMEOUT_MS = 15000;
const CART_FIELDS = `id checkoutUrl
  discountCodes { code applicable }
  cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
  lines(first: 10) {
    nodes {
      __typename id quantity
      merchandise { ... on ProductVariant { id } }
      cost { totalAmount { amount currencyCode } }
      ... on CartLine { sellingPlanAllocation { sellingPlan { id } } }
    }
    pageInfo { hasNextPage }
  }`;
const CART_QUERY = `query OmgPrintCart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`;
const CART_CREATE = `mutation OmgPrintInitialCart($input: CartInput!) {
  cartCreate(input: $input) { cart { ${CART_FIELDS} } userErrors { code } warnings { code } }
}`;
const CHECKOUT_OFFERS = {
  'basic-monthly': { label: 'Equipo 1–5 · Mensual', regular: 499, promo: 299, codes: ['BETAFOUNDER', 'BETA6MENSUAL'] },
  'basic-annual': { label: 'Equipo 1–5 · Anual', regular: 4990, promo: 2990, codes: ['BETAFOUNDER', 'BETA6ANUAL'] },
  'team-monthly': { label: 'Equipo 6–10 · Mensual', regular: 899, promo: 499, codes: ['BETAFOUNDER', 'BETA10MENSUAL'] },
  'team-annual': { label: 'Equipo 6–10 · Anual', regular: 8990, promo: 4990, codes: ['BETAFOUNDER', 'BETA10ANUAL'] }
};

function cartSelection(planId, promotional) {
  const setup = { variantId: IMPLEMENTATION_VARIANT_ID, sellingPlanId: null, cents: (promotional ? 2500 : 4500) * 100 };
  if (planId === 'implementation-only') {
    return { label: 'Completar sólo implementación', expected: [setup], codes: promotional ? ['BETAFOUNDER'] : [] };
  }
  const plan = PLANS[planId], offer = CHECKOUT_OFFERS[planId];
  if (!plan || !offer) throw new Error('Plan no encontrado');
  return {
    label: offer.label,
    expected: [setup, { ...plan, cents: (promotional ? offer.promo : offer.regular) * 100 }],
    codes: promotional ? offer.codes : []
  };
}
const confirmedCarts = new Map();
let preparingCart = null;
let uncertainCartCreation = false;
let displayedCart = null;

function boundedCartWait(promise, onTimeout = () => {}) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = window.setTimeout(() => { onTimeout(); reject(new Error('No recibimos confirmación de Shopify. No se inició ningún pago.')); }, CART_TIMEOUT_MS);
  })]).finally(() => window.clearTimeout(timer));
}

async function storefrontRequest(query, variables) {
  const controller = new AbortController();
  try {
    return await boundedCartWait((async () => {
      const response = await fetch('https://a2f321-5.myshopify.com/api/2026-07/graphql.json', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }), signal: controller.signal,
        cache: 'no-store', credentials: 'omit'
      });
      if (!response.ok) throw new Error('http');
      return response.json();
    })(), () => controller.abort());
  } catch {
    throw new Error('No pudimos confirmar el carrito con Shopify. No se inició ningún pago.');
  }
}

function moneyCents(money) {
  if (money?.currencyCode !== 'MXN' || !/^\d+(?:\.\d{1,2})?$/.test(money.amount)) {
    throw new Error('Shopify no devolvió un importe verificable en MXN.');
  }
  const cents = Math.round(Number(money.amount) * 100);
  if (!Number.isSafeInteger(cents)) throw new Error('El importe de Shopify no pudo verificarse.');
  return cents;
}

function validateInitialCart(cart, planId, promotional) {
  const { expected, codes } = cartSelection(planId, promotional);
  if (!cart?.id || !Array.isArray(cart.lines?.nodes) || cart.lines.pageInfo?.hasNextPage !== false || cart.lines.nodes.length !== expected.length) {
    throw new Error(planId === 'implementation-only'
      ? 'El carrito debe incluir sólo una implementación, sin otra licencia. No se abrió el pago.'
      : 'El carrito debe incluir una implementación y una licencia. No se abrió el pago.');
  }
  const found = new Set();
  for (const line of cart.lines.nodes) {
    const match = expected.find((item) => item.variantId === line.merchandise?.id);
    if (line.__typename !== 'CartLine' || !match || found.has(match.variantId) || line.quantity !== 1 ||
        (line.sellingPlanAllocation?.sellingPlan?.id || null) !== match.sellingPlanId) {
      throw new Error('El producto, modalidad o cantidad del carrito no corresponde a la selección.');
    }
    found.add(match.variantId);
    if (moneyCents(line.cost?.totalAmount) !== match.cents) {
      throw new Error('Shopify no aplicó el precio anunciado. Conservamos el carrito sin abrir el pago; contáctanos para revisar la oferta.');
    }
  }
  if (!Array.isArray(cart.discountCodes) || codes.some((code) => !cart.discountCodes.some((item) => item.code.toUpperCase() === code && item.applicable)) ||
      cart.discountCodes.some((item) => item.applicable && !codes.includes(item.code.toUpperCase()))) {
    throw new Error('Shopify no confirmó los descuentos de esta oferta. No se abrió el pago.');
  }
  if (moneyCents(cart.cost?.subtotalAmount) !== expected.reduce((sum, item) => sum + item.cents, 0)) {
    throw new Error('El subtotal de Shopify no coincide con la oferta. No se abrió el pago.');
  }
  moneyCents(cart.cost?.totalAmount);
  let checkout;
  try { checkout = new URL(cart.checkoutUrl); } catch { throw new Error('Shopify no devolvió una dirección de pago válida.'); }
  if (checkout.protocol !== 'https:' || !['a2f321-5.myshopify.com', 'www.omaigad.com.mx', 'omaigad.com.mx', 'checkout.shopify.com'].includes(checkout.hostname)) {
    throw new Error('La dirección de pago no pertenece a la tienda esperada.');
  }
  return cart;
}

async function rereadCart(state) {
  if (state.promotional !== (Date.now() < DEADLINE)) {
    throw new Error('La vigencia de la oferta cambió. Cierra este resumen y vuelve a seleccionar tu plan.');
  }
  const result = await storefrontRequest(CART_QUERY, { id: state.id });
  if (result.errors?.length || result.data?.cart?.id !== state.id) {
    throw new Error('No pudimos volver a verificar el carrito. No se abrió el pago.');
  }
  return validateInitialCart(result.data.cart, state.planId, state.promotional);
}

function showCheckoutSummary(state, cart) {
  const dialog = document.getElementById('checkoutSummary');
  const setupOnly = state.planId === 'implementation-only';
  document.getElementById('checkoutPlan').textContent = cartSelection(state.planId, state.promotional).label;
  document.getElementById('checkoutSetup').textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(state.promotional ? 2500 : 4500);
  document.getElementById('checkoutLicenseRow').hidden = setupOnly;
  document.getElementById('checkoutLicense').textContent = setupOnly ? '' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(state.promotional ? CHECKOUT_OFFERS[state.planId].promo : CHECKOUT_OFFERS[state.planId].regular);
  document.getElementById('checkoutTerms').textContent = setupOnly
    ? 'Pago único de implementación. No se agrega otra licencia. Usa el mismo correo y la misma cuenta de Shopify de tu compra anterior. Si ya pagaste ambos conceptos, no sabes qué falta o tu compra anterior tuvo problemas de activación, solicita revisión antes de pagar. Shopify confirma los impuestos y el total final.'
    : 'La implementación se paga una sola vez. Tu licencia se renueva según la modalidad elegida. Shopify confirma los impuestos y el total final antes de pagar.';
  document.getElementById('checkoutSubtotal').textContent = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(moneyCents(cart.cost.subtotalAmount) / 100);
  document.getElementById('checkoutSummaryError').textContent = '';
  displayedCart = state;
  if (!dialog.open) dialog.showModal();
}

async function preparePlanCart(planId) {
  if (uncertainCartCreation) throw new Error('El intento anterior no quedó confirmado. No lo repetimos automáticamente para evitar otro carrito. No se inició ningún pago.');
  const promotional = Date.now() < DEADLINE;
  const selection = cartSelection(planId, promotional);
  const key = `${planId}:${promotional}`;
  let state = confirmedCarts.get(key);
  if (!state) {
    let response;
    try {
      response = await storefrontRequest(CART_CREATE, { input: {
        buyerIdentity: { countryCode: 'MX' },
        discountCodes: selection.codes,
        lines: selection.expected.map((line) => ({
          merchandiseId: line.variantId, quantity: 1,
          ...(line.sellingPlanId ? { sellingPlanId: line.sellingPlanId } : {})
        }))
      } });
    } catch (error) {
      uncertainCartCreation = true;
      throw error;
    }
    const payload = response.data?.cartCreate;
    if (payload?.cart?.id) {
      state = { id: payload.cart.id, planId, promotional };
      confirmedCarts.set(key, state);
    }
    if (response.errors?.length || !payload) {
      if (!state) uncertainCartCreation = true;
      throw new Error('Shopify no confirmó la preparación del carrito. No se abrió el pago.');
    }
    if (payload.warnings?.some((item) => item.code === 'DISCOUNT_CURRENTLY_INACTIVE')) {
      throw new Error('El descuento de lanzamiento no está activo en Shopify. No se abrió el pago; contáctanos para revisar la oferta.');
    }
    if (payload.userErrors?.length || payload.warnings?.length || !state) {
      throw new Error('Shopify no pudo preparar los productos solicitados. No se abrió el pago.');
    }
    validateInitialCart(payload.cart, planId, promotional);
  }
  showCheckoutSummary(state, await rereadCart(state));
}

function openPlanCart(planId) {
  if (preparingCart) return preparingCart;
  preparingCart = preparePlanCart(planId).finally(() => { preparingCart = null; });
  return preparingCart;
}

document.getElementById('closeCheckoutSummary').addEventListener('click', () => document.getElementById('checkoutSummary').close());
document.getElementById('continueCheckout').addEventListener('click', async () => {
  if (preparingCart || !displayedCart) return;
  const button = document.getElementById('continueCheckout');
  button.disabled = true;
  document.getElementById('checkoutSummaryError').textContent = '';
  preparingCart = rereadCart(displayedCart);
  try {
    const cart = await preparingCart;
    window.location.assign(cart.checkoutUrl);
  } catch (error) {
    document.getElementById('checkoutSummaryError').textContent = error.message;
  } finally { preparingCart = null; button.disabled = false; }
});

document.querySelectorAll("[data-plan]").forEach((button) => {
  const originalLabel = button.textContent;
  button.addEventListener("click", async () => {
    if (preparingCart) return;
    const error = document.getElementById("checkoutError");
    const buttons = [...document.querySelectorAll("[data-plan]")];
    const disabledStates = buttons.map((item) => item.disabled);
    buttons.forEach((item) => { item.disabled = true; });
    button.textContent = "Preparando carrito…";
    error.textContent = "";

    try {
      await openPlanCart(button.dataset.plan);
    } catch (failure) {
      error.textContent = failure.message || "No pudimos abrir el carrito. Inténtalo nuevamente o escríbenos por WhatsApp.";
    } finally {
      buttons.forEach((item, index) => { item.disabled = disabledStates[index]; });
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

if (new URL(window.location.href).searchParams.get("enterprise") === "1") {
  openEnterpriseForm();
}

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
