# The Sullivans USNSCC Website

Static visual and content source for the final The Sullivans Division WordPress website.

## Pages

- `index.html` - Home page
- `about.html` - About page
- `leadership.html` - Standalone Leadership page
- `resource-hub.html` - Standalone Resource Hub page
- `roadmap.html` - Standalone roadmap page
- `contact.html` - Contact page with current public info
- `store.html` - Store presentation with verified unit-product handoffs to live WooCommerce and a clearly separate Printify catalog lane
- `cart.html` - Gateway to the live WooCommerce cart
- `checkout.html` - Gateway to the live WooCommerce checkout; it does not collect payment or customer data locally
- `cadet-dashboard.html` - Gateway to WordPress My Account; protected portal behavior is implemented server-side after role/privacy approval

## Notes

- The current build is a static design source, not the production transaction or authentication engine.
- WordPress/WooCommerce owns accounts, cart, checkout, payment, orders, email, and approved protected content.
- Unit-product prices and IDs were verified against the public WooCommerce catalog on 2026-07-15.
- Legacy WooCommerce apparel is intentionally not mapped from the redesign until its Printify variants, SKUs, prices, shipping, and fulfillment are reconciled.
- Printify Pop-Up products remain external links until selected products are published into the connected WooCommerce store and pass fulfillment QA.
- The hero video is currently large and should be compressed before final deployment.
- Current public contact source: `info@thesullivansusnscc.com`, `1 Naval, Marina Park S, Buffalo, NY 14202`.

Run `node ../scripts/verify-site.js` from this directory, or `node scripts/verify-site.js` from the repository root, before handing off a build.
