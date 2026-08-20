# Wave 1 — Web sources digest

Sources collected:
- Shopify variants + SKU + inventory + exchange + search POS docs
- Shopify GraphQL/Admin product model + variant limits
- Lightspeed R-Series matrix docs + item import docs
- Lightspeed X-Series variant family docs + create variants docs
- Square item options, barcode labels, GTIN, inventory, bulk import, bundles, refunds/exchanges
- Odoo product variants/import docs and POS product/combo docs
- GS1 barcodes/GTIN overview

Key leads:
- Shopify has a newer GraphQL product model with up to 2048 variants and productSet sync.
- Lightspeed X-Series enforces 3 variant options and 200 variants/family; matrix docs emphasize up to 3 attributes.
- Square treats item options/variations separately from bundles; GTIN/SKU/labels are first-class in retail workflows.
- Odoo POS supports variants and combo products; product variants are separate per-variant inventory and pricing objects.
- GS1 positions GTIN as the source of truth for trade item identity.
