# KPI module — entity relationship documentation

This folder describes the **physical and logical data model** for the KPI app, kept in sync with the **frontend mock** (`src/types/kpi.types.ts`, Zustand `kpiStore`, `visionCentralDubai` seeds).

## Files

| File | Purpose |
|------|--------|
| [`data_model.sql`](./data_model.sql) | MySQL 8 DDL: tenants, `kpi_master` (KPI items), `kpi_template` (+ lines, changelog), freight scope junctions, `kpi_allocation`, `kpi_target`, `kpi_actual`, supporting ref/dim tables. |
| [`erd.mmd`](./erd.mmd) | Mermaid `erDiagram`: logical relationships (render at [mermaid.live](https://mermaid.live)). |
| [`flowchart.mmd`](./flowchart.mmd) | Mermaid `flowchart`: end-to-end flows aligned with the current UI (simplified KPI item form, template freight scope). |
| [`kpi_erd.drawio`](./kpi_erd.drawio) | Optional Draw.io diagram (if maintained). |

## Mock alignment (2026)

- **`KPITemplate`** maps to `kpi_template` plus:
  - **`kpi_template_shipment_mode`** — shipment modes (freight).
  - **`kpi_template_trade_direction`** — trade directions (`tradeDirections` in TypeScript).
  - **`job_type`** column on `kpi_template` — equipment/cargo scope (`jobType` in TS, e.g. `All`, `FCL`).
- **`KPIItem`** maps to `kpi_master` plus M2M tables for modes, trade directions, visible roles, and `kpi_threshold`. The **create-item UI** applies many freight/category defaults on save; the database still stores full scope for reporting and templates.
- **Reference data**: `ref_calculation_type` includes `percentage` (id `8`) for forms that use percentage-style calculation labels.

## Trade direction codes

`ref_trade_direction.code` uses **snake_case** in SQL seeds (e.g. `cross_trade`). The app types use **kebab-case** (`cross-trade`). Map in the API or application layer when reading/writing.

## Rendering diagrams

```bash
# Optional: open Draw.io XML
./open-kpi-erd.sh
```

Paste `erd.mmd` or `flowchart.mmd` into [Mermaid Live Editor](https://mermaid.live) to export PNG/SVG.

## Related application routes

| Route | Maps to |
|-------|---------|
| `/kpi-items` | `kpi_master` list |
| `/kpi-items/new` | New `kpi_master` (+ thresholds, M2M) |
| `/kpi-templates` | `kpi_template` |
| `/template-allocation` | `kpi_allocation`, `kpi_target` |
| `/actuals-vs-target` | `kpi_actual`, `kpi_performance` |
