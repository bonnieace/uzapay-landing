# UzaPay Landing Page

Original UzaPay landing page for an offline-first POS system for Kenyan businesses.

## Stack

This is intentionally a lightweight static site:
- index.html — homepage
- style.css — shared styles
- script.js — shared interactions + waitlist client
- netlify/functions/waitlist.mjs — serverless waitlist endpoint
- illustrations/ — local unDraw SVG assets
- SEO landing pages for POS, offline POS, retail POS, inventory management and wholesale POS

## Brevo waitlist setup

The site uses a Netlify Function so the Brevo API key is never exposed to visitors.

In Netlify, add these environment variables with the Functions scope enabled:
- BREVO_API_KEY — your Brevo API key
- BREVO_LIST_ID — the numeric Brevo contact-list ID that should receive UzaPay waitlist signups

Brevo's POST /v3/contacts endpoint accepts both listIds and updateEnabled, so repeat signups safely update the existing contact instead of failing on duplicates.

After adding or changing Netlify environment variables, trigger a new deploy so the Function receives the updated values.

The current form collects the email address only. Business-specific fields can be added later once matching Brevo custom attributes are created.

## Deployment

Netlify should use:
- Publish directory: .
- Functions directory: netlify/functions

The repository includes netlify.toml with those settings.

## SEO

The homepage and topic pages use canonical URLs under https://uzapay.co.ke/. Update the domain in the metadata, sitemap and structured data before launch if the production domain changes.