import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const checkoutSource = source.slice(0, source.indexOf('const ENTERPRISE_SUPABASE_URL'));
const cards = [...html.matchAll(/<article class="plan-card[\s\S]*?<\/article>/g)].map(([card]) => card);
const expectedPrices = ['$499', '$4,990', '$899', '$8,990'];
const expectedTotals = ['$4,999 + IVA', '$9,490 + IVA', '$5,399 + IVA', '$13,490 + IVA'];

test('initial HTML advertises all four authorized regular prices, periods and first-payment totals', () => {
  assert.equal(cards.length, 4);
  assert.match(html, /id="setupCurrent">\$4,500<\/strong>/);
  assert.deepEqual(cards.map((card) => card.match(/data-plan-price>([^<]+)/)[1]), expectedPrices);
  assert.deepEqual(cards.map((card) => card.match(/data-plan-total>([^<]+)/)[1]), expectedTotals);
  for (const [i, card] of cards.entries()) {
    assert.match(card, new RegExp(`MXN \\+ IVA / ${i % 2 ? 'año' : 'mes'}`));
    assert.ok(!card.includes('<s>'));
    assert.match(card, /Implementación incluida en el carrito/);
    assert.match(card, /Sin contrato forzoso/);
  }
});

test('public HTML and checkout controller have no expired campaign, timer or automatic coupon', () => {
  for (const contents of [html, source]) {
    assert.doesNotMatch(contents, /lanzamiento|BETAFOUNDER|BETA(?:6|10)(?:MENSUAL|ANUAL)|data-promo|data-regular-text|DEADLINE|countdown|countDays|launchMessage/i);
  }
  assert.doesNotMatch(html, /\$(?:2,500|299|2,990|2,799|5,490|2,999|7,490)(?:<|\/|\s)/);
});

for (const instant of ['2026-09-27T18:00:00Z', '2026-10-22T01:00:00Z', '2030-01-01T00:00:00Z']) {
  test(`loading checkout controller preserves initial prices without timer or network at ${instant}`, () => {
    const protectedPrices = new Map([
      ['setupCurrent', '$4,500'],
      ...expectedPrices.map((value, i) => [`price-${i}`, value]),
      ...expectedTotals.map((value, i) => [`total-${i}`, value])
    ]);
    const nodes = new Map([...protectedPrices].map(([id, textContent]) => [id, { textContent }]));
    const node = (id) => {
      if (!nodes.has(id)) nodes.set(id, { textContent: '', addEventListener() {} });
      return nodes.get(id);
    };
    const context = vm.createContext({ URL, Intl, AbortController,
      Date: class extends Date { static now() { return new Date(instant).getTime(); } },
      document: {
        getElementById: node,
        querySelectorAll(selector) {
          if (selector === '.plan-card') return cards.map((_, i) => ({ querySelector: (s) => node(s.includes('total') ? `total-${i}` : `price-${i}`) }));
          return [];
        },
        body: { classList: { add() { assert.fail('Price normalization must not depend on a loading class'); } } }
      },
      window: { setInterval() { assert.fail('No campaign timer may start'); }, setTimeout() { assert.fail('No timer is needed before choosing a plan'); } },
      fetch() { assert.fail('No Shopify request is needed before choosing a plan'); }
    });
    vm.runInContext(checkoutSource, context);
    assert.deepEqual([...protectedPrices].map(([id]) => nodes.get(id).textContent), [...protectedPrices.values()]);
  });
}
