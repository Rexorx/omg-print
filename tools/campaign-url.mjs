import { pathToFileURL } from 'node:url';

const SOURCES = new Set(['facebook', 'instagram', 'tiktok', 'youtube']);
const MEDIUMS = new Set(['organic_social', 'paid_social']);

// Offline campaign metadata only. Never reads cookies or sends analytics events.
export function buildCampaignUrl({ source, medium, campaign, content }) {
  if (!SOURCES.has(source)) throw new Error('Invalid source; use a supported lowercase network.');
  if (!MEDIUMS.has(medium)) throw new Error('Invalid medium; distinguish organic_social and paid_social.');
  if (!/^omg_print_\d{6}(?:_[a-z][a-z0-9]{0,23})?$/.test(campaign ?? '')) {
    throw new Error('Campaign must be omg_print_YYYYMM with an optional non-personal label.');
  }
  const month = Number(campaign.slice(14, 16));
  if (month < 1 || month > 12) throw new Error('Invalid campaign month.');
  if (!/^(?:post|reel|story|carousel)_\d{8}_\d{2}$/.test(content ?? '')) {
    throw new Error('Content must be format_YYYYMMDD_NN; never put customer information here.');
  }
  const date = content.split('_')[1];
  const isoDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== isoDate) {
    throw new Error('Invalid content date.');
  }
  const url = new URL('https://print.omaigad.com.mx/');
  for (const [key, value] of Object.entries({ source, medium, campaign, content })) {
    url.searchParams.set(`utm_${key}`, value);
  }
  return url.href;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 6) throw new Error('Usage: node tools/campaign-url.mjs SOURCE MEDIUM CAMPAIGN CONTENT');
    const [source, medium, campaign, content] = process.argv.slice(2);
    console.log(buildCampaignUrl({ source, medium, campaign, content }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
