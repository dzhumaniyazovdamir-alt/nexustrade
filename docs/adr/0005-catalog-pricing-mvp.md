# ADR-0005: Catalog and pricing MVP

## Status

Accepted

## Context

Catalog and Pricing are the first operational bounded contexts after tenant identity. The target
architecture allows price lists, history and multiple currencies, but implementing those before
Inventory and Orders would add contracts that are not yet justified by product scenarios.

The MVP still needs strict tenant isolation, decimal-safe money handling and a migration path that
does not reinterpret existing prices.

## Decision

- Catalog owns hierarchical categories, products and product variants. Products and variants use
  `active | archived` lifecycle states and optimistic versions.
- Pricing owns one optional current price per product variant. Amounts use PostgreSQL
  `numeric(19,4)` and cross transport boundaries as decimal strings.
- Each organization has one `defaultCurrency` ISO 4217 code. Existing and unspecified
  organizations use `USD`.
- Owners and administrators may change the currency only while the organization has no prices.
- Members can read catalog and pricing data; owners and administrators can mutate it.
- Catalog and Pricing expose narrow application ports to each other. Neither context imports the
  other context's repository or TypeORM entities.
- Price lists, effective dates, history, discounts, taxes and multi-currency prices are deferred.

## Consequences

The model is deliberately smaller than the target Pricing context and is sufficient for Inventory
and Orders to reference stable variants and current prices. A future price-list migration must copy
the current `variant_prices` rows into a default price list while preserving decimal values and the
organization currency. Currency changes after the first price require an explicit migration or
conversion workflow and are therefore rejected in the MVP.
