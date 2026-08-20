# Wave 2 — Expansion digest

New findings:
- Square: bundles are separate from combos; up to 20 components; inventory tracked on individual items; bundle can be created from dashboard and edited in POS.
- Square: unique SKU/GTIN per variation is recommended; auto-SKU generation exists; spreadsheet imports can be corrupted by editors and require exact identifiers.
- Square: inventory tracking updates on sales and supports bulk import/export of inventory quantities.
- Shopify: bundles can be sold on POS, but exchanges have bundle-specific constraints and bundle components can be managed at variant level.
- Odoo: deleting/altering attributes archives or deletes variants depending on order history; variant import batching must keep a template’s variants together.
- Lightspeed X-Series: variant family limit is 200, only 3 variant options; variant options are not a reliable variant detector vs parent/child flags.

Open leads closed:
- Seasonal collections are best modeled as collections/categories/tags rather than a dedicated POS primitive.
- Reports are mostly category/item/variant/inventory reports, not a separate seasonal workflow.
