import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const fullSource = fs.readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const source = fullSource.slice(0, fullSource.indexOf('const ENTERPRISE_SUPABASE_URL'));
const setupId = 'gid://shopify/ProductVariant/55106552693035';
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };

function fixture() {
  const nodes = new Map(), timers = new Map(), calls = [], carts = new Map(), navigations = [];
  let now = '2026-09-27T18:00:00Z', behavior;
  const element = (id) => {
    if (!nodes.has(id)) nodes.set(id, {
      textContent: '', disabled: false, hidden: false, open: false, handlers: {},
      addEventListener(type, fn) { this.handlers[type] = fn; },
      showModal() { this.open = true; }, close() { this.open = false; }
    });
    return nodes.get(id);
  };
  const buttons = [...html.matchAll(/data-plan="([^"]+)"/g)].map(([, plan]) =>
    Object.assign(element(plan), { dataset: { plan }, textContent: plan }));
  const context = vm.createContext({ URL, Intl, AbortController,
    Date: class extends Date { static now() { return new Date(now).getTime(); } },
    document: {
      getElementById: element, querySelectorAll: (s) => s === '[data-plan]' ? buttons : [],
      body: { classList: { add() {} } }
    },
    window: {
      setTimeout(fn) { const id = Symbol(); timers.set(id, fn); return id; },
      clearTimeout(id) { timers.delete(id); }, setInterval() {}, clearInterval() {},
      location: { assign(url) { navigations.push(url); } }
    },
    fetch: async (url, options) => {
      const request = JSON.parse(options.body);
      calls.push({ url, options, request });
      const normal = () => {
        if (!request.query.startsWith('mutation')) return { data: { cart: structuredClone(carts.get(request.variables.id)) } };
        const input = request.variables.input, promo = input.discountCodes.length > 0;
        const money = (amount) => ({ amount: amount.toFixed(2), currencyCode: 'MXN' });
        const prices = input.lines.map((line) => {
          if (line.merchandiseId === setupId) return promo ? 2500 : 4500;
          const plan = Object.keys(api.PLANS).find((id) => api.PLANS[id].variantId === line.merchandiseId);
          return promo ? api.CHECKOUT_OFFERS[plan].promo : api.CHECKOUT_OFFERS[plan].regular;
        });
        const subtotal = prices.reduce((a, b) => a + b, 0);
        const cart = {
          id: `synthetic-${carts.size + 1}`, checkoutUrl: 'https://www.omaigad.com.mx/checkouts/synthetic',
          discountCodes: input.discountCodes.map((code) => ({ code, applicable: true })),
          cost: { subtotalAmount: money(subtotal), totalAmount: money(subtotal * 1.16) },
          lines: { nodes: input.lines.map((line, i) => ({
            __typename: 'CartLine', id: `line-${i}`, quantity: line.quantity,
            merchandise: { id: line.merchandiseId }, cost: { totalAmount: money(prices[i]) },
            sellingPlanAllocation: line.sellingPlanId ? { sellingPlan: { id: line.sellingPlanId } } : null
          })), pageInfo: { hasNextPage: false } }
        };
        carts.set(cart.id, cart);
        return { data: { cartCreate: { cart: structuredClone(cart), userErrors: [], warnings: [] } } };
      };
      return behavior ? behavior(request, normal) : { ok: true, json: async () => normal() };
    }
  });
  vm.runInContext(source, context);
  const api = vm.runInContext('({ openPlanCart, PLANS, CHECKOUT_OFFERS })', context);
  return {
    ...api, element, buttons, calls, carts, navigations,
    setupButton: buttons.find((b) => b.dataset.plan === 'implementation-only'),
    setBehavior(fn) { behavior = fn; }, setNow(value) { now = value; },
    tick() { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach((fn) => fn()); },
    mutations() { return calls.filter((call) => call.request.query.startsWith('mutation')); }
  };
}

test('visible recovery CTA, FAQ and review option use established variant and no invented product URL', () => {
  assert.equal([...html.matchAll(/data-plan="implementation-only"/g)].length, 1);
  assert.match(html, /href="#completar-implementacion"/);
  assert.match(html, /mismo correo y la misma cuenta de Shopify/);
  assert.match(html, /compra anterior tuvo problemas de activación/);
  assert.match(html, /href="mailto:Orlandohsanchez@gmail.com\?subject=/);
  assert.ok(!html.includes('/products/'));
  for (const id of ['checkoutLicenseRow', 'checkoutTerms', 'setupRecoveryTitle']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8'), /dl>div\[hidden\]\{display:none\}/);
});

test('recovery creates one non-recurring implementation and only its discount; no personal data', async () => {
  const f = fixture(); await f.setupButton.handlers.click();
  assert.equal(f.mutations().length, 1); assert.equal(f.calls.length, 2);
  const input = f.mutations()[0].request.variables.input;
  assert.deepEqual(input.lines, [{ merchandiseId: setupId, quantity: 1 }]);
  assert.deepEqual(input.discountCodes, ['BETAFOUNDER']);
  assert.deepEqual(input.buyerIdentity, { countryCode: 'MX' });
  assert.ok(f.calls.every((c) => c.options.credentials === 'omit' && !c.options.headers.Authorization));
  assert.equal(f.element('checkoutSummary').open, true);
  assert.equal(f.element('checkoutLicenseRow').hidden, true);
  assert.equal(f.element('checkoutLicense').textContent, '');
  assert.match(f.element('checkoutTerms').textContent, /No se agrega otra licencia/);
  assert.match(f.element('checkoutSubtotal').textContent, /2,500/);
});

test('switching between complete and complementary purchase restores the appropriate summary', async () => {
  const f = fixture(); await f.openPlanCart('basic-monthly'); await f.openPlanCart('implementation-only');
  assert.equal(f.element('checkoutLicenseRow').hidden, true);
  await f.openPlanCart('basic-monthly');
  assert.equal(f.element('checkoutLicenseRow').hidden, false);
  assert.match(f.element('checkoutLicense').textContent, /299/);
  assert.match(f.element('checkoutTerms').textContent, /Tu licencia se renueva/);
  assert.equal(f.mutations().length, 2);
});

test('double click blocks every CTA; reopening reuses the same confirmed implementation cart', async () => {
  const f = fixture(); const pending = f.setupButton.handlers.click();
  assert.ok(f.buttons.every((button) => button.disabled));
  await f.buttons[0].handlers.click(); await f.setupButton.handlers.click(); await pending;
  await f.openPlanCart('implementation-only');
  assert.equal(f.mutations().length, 1); assert.equal(f.carts.size, 1);
  assert.ok(f.buttons.every((button) => !button.disabled));
});

test('continue rereads the one-line cart before opening its confirmed checkout', async () => {
  const f = fixture(); await f.openPlanCart('implementation-only'); await f.element('continueCheckout').handlers.click();
  assert.equal(f.calls.length, 3); assert.equal(f.mutations().length, 1);
  assert.deepEqual(f.navigations, ['https://www.omaigad.com.mx/checkouts/synthetic']);
});

for (const kind of ['license-extra', 'license-instead', 'recurrence', 'quantity', 'price', 'discount', 'extra-discount', 'subtotal']) {
  test(`complementary checkout rejects ${kind}`, async () => {
    const f = fixture();
    f.setBehavior(async (_request, normal) => {
      const data = normal(), cart = data.data.cartCreate?.cart || data.data.cart;
      const line = cart.lines.nodes[0];
      if (kind === 'license-extra') cart.lines.nodes.push({ ...line, merchandise: { id: f.PLANS['basic-monthly'].variantId } });
      if (kind === 'license-instead') line.merchandise.id = f.PLANS['basic-monthly'].variantId;
      if (kind === 'recurrence') line.sellingPlanAllocation = { sellingPlan: { id: f.PLANS['basic-monthly'].sellingPlanId } };
      if (kind === 'quantity') line.quantity = 2;
      if (kind === 'price') line.cost.totalAmount.amount = '4500.00';
      if (kind === 'discount') cart.discountCodes[0].applicable = false;
      if (kind === 'extra-discount') cart.discountCodes.push({ code: 'BETA6MENSUAL', applicable: true });
      if (kind === 'subtotal') cart.cost.subtotalAmount.amount = '1.00';
      return { ok: true, json: async () => data };
    });
    await f.setupButton.handlers.click();
    assert.equal(f.element('checkoutSummary').open, false); assert.equal(f.navigations.length, 0);
    assert.ok(f.element('checkoutError').textContent);
  });
}

test('a license added after summary blocks checkout without removing it or repeating cartCreate', async () => {
  const f = fixture(); await f.openPlanCart('implementation-only');
  const cart = [...f.carts.values()][0];
  cart.lines.nodes.push({ ...cart.lines.nodes[0], merchandise: { id: f.PLANS['basic-monthly'].variantId } });
  await f.element('continueCheckout').handlers.click();
  assert.match(f.element('checkoutSummaryError').textContent, /sólo una implementación/);
  assert.equal(f.navigations.length, 0); assert.equal(cart.lines.nodes.length, 2); assert.equal(f.mutations().length, 1);
});

test('regular complementary cart uses existing regular price and no promotional code', async () => {
  const f = fixture(); f.setNow('2026-10-02T06:00:00Z'); await f.openPlanCart('implementation-only');
  assert.deepEqual(f.mutations()[0].request.variables.input.discountCodes, []);
  assert.match(f.element('checkoutSetup').textContent, /4,500/);
  assert.match(f.element('checkoutSubtotal').textContent, /4,500/);
});

test('expiration after recovery summary blocks checkout until a new selection', async () => {
  const f = fixture(); await f.openPlanCart('implementation-only'); f.setNow('2026-10-02T06:00:00Z');
  await f.element('continueCheckout').handlers.click();
  assert.match(f.element('checkoutSummaryError').textContent, /vigencia/);
  assert.equal(f.navigations.length, 0); assert.equal(f.mutations().length, 1);
});

test('failed reread reuses confirmed complementary cart; it never recreates it', async () => {
  const f = fixture();
  f.setBehavior(async (request, normal) => {
    if (request.query.startsWith('query')) throw new Error('read failed');
    return { ok: true, json: async () => normal() };
  });
  await assert.rejects(f.openPlanCart('implementation-only'));
  f.setBehavior(null); await f.openPlanCart('implementation-only');
  assert.equal(f.mutations().length, 1);
});

test('uncertain recovery creation blocks subsequent recovery or license attempts without another mutation', async () => {
  const f = fixture(); f.setBehavior(() => new Promise(() => {}));
  const rejected = assert.rejects(f.openPlanCart('implementation-only'));
  await flush(); f.tick(); await rejected;
  await assert.rejects(f.openPlanCart('implementation-only'), /intento anterior/);
  await assert.rejects(f.openPlanCart('team-annual'), /intento anterior/);
  assert.equal(f.mutations().length, 1); assert.equal(f.navigations.length, 0);
});
