-- =============================================================================
-- KPI Management System — MySQL 8.x physical data model
-- Derived from frontend: KPI/src/types/kpi.types.ts, forms, stores, PeriodTracker
-- Conventions: InnoDB, utf8mb4_unicode_ci, BIGINT surrogate keys, public uuid CHAR(36)
-- Multi-tenant: account_id, workspace_id, control_unit_id on all business tables
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- Tenant & identity scaffolding (minimal; link to your IAM)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS account (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  code            VARCHAR(64) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  status          ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_account_uuid (uuid),
  UNIQUE KEY uk_account_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workspace (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  code            VARCHAR(64) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_workspace_uuid (uuid),
  UNIQUE KEY uk_workspace_acct_code (account_id, code),
  CONSTRAINT fk_workspace_account FOREIGN KEY (account_id) REFERENCES account(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS control_unit (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  code            VARCHAR(64) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_cu_uuid (uuid),
  UNIQUE KEY uk_cu_ws_code (workspace_id, code),
  CONSTRAINT fk_cu_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_cu_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- LOOKUP TABLES (seed-controlled; optional workspace overrides via code)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ref_period_type (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_ref_period_type_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_distribution_type (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_ref_dist_type_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_aggregation_type (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_ref_agg_type_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_calculation_type (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_ref_calc_type_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_kpi_status (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_ref_kpi_status_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_approval_status (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_ref_appr_status_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_trend_rag (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(16) NOT NULL,
  label           VARCHAR(32) NOT NULL,
  UNIQUE KEY uk_ref_trend_rag_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_unit_type (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_ref_unit_type_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_shipment_mode (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_ref_ship_mode_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_trade_direction (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_ref_trade_dir_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_business_scope (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_ref_biz_scope_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_hierarchy_level (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  level_rank      SMALLINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_ref_hlvl_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_user_role (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_ref_user_role_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_allocation_status (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_ref_alloc_status_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_subject_type (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(16) NOT NULL,
  label           VARCHAR(32) NOT NULL,
  UNIQUE KEY uk_ref_subject_type_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ref_trend_direction (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_ref_trend_dir_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Workflow state for actual figures (capture -> submit -> approve).
CREATE TABLE IF NOT EXISTS ref_actual_entry_status (
  id              SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(32) NOT NULL,
  label           VARCHAR(64) NOT NULL,
  UNIQUE KEY uk_ref_actual_entry_st_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- MASTER: categories, types, UOM (extensible per workspace)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kpi_category (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  control_unit_id BIGINT UNSIGNED NULL,
  code            VARCHAR(64) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  description     VARCHAR(512) NULL,
  status_id       SMALLINT UNSIGNED NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_kpi_cat_uuid (uuid),
  UNIQUE KEY uk_kpi_cat_ws_code (workspace_id, code),
  CONSTRAINT fk_kpi_cat_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_kpi_cat_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_kpi_cat_cu FOREIGN KEY (control_unit_id) REFERENCES control_unit(id),
  CONSTRAINT fk_kpi_cat_status FOREIGN KEY (status_id) REFERENCES ref_kpi_status(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_type (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  control_unit_id BIGINT UNSIGNED NULL,
  code            VARCHAR(64) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  description     VARCHAR(512) NULL,
  status_id       SMALLINT UNSIGNED NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_kpi_type_uuid (uuid),
  UNIQUE KEY uk_kpi_type_ws_code (workspace_id, code),
  CONSTRAINT fk_kpi_type_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_kpi_type_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_kpi_type_cu FOREIGN KEY (control_unit_id) REFERENCES control_unit(id),
  CONSTRAINT fk_kpi_type_status FOREIGN KEY (status_id) REFERENCES ref_kpi_status(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS unit_of_measure (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  control_unit_id BIGINT UNSIGNED NULL,
  code            VARCHAR(64) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  ref_unit_type_id SMALLINT UNSIGNED NOT NULL,
  display_symbol  VARCHAR(16) NULL,
  decimals        TINYINT NOT NULL DEFAULT 2,
  status_id       SMALLINT UNSIGNED NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_uom_uuid (uuid),
  UNIQUE KEY uk_uom_ws_code (workspace_id, code),
  CONSTRAINT fk_uom_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_uom_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_uom_cu FOREIGN KEY (control_unit_id) REFERENCES control_unit(id),
  CONSTRAINT fk_uom_ref_ut FOREIGN KEY (ref_unit_type_id) REFERENCES ref_unit_type(id),
  CONSTRAINT fk_uom_status FOREIGN KEY (status_id) REFERENCES ref_kpi_status(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- TIME DIMENSION (grain: calendar day; fiscal columns optional)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dim_time (
  time_key        INT UNSIGNED NOT NULL PRIMARY KEY,
  calendar_date   DATE NOT NULL,
  day_of_month    TINYINT UNSIGNED NOT NULL,
  day_of_week     TINYINT UNSIGNED NOT NULL,
  day_of_year     SMALLINT UNSIGNED NOT NULL,
  week_of_year    TINYINT UNSIGNED NOT NULL,
  iso_week        TINYINT UNSIGNED NOT NULL,
  month_number    TINYINT UNSIGNED NOT NULL,
  month_name      VARCHAR(16) NOT NULL,
  quarter_number  TINYINT UNSIGNED NOT NULL,
  quarter_key     INT UNSIGNED NOT NULL,
  year_number     SMALLINT UNSIGNED NOT NULL,
  fiscal_year     VARCHAR(32) NULL,
  fiscal_year_key INT UNSIGNED NULL,
  fiscal_quarter  TINYINT UNSIGNED NULL,
  fiscal_month    TINYINT UNSIGNED NULL,
  is_weekend      TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uk_dim_time_date (calendar_date),
  KEY idx_dim_time_yq (year_number, quarter_number),
  KEY idx_dim_time_fy (fiscal_year_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Fiscal calendar (per workspace; supports FY 2025-26 style labels from UI)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fiscal_year (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  control_unit_id BIGINT UNSIGNED NULL,
  label           VARCHAR(64) NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status_id       SMALLINT UNSIGNED NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_fy_uuid (uuid),
  UNIQUE KEY uk_fy_ws_label (workspace_id, label),
  CONSTRAINT fk_fy_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_fy_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_fy_cu FOREIGN KEY (control_unit_id) REFERENCES control_unit(id),
  CONSTRAINT fk_fy_status FOREIGN KEY (status_id) REFERENCES ref_kpi_status(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Organization hierarchy (TemplateAllocation / HierarchyTree)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS org_hierarchy_node (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  control_unit_id BIGINT UNSIGNED NULL,
  parent_id       BIGINT UNSIGNED NULL,
  name            VARCHAR(255) NOT NULL,
  hierarchy_level_id SMALLINT UNSIGNED NOT NULL,
  region          VARCHAR(128) NULL,
  allocation_status ENUM('allocated','partial','none') NOT NULL DEFAULT 'none',
  external_ref    VARCHAR(128) NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_ohn_uuid (uuid),
  KEY idx_ohn_parent (parent_id),
  KEY idx_ohn_ws (workspace_id),
  CONSTRAINT fk_ohn_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_ohn_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_ohn_cu FOREIGN KEY (control_unit_id) REFERENCES control_unit(id),
  CONSTRAINT fk_ohn_parent FOREIGN KEY (parent_id) REFERENCES org_hierarchy_node(id),
  CONSTRAINT fk_ohn_level FOREIGN KEY (hierarchy_level_id) REFERENCES ref_hierarchy_level(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- KPI Master (KPIItem)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kpi_master (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  control_unit_id BIGINT UNSIGNED NULL,
  definition_name VARCHAR(255) NOT NULL,
  kpi_code        VARCHAR(64) NOT NULL,
  item_name       VARCHAR(255) NOT NULL,
  category_id     BIGINT UNSIGNED NOT NULL,
  kpi_type_id     BIGINT UNSIGNED NULL,
  description     TEXT NOT NULL,
  business_scope_id SMALLINT UNSIGNED NULL,
  job_type        VARCHAR(128) NOT NULL,
  region_scope    VARCHAR(128) NOT NULL,
  uom_id          BIGINT UNSIGNED NULL,
  ref_unit_type_id SMALLINT UNSIGNED NOT NULL,
  calculation_type_id SMALLINT UNSIGNED NOT NULL,
  period_type_id  SMALLINT UNSIGNED NOT NULL,
  aggregation_type_id SMALLINT UNSIGNED NOT NULL,
  aggregation_label VARCHAR(64) NOT NULL,
  trend_direction_id SMALLINT UNSIGNED NOT NULL,
  data_source     VARCHAR(128) NOT NULL,
  formula_text    TEXT NULL,
  allow_carry_forward TINYINT(1) NOT NULL DEFAULT 0,
  carry_forward_missing_value DECIMAL(24,8) NULL,
  show_in_build_screen TINYINT(1) NOT NULL DEFAULT 1,
  enable_alerts   TINYINT(1) NOT NULL DEFAULT 0,
  weighted_scoring TINYINT(1) NOT NULL DEFAULT 0,
  default_weight  DECIMAL(9,4) NOT NULL DEFAULT 0,
  status_id       SMALLINT UNSIGNED NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_kpi_master_uuid (uuid),
  UNIQUE KEY uk_kpi_master_ws_code (workspace_id, kpi_code),
  KEY idx_kpi_master_cat (category_id),
  CONSTRAINT fk_kpi_master_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_kpi_master_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_kpi_master_cu FOREIGN KEY (control_unit_id) REFERENCES control_unit(id),
  CONSTRAINT fk_kpi_master_category FOREIGN KEY (category_id) REFERENCES kpi_category(id),
  CONSTRAINT fk_kpi_master_kpi_type FOREIGN KEY (kpi_type_id) REFERENCES kpi_type(id),
  CONSTRAINT fk_kpi_master_biz_scope FOREIGN KEY (business_scope_id) REFERENCES ref_business_scope(id),
  CONSTRAINT fk_kpi_master_uom FOREIGN KEY (uom_id) REFERENCES unit_of_measure(id),
  CONSTRAINT fk_kpi_master_ref_ut FOREIGN KEY (ref_unit_type_id) REFERENCES ref_unit_type(id),
  CONSTRAINT fk_kpi_master_calc FOREIGN KEY (calculation_type_id) REFERENCES ref_calculation_type(id),
  CONSTRAINT fk_kpi_master_period FOREIGN KEY (period_type_id) REFERENCES ref_period_type(id),
  CONSTRAINT fk_kpi_master_agg FOREIGN KEY (aggregation_type_id) REFERENCES ref_aggregation_type(id),
  CONSTRAINT fk_kpi_master_trend_dir FOREIGN KEY (trend_direction_id) REFERENCES ref_trend_direction(id),
  CONSTRAINT fk_kpi_master_status FOREIGN KEY (status_id) REFERENCES ref_kpi_status(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_master_shipment_mode (
  kpi_master_id   BIGINT UNSIGNED NOT NULL,
  shipment_mode_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (kpi_master_id, shipment_mode_id),
  CONSTRAINT fk_kmsm_kpi FOREIGN KEY (kpi_master_id) REFERENCES kpi_master(id) ON DELETE CASCADE,
  CONSTRAINT fk_kmsm_mode FOREIGN KEY (shipment_mode_id) REFERENCES ref_shipment_mode(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_master_trade_direction (
  kpi_master_id   BIGINT UNSIGNED NOT NULL,
  trade_direction_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (kpi_master_id, trade_direction_id),
  CONSTRAINT fk_kmtd_kpi FOREIGN KEY (kpi_master_id) REFERENCES kpi_master(id) ON DELETE CASCADE,
  CONSTRAINT fk_kmtd_td FOREIGN KEY (trade_direction_id) REFERENCES ref_trade_direction(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_master_visible_role (
  kpi_master_id   BIGINT UNSIGNED NOT NULL,
  user_role_id    SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (kpi_master_id, user_role_id),
  CONSTRAINT fk_kmvr_kpi FOREIGN KEY (kpi_master_id) REFERENCES kpi_master(id) ON DELETE CASCADE,
  CONSTRAINT fk_kmvr_role FOREIGN KEY (user_role_id) REFERENCES ref_user_role(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_threshold (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kpi_master_id   BIGINT UNSIGNED NOT NULL,
  rag_id          SMALLINT UNSIGNED NOT NULL,
  min_value       DECIMAL(24,8) NOT NULL,
  max_value       DECIMAL(24,8) NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_kpi_threshold_kpi_rag (kpi_master_id, rag_id),
  CONSTRAINT fk_kth_kpi FOREIGN KEY (kpi_master_id) REFERENCES kpi_master(id) ON DELETE CASCADE,
  CONSTRAINT fk_kth_rag FOREIGN KEY (rag_id) REFERENCES ref_trend_rag(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_hierarchy (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  parent_kpi_id   BIGINT UNSIGNED NOT NULL,
  child_kpi_id    BIGINT UNSIGNED NOT NULL,
  sort_order      INT NOT NULL DEFAULT 0,
  effective_from  DATE NULL,
  effective_to    DATE NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_kpi_hier_par_ch (parent_kpi_id, child_kpi_id),
  CONSTRAINT fk_khier_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_khier_ws FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_khier_parent FOREIGN KEY (parent_kpi_id) REFERENCES kpi_master(id) ON DELETE CASCADE,
  CONSTRAINT fk_khier_child FOREIGN KEY (child_kpi_id) REFERENCES kpi_master(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_calculation (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  kpi_master_id   BIGINT UNSIGNED NOT NULL,
  calculation_type_id SMALLINT UNSIGNED NOT NULL,
  formula_expression TEXT NULL,
  stored_procedure_name VARCHAR(255) NULL,
  engine_notes    VARCHAR(512) NULL,
  status_id       SMALLINT UNSIGNED NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_kcalc_uuid (uuid),
  KEY idx_kcalc_kpi (kpi_master_id),
  CONSTRAINT fk_kcalc_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_kcalc_ws FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_kcalc_kpi FOREIGN KEY (kpi_master_id) REFERENCES kpi_master(id) ON DELETE CASCADE,
  CONSTRAINT fk_kcalc_type FOREIGN KEY (calculation_type_id) REFERENCES ref_calculation_type(id),
  CONSTRAINT fk_kcalc_status FOREIGN KEY (status_id) REFERENCES ref_kpi_status(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- KPI Template (KPITemplate + lines)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kpi_template (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  control_unit_id BIGINT UNSIGNED NULL,
  template_name   VARCHAR(255) NOT NULL,
  template_code   VARCHAR(64) NOT NULL,
  category_label  VARCHAR(128) NOT NULL,
  business_scope_id SMALLINT UNSIGNED NULL,
  period_type_id  SMALLINT UNSIGNED NOT NULL,
  description     TEXT NOT NULL,
  status_id       SMALLINT UNSIGNED NOT NULL,
  version_no      INT NOT NULL DEFAULT 1,
  last_updated_at DATETIME(3) NULL,
  last_updated_by BIGINT UNSIGNED NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_ktmpl_uuid (uuid),
  UNIQUE KEY uk_ktmpl_ws_code (workspace_id, template_code),
  CONSTRAINT fk_ktmpl_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_ktmpl_workspace FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_ktmpl_cu FOREIGN KEY (control_unit_id) REFERENCES control_unit(id),
  CONSTRAINT fk_ktmpl_biz FOREIGN KEY (business_scope_id) REFERENCES ref_business_scope(id),
  CONSTRAINT fk_ktmpl_period FOREIGN KEY (period_type_id) REFERENCES ref_period_type(id),
  CONSTRAINT fk_ktmpl_status FOREIGN KEY (status_id) REFERENCES ref_kpi_status(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_template_applicable_role (
  kpi_template_id BIGINT UNSIGNED NOT NULL,
  user_role_id    SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (kpi_template_id, user_role_id),
  CONSTRAINT fk_ktar_tmpl FOREIGN KEY (kpi_template_id) REFERENCES kpi_template(id) ON DELETE CASCADE,
  CONSTRAINT fk_ktar_role FOREIGN KEY (user_role_id) REFERENCES ref_user_role(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_template_shipment_mode (
  kpi_template_id BIGINT UNSIGNED NOT NULL,
  shipment_mode_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (kpi_template_id, shipment_mode_id),
  CONSTRAINT fk_ktsm_tmpl FOREIGN KEY (kpi_template_id) REFERENCES kpi_template(id) ON DELETE CASCADE,
  CONSTRAINT fk_ktsm_mode FOREIGN KEY (shipment_mode_id) REFERENCES ref_shipment_mode(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_template_line (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kpi_template_id BIGINT UNSIGNED NOT NULL,
  kpi_master_id   BIGINT UNSIGNED NOT NULL,
  kpi_code_snapshot VARCHAR(64) NOT NULL,
  kpi_name_snapshot VARCHAR(255) NOT NULL,
  ref_unit_type_id SMALLINT UNSIGNED NOT NULL,
  weight_pct      DECIMAL(9,4) NOT NULL,
  display_order   INT NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_kt_line_tmpl_kpi (kpi_template_id, kpi_master_id),
  KEY idx_kt_line_tmpl (kpi_template_id),
  CONSTRAINT fk_kt_line_tmpl FOREIGN KEY (kpi_template_id) REFERENCES kpi_template(id) ON DELETE CASCADE,
  CONSTRAINT fk_kt_line_kpi FOREIGN KEY (kpi_master_id) REFERENCES kpi_master(id),
  CONSTRAINT fk_kt_line_ut FOREIGN KEY (ref_unit_type_id) REFERENCES ref_unit_type(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_template_changelog (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kpi_template_id BIGINT UNSIGNED NOT NULL,
  version_no      INT NOT NULL,
  changed_at      DATETIME(3) NOT NULL,
  changed_by      BIGINT UNSIGNED NULL,
  change_summary  TEXT NOT NULL,
  KEY idx_kt_chlog_tmpl (kpi_template_id),
  CONSTRAINT fk_kt_chlog_tmpl FOREIGN KEY (kpi_template_id) REFERENCES kpi_template(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Allocation subject (individual vs team — frontend allocatedTo + type)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subject_party (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  subject_type_id SMALLINT UNSIGNED NOT NULL,
  display_name    VARCHAR(255) NOT NULL,
  employee_ref    VARCHAR(64) NULL,
  team_ref        VARCHAR(64) NULL,
  org_node_id     BIGINT UNSIGNED NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_sp_uuid (uuid),
  KEY idx_sp_ws_name (workspace_id, display_name),
  CONSTRAINT fk_sp_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_sp_ws FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_sp_stype FOREIGN KEY (subject_type_id) REFERENCES ref_subject_type(id),
  CONSTRAINT fk_sp_org FOREIGN KEY (org_node_id) REFERENCES org_hierarchy_node(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- KPI Target header: one row per template × subject × fiscal year (TemplateAllocation)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kpi_allocation (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  control_unit_id BIGINT UNSIGNED NULL,
  kpi_template_id BIGINT UNSIGNED NOT NULL,
  fiscal_year_id  BIGINT UNSIGNED NOT NULL,
  period_type_id  SMALLINT UNSIGNED NOT NULL,
  subject_party_id BIGINT UNSIGNED NOT NULL,
  hierarchy_level_id SMALLINT UNSIGNED NOT NULL,
  allocated_label VARCHAR(255) NOT NULL,
  status_id       SMALLINT UNSIGNED NOT NULL,
  approval_status_id SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  is_locked       TINYINT(1) NOT NULL DEFAULT 0,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_kalloc_uuid (uuid),
  UNIQUE KEY uk_kalloc_natural (workspace_id, kpi_template_id, fiscal_year_id, subject_party_id, hierarchy_level_id),
  KEY idx_kalloc_tmpl_fy (kpi_template_id, fiscal_year_id),
  CONSTRAINT fk_kalloc_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_kalloc_ws FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_kalloc_cu FOREIGN KEY (control_unit_id) REFERENCES control_unit(id),
  CONSTRAINT fk_kalloc_tmpl FOREIGN KEY (kpi_template_id) REFERENCES kpi_template(id),
  CONSTRAINT fk_kalloc_fy FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_year(id),
  CONSTRAINT fk_kalloc_period FOREIGN KEY (period_type_id) REFERENCES ref_period_type(id),
  CONSTRAINT fk_kalloc_subj FOREIGN KEY (subject_party_id) REFERENCES subject_party(id),
  CONSTRAINT fk_kalloc_hlvl FOREIGN KEY (hierarchy_level_id) REFERENCES ref_hierarchy_level(id),
  CONSTRAINT fk_kalloc_status FOREIGN KEY (status_id) REFERENCES ref_allocation_status(id),
  CONSTRAINT fk_kalloc_appr FOREIGN KEY (approval_status_id) REFERENCES ref_approval_status(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- KPI Target lines: annual + H1/H2 + quarterly splits (KPITarget)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kpi_target (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  kpi_allocation_id BIGINT UNSIGNED NOT NULL,
  kpi_master_id   BIGINT UNSIGNED NOT NULL,
  kpi_code_snapshot VARCHAR(64) NOT NULL,
  kpi_name_snapshot VARCHAR(255) NOT NULL,
  ref_unit_type_id SMALLINT UNSIGNED NOT NULL,
  weight_pct      DECIMAL(9,4) NOT NULL,
  annual_target   DECIMAL(24,8) NOT NULL,
  h1_target       DECIMAL(24,8) NOT NULL,
  h2_target       DECIMAL(24,8) NOT NULL,
  q1_target       DECIMAL(24,8) NOT NULL,
  q2_target       DECIMAL(24,8) NOT NULL,
  q3_target       DECIMAL(24,8) NOT NULL,
  q4_target       DECIMAL(24,8) NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_ktgt_uuid (uuid),
  UNIQUE KEY uk_ktgt_alloc_kpi (kpi_allocation_id, kpi_master_id),
  KEY idx_ktgt_alloc (kpi_allocation_id),
  CONSTRAINT fk_ktgt_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_ktgt_ws FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_ktgt_alloc FOREIGN KEY (kpi_allocation_id) REFERENCES kpi_allocation(id) ON DELETE CASCADE,
  CONSTRAINT fk_ktgt_kpi FOREIGN KEY (kpi_master_id) REFERENCES kpi_master(id),
  CONSTRAINT fk_ktgt_ut FOREIGN KEY (ref_unit_type_id) REFERENCES ref_unit_type(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Target distribution down to day/week/month (AllocationForm distribution views)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kpi_target_distribution (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kpi_target_id   BIGINT UNSIGNED NOT NULL,
  distribution_type_id SMALLINT UNSIGNED NOT NULL,
  period_sequence SMALLINT UNSIGNED NOT NULL,
  period_label    VARCHAR(32) NULL,
  amount          DECIMAL(24,8) NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_ktdist_tgt_seq (kpi_target_id, distribution_type_id, period_sequence),
  CONSTRAINT fk_ktdist_tgt FOREIGN KEY (kpi_target_id) REFERENCES kpi_target(id) ON DELETE CASCADE,
  CONSTRAINT fk_ktdist_dtype FOREIGN KEY (distribution_type_id) REFERENCES ref_distribution_type(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Actuals (ActualEntry) — grain: allocation × KPI × period × employee (optional)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kpi_actual (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  kpi_allocation_id BIGINT UNSIGNED NOT NULL,
  kpi_master_id   BIGINT UNSIGNED NOT NULL,
  subject_party_id BIGINT UNSIGNED NOT NULL,
  employee_ref    VARCHAR(64) NULL,
  employee_name   VARCHAR(255) NULL,
  user_role_id    SMALLINT UNSIGNED NOT NULL,
  period_type_id  SMALLINT UNSIGNED NOT NULL,
  period_label    VARCHAR(64) NOT NULL,
  fiscal_year_id  BIGINT UNSIGNED NOT NULL,
  time_key_start  INT UNSIGNED NULL,
  time_key_end    INT UNSIGNED NULL,
  target_value    DECIMAL(24,8) NOT NULL,
  actual_value    DECIMAL(24,8) NOT NULL,
  attainment_pct  DECIMAL(9,4) NOT NULL,
  prior_period_pct DECIMAL(9,4) NOT NULL DEFAULT 0,
  rag_id          SMALLINT UNSIGNED NOT NULL,
  trend_json      JSON NULL,
  data_source     VARCHAR(64) NULL DEFAULT 'manual',
  entry_status_id SMALLINT UNSIGNED NOT NULL,
  approval_status_id SMALLINT UNSIGNED NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_kact_uuid (uuid),
  KEY idx_kact_alloc_kpi (kpi_allocation_id, kpi_master_id),
  KEY idx_kact_period (fiscal_year_id, period_label),
  CONSTRAINT fk_kact_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_kact_ws FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_kact_alloc FOREIGN KEY (kpi_allocation_id) REFERENCES kpi_allocation(id) ON DELETE CASCADE,
  CONSTRAINT fk_kact_kpi FOREIGN KEY (kpi_master_id) REFERENCES kpi_master(id),
  CONSTRAINT fk_kact_subj FOREIGN KEY (subject_party_id) REFERENCES subject_party(id),
  CONSTRAINT fk_kact_role FOREIGN KEY (user_role_id) REFERENCES ref_user_role(id),
  CONSTRAINT fk_kact_ptype FOREIGN KEY (period_type_id) REFERENCES ref_period_type(id),
  CONSTRAINT fk_kact_fy FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_year(id),
  CONSTRAINT fk_kact_rag FOREIGN KEY (rag_id) REFERENCES ref_trend_rag(id),
  CONSTRAINT fk_kact_entry_st FOREIGN KEY (entry_status_id) REFERENCES ref_actual_entry_status(id),
  CONSTRAINT fk_kact_appr FOREIGN KEY (approval_status_id) REFERENCES ref_approval_status(id),
  CONSTRAINT fk_kact_tk_s FOREIGN KEY (time_key_start) REFERENCES dim_time(time_key),
  CONSTRAINT fk_kact_tk_e FOREIGN KEY (time_key_end) REFERENCES dim_time(time_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Performance snapshot (materialized target vs actual; reporting / charts)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kpi_performance (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  kpi_allocation_id BIGINT UNSIGNED NOT NULL,
  kpi_master_id   BIGINT UNSIGNED NOT NULL,
  fiscal_year_id  BIGINT UNSIGNED NOT NULL,
  period_type_id  SMALLINT UNSIGNED NOT NULL,
  period_index    SMALLINT UNSIGNED NOT NULL,
  period_label    VARCHAR(64) NOT NULL,
  target_value    DECIMAL(24,8) NOT NULL,
  actual_value    DECIMAL(24,8) NOT NULL,
  variance_value  DECIMAL(24,8) NOT NULL,
  attainment_pct  DECIMAL(9,4) NOT NULL,
  weighted_score  DECIMAL(24,8) NULL,
  rag_id          SMALLINT UNSIGNED NOT NULL,
  calc_run_at     DATETIME(3) NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_kperf_grain (kpi_allocation_id, kpi_master_id, fiscal_year_id, period_type_id, period_index),
  KEY idx_kperf_ws_fy (workspace_id, fiscal_year_id),
  CONSTRAINT fk_kperf_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_kperf_ws FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_kperf_alloc FOREIGN KEY (kpi_allocation_id) REFERENCES kpi_allocation(id) ON DELETE CASCADE,
  CONSTRAINT fk_kperf_kpi FOREIGN KEY (kpi_master_id) REFERENCES kpi_master(id),
  CONSTRAINT fk_kperf_fy FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_year(id),
  CONSTRAINT fk_kperf_pt FOREIGN KEY (period_type_id) REFERENCES ref_period_type(id),
  CONSTRAINT fk_kperf_rag FOREIGN KEY (rag_id) REFERENCES ref_trend_rag(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Period close & carry-forward (PeriodTracker)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kpi_period_instance (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  kpi_template_id BIGINT UNSIGNED NOT NULL,
  fiscal_year_id  BIGINT UNSIGNED NOT NULL,
  period_type_id  SMALLINT UNSIGNED NOT NULL,
  period_index    SMALLINT UNSIGNED NOT NULL,
  period_label    VARCHAR(64) NOT NULL,
  state_enum      ENUM('open','closed') NOT NULL DEFAULT 'open',
  closed_at       DATETIME(3) NULL,
  closed_by       BIGINT UNSIGNED NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_kpi_period_grain (workspace_id, kpi_template_id, fiscal_year_id, period_type_id, period_index),
  CONSTRAINT fk_kpip_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_kpip_ws FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_kpip_tmpl FOREIGN KEY (kpi_template_id) REFERENCES kpi_template(id),
  CONSTRAINT fk_kpip_fy FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_year(id),
  CONSTRAINT fk_kpip_pt FOREIGN KEY (period_type_id) REFERENCES ref_period_type(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_carry_forward_ledger (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  kpi_allocation_id BIGINT UNSIGNED NOT NULL,
  kpi_master_id   BIGINT UNSIGNED NOT NULL,
  from_period_key VARCHAR(64) NOT NULL,
  to_period_key   VARCHAR(64) NOT NULL,
  backlog_in      DECIMAL(24,8) NOT NULL,
  backlog_out     DECIMAL(24,8) NOT NULL,
  next_adjusted_target DECIMAL(24,8) NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  KEY idx_cf_alloc (kpi_allocation_id),
  CONSTRAINT fk_cf_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_cf_ws FOREIGN KEY (workspace_id) REFERENCES workspace(id),
  CONSTRAINT fk_cf_alloc FOREIGN KEY (kpi_allocation_id) REFERENCES kpi_allocation(id) ON DELETE CASCADE,
  CONSTRAINT fk_cf_kpi FOREIGN KEY (kpi_master_id) REFERENCES kpi_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Comments & notes
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kpi_comment (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  entity_type     ENUM('kpi_master','kpi_allocation','kpi_target','kpi_actual','kpi_performance') NOT NULL,
  entity_id       BIGINT UNSIGNED NOT NULL,
  body            TEXT NOT NULL,
  is_internal     TINYINT(1) NOT NULL DEFAULT 0,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  created_by      BIGINT UNSIGNED NULL,
  updated_by      BIGINT UNSIGNED NULL,
  UNIQUE KEY uk_kcomm_uuid (uuid),
  KEY idx_kcomm_entity (entity_type, entity_id),
  CONSTRAINT fk_kcomm_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_kcomm_ws FOREIGN KEY (workspace_id) REFERENCES workspace(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Allocation / target history (UI: AllocationHistoryEntry)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kpi_allocation_event (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kpi_allocation_id BIGINT UNSIGNED NOT NULL,
  event_time      DATETIME(3) NOT NULL,
  changed_by      BIGINT UNSIGNED NULL,
  action_code     ENUM('target-set','distributed','locked','template-changed') NOT NULL,
  detail_text     TEXT NOT NULL,
  KEY idx_kae_alloc (kpi_allocation_id),
  CONSTRAINT fk_kae_alloc FOREIGN KEY (kpi_allocation_id) REFERENCES kpi_allocation(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Audit trail (row-level history for KPI master & allocations)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kpi_audit_log (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  entity_type     VARCHAR(64) NOT NULL,
  entity_uuid     CHAR(36) NOT NULL,
  action          ENUM('insert','update','delete') NOT NULL,
  changed_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  changed_by      BIGINT UNSIGNED NULL,
  old_json        JSON NULL,
  new_json        JSON NULL,
  KEY idx_kal_entity (entity_type, entity_uuid),
  KEY idx_kal_ws_time (workspace_id, changed_at),
  CONSTRAINT fk_kal_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_kal_ws FOREIGN KEY (workspace_id) REFERENCES workspace(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_master_history (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kpi_master_id   BIGINT UNSIGNED NOT NULL,
  version_no      INT NOT NULL,
  snapshot_json   JSON NOT NULL,
  effective_from  DATETIME(3) NOT NULL,
  effective_to    DATETIME(3) NULL,
  changed_by      BIGINT UNSIGNED NULL,
  KEY idx_kmh_kpi (kpi_master_id),
  CONSTRAINT fk_kmh_kpi FOREIGN KEY (kpi_master_id) REFERENCES kpi_master(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Saved analytics filters (ActualsVsTarget "Save Filter")
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_filter_preset (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  uuid            CHAR(36) NOT NULL,
  account_id      BIGINT UNSIGNED NOT NULL,
  workspace_id    BIGINT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NOT NULL,
  name            VARCHAR(128) NOT NULL,
  filter_json     JSON NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_ufp_uuid (uuid),
  UNIQUE KEY uk_ufp_user_name (workspace_id, user_id, name),
  CONSTRAINT fk_ufp_account FOREIGN KEY (account_id) REFERENCES account(id),
  CONSTRAINT fk_ufp_ws FOREIGN KEY (workspace_id) REFERENCES workspace(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- Seed reference data (minimal; expand per environment)
-- -----------------------------------------------------------------------------

INSERT IGNORE INTO ref_period_type (id, code, label, sort_order) VALUES
 (1,'daily','Daily',10),
 (2,'weekly','Weekly',20),
 (3,'monthly','Monthly',30),
 (4,'quarterly','Quarterly',40),
 (5,'annual','Annual',50);

INSERT IGNORE INTO ref_distribution_type (id, code, label) VALUES
 (1,'daily','Daily'),
 (2,'weekly','Weekly'),
 (3,'monthly','Monthly'),
 (4,'annual_quarterly','Annual / Quarterly split');

INSERT IGNORE INTO ref_aggregation_type (id, code, label) VALUES
 (1,'sum','SUM'),
 (2,'avg','AVG'),
 (3,'min','MIN'),
 (4,'max','MAX'),
 (5,'weighted_avg','Weighted average'),
 (6,'last','Last value');

INSERT IGNORE INTO ref_calculation_type (id, code, label) VALUES
 (1,'auto','Auto / System'),
 (2,'manual','Manual'),
 (3,'formula','Formula'),
 (4,'cumulative_ytd','Cumulative YTD'),
 (5,'rolling_avg','Rolling average'),
 (6,'weighted_avg','Weighted average'),
 (7,'stored_procedure','Stored procedure');

INSERT IGNORE INTO ref_kpi_status (id, code, label) VALUES
 (1,'draft','Draft'),
 (2,'active','Active'),
 (3,'archived','Archived'),
 (4,'inactive','Inactive');

INSERT IGNORE INTO ref_approval_status (id, code, label) VALUES
 (1,'none','None'),
 (2,'pending','Pending'),
 (3,'approved','Approved'),
 (4,'rejected','Rejected');

INSERT IGNORE INTO ref_trend_rag (id, code, label) VALUES
 (1,'green','Green'),
 (2,'amber','Amber'),
 (3,'red','Red');

INSERT IGNORE INTO ref_unit_type (id, code, label) VALUES
 (1,'percentage','Percentage'),
 (2,'number','Number'),
 (3,'currency','Currency'),
 (4,'days','Days'),
 (5,'hours','Hours'),
 (6,'teu','TEU'),
 (7,'cbm','CBM'),
 (8,'tonnes','Tonnes'),
 (9,'score','Score'),
 (10,'ratio','Ratio');

INSERT IGNORE INTO ref_shipment_mode (id, code, label) VALUES
 (1,'sea','Sea'),(2,'air','Air'),(3,'road','Road'),(4,'rail','Rail'),
 (5,'multimodal','Multimodal'),(6,'courier','Courier');

INSERT IGNORE INTO ref_trade_direction (id, code, label) VALUES
 (1,'import','Import'),(2,'export','Export'),(3,'cross_trade','Cross trade'),
 (4,'import_clearance','Import clearance'),(5,'export_clearance','Export clearance');

INSERT IGNORE INTO ref_business_scope (id, code, label) VALUES
 (1,'freight','Freight'),(2,'corporate','Corporate');

INSERT IGNORE INTO ref_hierarchy_level (id, code, label, level_rank) VALUES
 (1,'leadership','Leadership',10),
 (2,'branch_head','Branch head',20),
 (3,'sales_manager','Sales manager',30),
 (4,'sales_lead','Sales lead',40),
 (5,'sales_executive','Sales executive',50);

INSERT IGNORE INTO ref_user_role (id, code, label) VALUES
 (1,'pricing_exec','Pricing exec'),
 (2,'pricing_mgr','Pricing mgr'),
 (3,'ops_exec','Ops exec'),
 (4,'ops_mgr','Ops mgr'),
 (5,'senior_mgmt','Senior mgmt'),
 (6,'branch_head','Branch head'),
 (7,'leadership','Leadership'),
 (8,'sales_manager','Sales manager'),
 (9,'sales_lead','Sales lead'),
 (10,'sales_executive','Sales executive');

INSERT IGNORE INTO ref_allocation_status (id, code, label) VALUES
 (1,'draft','Draft'),
 (2,'confirmed','Confirmed'),
 (3,'locked','Locked');

INSERT IGNORE INTO ref_subject_type (id, code, label) VALUES
 (1,'individual','Individual'),
 (2,'team','Team');

INSERT IGNORE INTO ref_trend_direction (id, code, label) VALUES
 (1,'higher_better','Higher is better'),
 (2,'lower_better','Lower is better'),
 (3,'target_range','Target range');

INSERT IGNORE INTO ref_actual_entry_status (id, code, label) VALUES
 (1,'draft','Draft'),
 (2,'submitted','Submitted'),
 (3,'approved','Approved'),
 (4,'rejected','Rejected');
