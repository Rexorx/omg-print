import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { buildCampaignUrl } from '../tools/campaign-url.mjs';
const valid = { source: 'facebook', medium: 'organic_social', campaign: 'omg_print_202611', content: 'post_20261106_01' };

test('creates deterministic campaign URL with all four dimensions', () => {
  assert.equal(buildCampaignUrl(valid), 'https://print.omaigad.com.mx/?utm_source=facebook&utm_medium=organic_social&utm_campaign=omg_print_202611&utm_content=post_20261106_01');
});
test('separates paid/organic and creative variants', () => {
  assert.notEqual(buildCampaignUrl(valid), buildCampaignUrl({ ...valid, medium: 'paid_social' }));
  assert.notEqual(buildCampaignUrl(valid), buildCampaignUrl({ ...valid, content: 'post_20261106_02' }));
});
test('does not permit arbitrary destinations or checkout parameters', () => {
  const url = new URL(buildCampaignUrl({ ...valid, destination: 'https://example.com', discount: 'FREE' }));
  assert.equal(url.origin, 'https://print.omaigad.com.mx');
  assert.equal(url.searchParams.size, 4);
  assert.equal(url.searchParams.has('discount'), false);
});
for (const [field, value] of [['source', 'Facebook'], ['source', 'person@example.com'], ['medium', 'social'], ['campaign', 'omg_print_202613'], ['campaign', 'omg_print_202600'], ['campaign', 'person@example.com'], ['content', 'post_20260230_01'], ['content', 'customer_9811234567']]) {
  test(`rejects invalid ${field}: ${value}`, () => assert.throws(() => buildCampaignUrl({ ...valid, [field]: value })));
}
test('accepts valid leap day and non-personal campaign label', () => {
  assert.match(buildCampaignUrl({ ...valid, campaign: 'omg_print_202802_demo', content: 'reel_20280229_01' }), /utm_content=reel_20280229_01/);
});
test('CLI fails closed without required fields', () => {
  const result = spawnSync(process.execPath, ['tools/campaign-url.mjs'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
});
