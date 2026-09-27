import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const clockSource = source.slice(0, source.indexOf('const CART_TIMEOUT_MS'));

function renderAt(now) {
  const ids = Object.fromEntries(['countDays', 'countHours', 'countMinutes', 'countSeconds', 'launchMessage', 'setupCurrent', 'setupRegular'].map((id) => [id, { textContent: '', hidden: false }]));
  ids.setupCurrent.textContent = '$2,500'; ids.setupRegular.textContent = '$4,500';
  const cards = [...html.matchAll(/<article class="plan-card[\s\S]*?<\/article>/g)].map(([card]) => {
    const values = [...card.matchAll(/<s>(.*?)<\/s>/g)].map((m) => m[1]);
    const elements = { '.plan-price s': { textContent: values[0] }, '[data-promo-price]': { textContent: card.match(/data-promo-price>(.*?)</)[1] }, '.plan-total s': { textContent: values[1] }, '[data-promo-total]': { textContent: card.match(/data-promo-total>(.*?)</)[1] }, '.plan-note': { textContent: card.match(/class="plan-note">(.*?)</)[1] } };
    return { elements, querySelector: (selector) => elements[selector] };
  });
  const claims = [...html.matchAll(/data-regular-text="([^"]+)"[^>]*>([^<]*)</g)].map((m) => ({ dataset: { regularText: m[1] }, textContent: m[2] }));
  const carts = Array.from({ length: 4 }, () => ({ removed: false, removeAttribute(name) { assert.equal(name, 'discount-codes'); this.removed = true; } }));
  const context = vm.createContext({ Date: class extends Date { static now() { return new Date(now).getTime(); } }, document: {
    body: { classList: { add() {} } }, getElementById: (id) => ids[id],
    querySelectorAll: (selector) => selector === '.plan-card' ? cards : selector === 'shopify-cart' ? carts : claims
  } });
  vm.runInContext(clockSource, context);
  const remaining = vm.runInContext('updateCountdown()', context);
  return { remaining, ids, carts, cards, claims };
}

for (const instant of ['2026-09-27T18:00:00Z', '2026-10-02T05:59:59Z', '2026-10-02T05:59:59.999Z']) {
  test(`offer valid at ${instant}`, () => {
    const rendered = renderAt(instant);
    assert.ok(rendered.remaining > 0);
    assert.equal(rendered.ids.setupCurrent.textContent, '$2,500');
    assert.ok(rendered.carts.every((cart) => !cart.removed));
    assert.deepEqual(rendered.cards.map((card) => card.elements['[data-promo-price]'].textContent), ['$299', '$2,990', '$499', '$4,990']);
  });
}
for (const instant of ['2026-10-02T06:00:00Z', '2026-10-02T12:00:00Z']) {
  test(`regular offer at ${instant}`, () => {
    const rendered = renderAt(instant);
    assert.equal(rendered.remaining, 0);
    assert.equal(rendered.ids.setupCurrent.textContent, '$4,500');
    assert.ok(rendered.carts.every((cart) => cart.removed));
    assert.ok(rendered.claims.every((claim) => claim.textContent === claim.dataset.regularText));
    assert.deepEqual(rendered.cards.map((card) => card.elements['[data-promo-price]'].textContent), ['$499', '$4,990', '$899', '$8,990']);
    assert.ok(rendered.cards.every((card) => card.elements['.plan-note'].textContent === 'Precio regular vigente. Sin contrato forzoso.'));
  });
}
test('deadline is Mexico City October 2 midnight and FAQ has no stale numeric price', () => {
  const local = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'medium', hourCycle: 'h23' }).format(new Date('2026-10-02T06:00:00Z'));
  assert.equal(local, '2026-10-02 00:00:00');
  assert.ok(html.includes('Oferta de lanzamiento hasta el 1 de octubre'));
  assert.ok(!html.match(/class="wrap faq"[\s\S]*?<\/section>/)[0].includes('$299'));
});
