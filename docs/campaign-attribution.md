# Campaign attribution preparation

Status: offline URL generator, not deployed analytics. No pixels, cookies, storage,
network calls, checkout changes, or consent changes are introduced.

## Generate a link for an approved campaign piece

```sh
node tools/campaign-url.mjs facebook organic_social omg_print_202611 post_20261106_01
```

The output always targets https://print.omaigad.com.mx/. Replace the network,
period, format, date and piece number with the actual campaign record. Supported
networks: facebook, instagram, tiktok and youtube. Use paid_social only for paid
placements. Reuse the same piece identifier when evaluating the same creative;
use a new number for a distinct version. Campaign labels are non-personal only.
Never place names, emails, phone numbers, free-form customer text or secrets in URLs.

UTMs label a destination URL; they do not count clicks by themselves, install a
pixel, establish visitor consent, or guarantee purchase attribution. This tool
does not edit existing posts. Use generated links only where publishing has been
authorized. Do not tag internal navigation links or overwrite ad auto-tagging.

## Metrics contract

Keep brand, network, format, objective, post ID, campaign, content ID, destination,
publication time with timezone, measurement time and source with each result.
Compare posts at equal observation age (for example seven days after publishing).
Report link clicks separately from all clicks. CTR = link clicks / impressions;
return unavailable for zero/missing denominator. Never sum post reach and label
it unique account reach. A WhatsApp click is not a verified qualified lead.
Use confirmed orders for purchases and preserve refund/cancellation distinctions.
Missing metrics remain missing, not zero. Organic tests are descriptive, not proof
that a creative caused sales. Document uncertainty and sample size before changes.

## Production gates still open

1. Confirm existing analytics/pixel owner and IDs on the correct Shopify store,
   a2f321-5.myshopify.com; do not change another connected store.
2. Inventory integrations in Customer events and scripts before adding anything.
3. Verify consent choices, rejection and withdrawal with the chosen collector.
4. Design landing-to-checkout campaign continuity without changing cart validation,
   prices, selling plans, recovery, or payment behavior.
5. Test in a non-production flow with synthetic data: one event per action,
   no conversion on failed/cancelled actions, no false purchases, matching
   deduplication IDs for the same browser/server event when applicable.
6. Verify receiving reports and document attribution windows before claiming
   end-to-end measurement. No real purchase is necessary for this preparation.

Main deploys automatically to Vercel. This work is prepared on a separate branch;
merging or production deployment requires its own authorized release decision.

## Verification

```sh
node --check script.js
node --check tools/campaign-url.mjs
node --test tests/*.test.mjs
```

Official references:
- https://support.google.com/analytics/answer/10917952
- https://help.shopify.com/en/manual/promoting-marketing/pixels/overview/
- https://help.shopify.com/en/manual/promoting-marketing/pixels/custom-pixels/testing
- https://www.facebookblueprint.com/student/activity/609643-optimize-meta-conversions-api
