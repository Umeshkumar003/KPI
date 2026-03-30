-- =============================================================================
-- KPI Management System — MySQL 8.x Physical Data Model
-- Schema : c1s1_billing_crm_DEV_1_s4JNKRDR_dev
-- Aligned with dev environment (verified via MCP 2026-03-30)
--
-- Conventions (matching dev platform):
--   • Business entity PKs  : CHAR(36) UUID
--   • Lookup / master PKs  : INT (auto-increment where applicable)
--   • Timestamps            : timestamp DEFAULT CURRENT_TIMESTAMP
--   • Multi-tenant cols     : account_id / workspace_id / control_unit_id CHAR(36)
--   • Workflow state col    : per-table ENUM  (e.g. kpi_master_states_status)
--   • created_by/updated_by : CHAR(36) (user UUID)
--   • No FK to account/workspace (platform-managed, schema unknown here)
--
-- File structure:
--   SECTION 1 — Existing platform tables (already in dev — reference only)
--   SECTION 2 — KPI-specific lookup / master tables  (new, INT PK)
--   SECTION 3 — Existing KPI tables (already in dev — exact structure)
--   SECTION 4 — New KPI business tables (CHAR(36) PK, dev-aligned)
--   SECTION 5 — Seed data
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- SECTION 1 : EXISTING PLATFORM TABLES
-- These already exist in the dev schema.  Shown here so FK targets are
-- documented and the file can be run safely with IF NOT EXISTS.
-- DO NOT ALTER these definitions without checking the platform baseline.
-- =============================================================================

-- Platform: control_unit
CREATE TABLE IF NOT EXISTS control_unit (
  control_unit_id          CHAR(36)     NOT NULL,
  control_unit_label       VARCHAR(255) NULL,
  control_unit_level_id    CHAR(36)     NULL,
  account_id               CHAR(36)     NULL,
  workspace_id             CHAR(36)     NULL,
  control_unit_name        VARCHAR(255) NULL,
  control_unit_description VARCHAR(255) NULL,
  parent_control_unit_id   CHAR(36)     NULL,
  status_id                INT          NULL DEFAULT 1,
  control_unit_code        CHAR(36)     NULL,
  created_at               TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by               CHAR(36)     NULL,
  updated_by               VARCHAR(45)  NULL,
  control_unit_type        VARCHAR(255) NULL,
  base_currency_id         INT          NULL,
  segment_tag_id           INT          NULL,
  PRIMARY KEY (control_unit_id),
  KEY idx_cu_parent (parent_control_unit_id),
  KEY idx_cu_level  (control_unit_level_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Platform: fiscal_year
CREATE TABLE IF NOT EXISTS fiscal_year (
  fiscal_year_id            CHAR(36)    NOT NULL,
  account_id                CHAR(36)    NOT NULL,
  workspace_id              CHAR(36)    NOT NULL,
  control_unit_id           CHAR(36)    NOT NULL,
  fiscal_year_code          VARCHAR(20) NOT NULL,
  fiscal_year_name          VARCHAR(100) NOT NULL,
  fiscal_year_number        INT         NOT NULL,
  fiscal_year_start_date    DATE        NOT NULL,
  fiscal_year_end_date      DATE        NOT NULL,
  fiscal_template_id        CHAR(36)    NOT NULL,
  is_closed                 TINYINT(1)  NOT NULL DEFAULT 0,
  closed_at                 TIMESTAMP   NULL,
  closed_by                 CHAR(36)    NULL,
  status_id                 INT         NOT NULL DEFAULT 1,
  is_current_fiscal_year    TINYINT(1)  NOT NULL DEFAULT 0,
  opening_balance_posted    TINYINT(1)  NOT NULL DEFAULT 0,
  closing_process_completed TINYINT(1)  NOT NULL DEFAULT 0,
  audit_completed           TINYINT(1)  NOT NULL DEFAULT 0,
  audit_completed_at        TIMESTAMP   NULL DEFAULT '0000-00-00 00:00:00',
  has_adjustment_period     TINYINT(1)  NOT NULL DEFAULT 0,
  created_at                TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
  created_by                CHAR(36)    NOT NULL,
  updated_at                TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by                CHAR(36)    NOT NULL,
  PRIMARY KEY (fiscal_year_id),
  KEY idx_fy_cu       (control_unit_id),
  KEY idx_fy_template (fiscal_template_id),
  KEY idx_fy_status   (status_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Platform: fiscal_periods
CREATE TABLE IF NOT EXISTS fiscal_periods (
  period_id                      CHAR(36)    NOT NULL,
  account_id                     CHAR(36)    NOT NULL,
  workspace_id                   CHAR(36)    NOT NULL,
  control_unit_id                CHAR(36)    NOT NULL,
  fiscal_year_id                 CHAR(36)    NOT NULL,
  parent_period_id               CHAR(36)    NULL,
  period_name                    VARCHAR(50) NOT NULL,
  period_code                    VARCHAR(50) NOT NULL,
  period_sequence_number         INT         NOT NULL,
  period_type_id                 INT         NOT NULL,
  start_date                     DATE        NOT NULL,
  end_date                       DATE        NOT NULL,
  quarter_number                 INT         NULL,
  month_number                   INT         NULL,
  is_adjustment_period           TINYINT(1)  NOT NULL DEFAULT 0,
  is_current                     TINYINT(1)  NOT NULL DEFAULT 0,
  status_id                      INT         NOT NULL,
  period_state_id                INT         NULL DEFAULT 1,
  created_at                     TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
  created_by                     CHAR(36)    NOT NULL,
  updated_at                     TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by                     CHAR(36)    NOT NULL,
  fiscal_periods_workflow_status ENUM('draft','open','closed','locked','reopen') NULL DEFAULT 'draft',
  PRIMARY KEY (period_id),
  KEY idx_fp_fy     (fiscal_year_id),
  KEY idx_fp_pt     (period_type_id),
  KEY idx_fp_status (status_id),
  KEY idx_fp_state  (period_state_id),
  CONSTRAINT fk_fp_fy FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_year(fiscal_year_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Platform: period_type
CREATE TABLE IF NOT EXISTS period_type (
  period_type_id   INT         NOT NULL AUTO_INCREMENT,
  period_type_name VARCHAR(50) NOT NULL,
  PRIMARY KEY (period_type_id),
  UNIQUE KEY uk_period_type_name (period_type_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Platform: time_dimension
CREATE TABLE IF NOT EXISTS time_dimension (
  date_id            INT         NOT NULL AUTO_INCREMENT,
  date               DATE        NOT NULL,
  day_name           VARCHAR(10) NOT NULL,
  day_of_week        INT         NOT NULL,
  day_of_month       INT         NOT NULL,
  day_of_year        INT         NOT NULL,
  week_in_year       INT         NOT NULL,
  week_in_month      INT         NOT NULL,
  week_start_date    DATE        NOT NULL,
  week_end_date      DATE        NOT NULL,
  month              INT         NOT NULL,
  month_name         VARCHAR(10) NOT NULL,
  month_start_date   DATE        NOT NULL,
  month_end_date     DATE        NOT NULL,
  days_in_month      INT         NOT NULL,
  quarter            INT         NOT NULL,
  quarter_name       VARCHAR(10) NOT NULL,
  quarter_start_date DATE        NOT NULL,
  quarter_end_date   DATE        NOT NULL,
  year               INT         NOT NULL,
  year_start_date    DATE        NOT NULL,
  year_end_date      DATE        NOT NULL,
  days_in_year       INT         NOT NULL,
  is_leap_year       TINYINT     NOT NULL,
  is_month_start     TINYINT     NOT NULL,
  is_month_end       TINYINT     NOT NULL,
  is_quarter_start   TINYINT     NOT NULL,
  is_quarter_end     TINYINT     NOT NULL,
  is_year_start      TINYINT     NOT NULL,
  is_year_end        TINYINT     NOT NULL,
  created_at         TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (date_id),
  UNIQUE KEY uk_td_date (date),
  KEY idx_td_week (week_in_year),
  KEY idx_td_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Platform: department
CREATE TABLE IF NOT EXISTS department (
  department_id          CHAR(36)    NOT NULL,
  department_name        VARCHAR(20) NOT NULL,
  department_description TEXT        NULL,
  department_code        VARCHAR(20) NULL,
  status_id              INT         NULL DEFAULT 1,
  company_id             CHAR(36)    NOT NULL,
  account_id             CHAR(36)    NOT NULL,
  workspace_id           CHAR(36)    NOT NULL,
  control_unit_id        CHAR(36)    NULL,
  created_by             CHAR(36)    NULL,
  created_time           TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by             CHAR(36)    NULL,
  updated_at             TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  department_category_id INT         NULL,
  department_category    VARCHAR(45) NULL,
  PRIMARY KEY (department_id),
  KEY idx_dept_company (company_id),
  KEY idx_dept_cu      (control_unit_id),
  KEY idx_dept_status  (status_id),
  KEY idx_dept_cat     (department_category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Platform: target_status_master
CREATE TABLE IF NOT EXISTS target_status_master (
  target_status_id   INT          NOT NULL,
  target_status_name VARCHAR(255) NOT NULL,
  PRIMARY KEY (target_status_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Platform: plan_status_master
CREATE TABLE IF NOT EXISTS plan_status_master (
  plan_status_id   INT          NOT NULL,
  plan_status_name VARCHAR(255) NOT NULL,
  PRIMARY KEY (plan_status_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SECTION 2 : KPI-SPECIFIC LOOKUP / REFERENCE TABLES
-- New tables not in the existing platform schema.
-- Convention: INT AUTO_INCREMENT primary key (matches platform lookup pattern).
-- =============================================================================

CREATE TABLE IF NOT EXISTS kpi_aggregation_type_master (
  id    INT         NOT NULL AUTO_INCREMENT,
  code  VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_kagg_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_calculation_type_master (
  id    INT         NOT NULL AUTO_INCREMENT,
  code  VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_kcalct_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_distribution_type_master (
  id    INT         NOT NULL AUTO_INCREMENT,
  code  VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_kdist_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_rag_master (
  id    INT         NOT NULL AUTO_INCREMENT,
  code  VARCHAR(16) NOT NULL,
  label VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_krag_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_unit_type_master (
  id    INT         NOT NULL AUTO_INCREMENT,
  code  VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_kut_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_trend_direction_master (
  id    INT         NOT NULL AUTO_INCREMENT,
  code  VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ktd_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_shipment_mode_master (
  id    INT         NOT NULL AUTO_INCREMENT,
  code  VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ksm_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_trade_direction_master (
  id    INT         NOT NULL AUTO_INCREMENT,
  code  VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ktrade_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_business_scope_master (
  id    INT         NOT NULL AUTO_INCREMENT,
  code  VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_kbiz_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_hierarchy_level_master (
  id         INT         NOT NULL AUTO_INCREMENT,
  code       VARCHAR(32) NOT NULL,
  label      VARCHAR(64) NOT NULL,
  level_rank SMALLINT    NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_khl_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_approval_status_master (
  id    INT         NOT NULL AUTO_INCREMENT,
  code  VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_kappr_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_allocation_status_master (
  id    INT         NOT NULL AUTO_INCREMENT,
  code  VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_kalloc_st_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_subject_type_master (
  id    INT         NOT NULL AUTO_INCREMENT,
  code  VARCHAR(16) NOT NULL,
  label VARCHAR(32) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ksubj_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kpi_actual_entry_status_master (
  id    INT         NOT NULL AUTO_INCREMENT,
  code  VARCHAR(32) NOT NULL,
  label VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_kaes_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SECTION 3 : EXISTING KPI TABLES  (already in dev — exact structure)
-- =============================================================================

-- KPI Type Master
-- PK: INT (not auto-increment in dev; values are managed externally)
CREATE TABLE IF NOT EXISTS KPI_type_master (
  kpi_type_id          INT          NOT NULL,
  kpi_type_code        CHAR(36)     NOT NULL,
  kpi_type_name        VARCHAR(255) NOT NULL,
  kpi_type_description TEXT         NULL,
  status_id            INT          NULL,
  created_at           TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  created_by           CHAR(36)     NULL,
  updated_at           TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by           CHAR(36)     NULL,
  PRIMARY KEY (kpi_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Master
-- PK: INT AUTO_INCREMENT (existing dev convention for this table)
-- Workflow state: kpi_master_states_status ENUM
CREATE TABLE IF NOT EXISTS KPI_master (
  kpi_id                   INT         NOT NULL AUTO_INCREMENT,
  account_id               CHAR(36)    NULL,
  workspace_id             CHAR(36)    NULL,
  control_unit_id          CHAR(36)    NULL,
  kpi_type_id              INT         NULL,
  department_id            CHAR(36)    NULL,
  kpi_code                 VARCHAR(50) NULL,
  kpi_name                 VARCHAR(255) NULL,
  kpi_description          TEXT        NULL,
  unit_of_measure          ENUM('Amount','Number') NULL,
  calculation_type         ENUM('Manual','Auto')   NULL DEFAULT 'Manual',
  status_id                INT         NULL,
  created_at               TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
  created_by               CHAR(36)    NULL,
  updated_at               TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by               CHAR(36)    NULL,
  kpi_master_states_status ENUM('draft') NULL DEFAULT 'draft',
  PRIMARY KEY (kpi_id),
  KEY idx_km_kpi_type (kpi_type_id),
  KEY idx_km_dept     (department_id),
  CONSTRAINT fk_km_kpi_type FOREIGN KEY (kpi_type_id)   REFERENCES KPI_type_master(kpi_type_id),
  CONSTRAINT fk_km_dept     FOREIGN KEY (department_id)  REFERENCES department(department_id),
  CONSTRAINT fk_km_cu       FOREIGN KEY (control_unit_id) REFERENCES control_unit(control_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Year Plans  (plan header: employee × fiscal year)
-- Equivalent of TemplateAllocation at the plan level.
-- Workflow state: kpi_year_plan_master_states_status ENUM
CREATE TABLE IF NOT EXISTS KPI_year_plans (
  kpi_year_plan_id                   CHAR(36)    NOT NULL,
  account_id                         CHAR(36)    NULL,
  workspace_id                       CHAR(36)    NULL,
  control_unit_id                    CHAR(36)    NULL,
  employee_id                        CHAR(36)    NULL,
  department_id                      CHAR(36)    NULL,
  fiscal_year_id                     CHAR(36)    NULL,
  plan_status_id                     INT         NULL,
  is_locked                          TINYINT(1)  NULL DEFAULT 0,
  submitted_at                       TIMESTAMP   NULL,
  submitted_by                       CHAR(36)    NULL,
  approved_at                        TIMESTAMP   NULL,
  notes                              TEXT        NULL,
  created_at                         TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
  created_by                         CHAR(36)    NULL,
  updated_at                         TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by                         CHAR(36)    NULL,
  kpi_year_plan_master_states_status ENUM('draft','submitted','approved','locked') NULL DEFAULT 'draft',
  PRIMARY KEY (kpi_year_plan_id),
  KEY idx_kyp_emp         (employee_id),
  KEY idx_kyp_plan_status (plan_status_id),
  CONSTRAINT fk_kyp_fy          FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_year(fiscal_year_id),
  CONSTRAINT fk_kyp_plan_status FOREIGN KEY (plan_status_id) REFERENCES plan_status_master(plan_status_id),
  CONSTRAINT fk_kyp_cu          FOREIGN KEY (control_unit_id) REFERENCES control_unit(control_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Targets  (annual target per KPI × year plan)
-- Workflow state: kpi_target_states_status ENUM
CREATE TABLE IF NOT EXISTS KPI_targets (
  kpi_target_id            CHAR(36)      NOT NULL,
  account_id               CHAR(36)      NULL,
  workspace_id             CHAR(36)      NULL,
  control_unit_id          CHAR(36)      NULL,
  kpi_year_plan_id         CHAR(36)      NULL,
  kpi_id                   INT           NULL,
  employee_id              CHAR(36)      NULL,
  fiscal_year_id           CHAR(36)      NULL,
  annual_target_value      DECIMAL(18,2) NULL,
  target_status_id         INT           NULL,
  approved_at              TIMESTAMP     NULL,
  approved_by              CHAR(36)      NULL,
  is_locked                TINYINT(1)    NULL DEFAULT 0,
  created_at               TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  created_by               CHAR(36)      NULL,
  updated_at               TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by               CHAR(36)      NULL,
  kpi_target_states_status ENUM('draft','approved','locked') NULL DEFAULT 'draft',
  PRIMARY KEY (kpi_target_id),
  KEY idx_kt_kyp        (kpi_year_plan_id),
  KEY idx_kt_kpi        (kpi_id),
  KEY idx_kt_tgt_status (target_status_id),
  CONSTRAINT fk_kt_kyp        FOREIGN KEY (kpi_year_plan_id) REFERENCES KPI_year_plans(kpi_year_plan_id) ON DELETE CASCADE,
  CONSTRAINT fk_kt_kpi        FOREIGN KEY (kpi_id)           REFERENCES KPI_master(kpi_id),
  CONSTRAINT fk_kt_tgt_status FOREIGN KEY (target_status_id) REFERENCES target_status_master(target_status_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Period Targets  (period-level target split per KPI target)
CREATE TABLE IF NOT EXISTS KPI_period_targets (
  kpi_period_target_id CHAR(36)      NOT NULL,
  account_id           CHAR(36)      NULL,
  workspace_id         CHAR(36)      NULL,
  control_unit_id      CHAR(36)      NULL,
  kpi_target_id        CHAR(36)      NULL,
  period_id            CHAR(36)      NULL,
  period_target_value  DECIMAL(18,2) NULL,
  status_id            INT           NULL,
  created_at           TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  created_by           CHAR(36)      NULL,
  updated_at           TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by           CHAR(36)      NULL,
  PRIMARY KEY (kpi_period_target_id),
  KEY idx_kpt_tgt    (kpi_target_id),
  KEY idx_kpt_period (period_id),
  CONSTRAINT fk_kpt_tgt    FOREIGN KEY (kpi_target_id) REFERENCES KPI_targets(kpi_target_id) ON DELETE CASCADE,
  CONSTRAINT fk_kpt_period FOREIGN KEY (period_id)     REFERENCES fiscal_periods(period_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Period Actual  (actual value per period target)
CREATE TABLE IF NOT EXISTS KPI_period_actual (
  kpi_period_actual_id CHAR(36)      NOT NULL,
  account_id           CHAR(36)      NULL,
  workspace_id         CHAR(36)      NULL,
  control_unit_id      CHAR(36)      NULL,
  kpi_period_target_id CHAR(36)      NULL,
  actual_value         DECIMAL(18,2) NULL,
  calculated_on        DATE          NULL,
  created_at           TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  created_by           CHAR(36)      NULL,
  updated_at           TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by           CHAR(36)      NULL,
  PRIMARY KEY (kpi_period_actual_id),
  KEY idx_kpa_pt (kpi_period_target_id),
  CONSTRAINT fk_kpa_pt FOREIGN KEY (kpi_period_target_id) REFERENCES KPI_period_targets(kpi_period_target_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SECTION 4 : NEW KPI BUSINESS TABLES
-- Not yet in dev.  Follow dev conventions: CHAR(36) PK, timestamp cols,
-- CHAR(36) for all entity FKs, INT for lookup FKs.
-- Lowercase kpi_ prefix to distinguish from existing uppercase KPI_ tables.
-- =============================================================================

-- Unit of Measure (KPI-specific; separate from cs_unit_of_measure platform table)
CREATE TABLE IF NOT EXISTS kpi_unit_of_measure (
  uom_id          CHAR(36)     NOT NULL,
  account_id      CHAR(36)     NOT NULL,
  workspace_id    CHAR(36)     NOT NULL,
  control_unit_id CHAR(36)     NULL,
  code            VARCHAR(64)  NOT NULL,
  name            VARCHAR(255) NOT NULL,
  unit_type_id    INT          NOT NULL,
  display_symbol  VARCHAR(16)  NULL,
  decimals        TINYINT      NOT NULL DEFAULT 2,
  status_id       INT          NULL DEFAULT 1,
  created_at      TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  created_by      CHAR(36)     NULL,
  updated_at      TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by      CHAR(36)     NULL,
  PRIMARY KEY (uom_id),
  UNIQUE KEY uk_kuom_ws_code (workspace_id, code),
  KEY idx_kuom_ut (unit_type_id),
  CONSTRAINT fk_kuom_ut FOREIGN KEY (unit_type_id)   REFERENCES kpi_unit_type_master(id),
  CONSTRAINT fk_kuom_cu FOREIGN KEY (control_unit_id) REFERENCES control_unit(control_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Master — Shipment Mode cross-reference
CREATE TABLE IF NOT EXISTS kpi_master_shipment_mode_xref (
  kpi_id           INT NOT NULL,
  shipment_mode_id INT NOT NULL,
  PRIMARY KEY (kpi_id, shipment_mode_id),
  CONSTRAINT fk_kmsm_kpi  FOREIGN KEY (kpi_id)           REFERENCES KPI_master(kpi_id) ON DELETE CASCADE,
  CONSTRAINT fk_kmsm_mode FOREIGN KEY (shipment_mode_id) REFERENCES kpi_shipment_mode_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Master — Trade Direction cross-reference
CREATE TABLE IF NOT EXISTS kpi_master_trade_direction_xref (
  kpi_id             INT NOT NULL,
  trade_direction_id INT NOT NULL,
  PRIMARY KEY (kpi_id, trade_direction_id),
  CONSTRAINT fk_kmtd_kpi FOREIGN KEY (kpi_id)             REFERENCES KPI_master(kpi_id) ON DELETE CASCADE,
  CONSTRAINT fk_kmtd_td  FOREIGN KEY (trade_direction_id) REFERENCES kpi_trade_direction_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Threshold (RAG bands per KPI)
CREATE TABLE IF NOT EXISTS kpi_threshold (
  threshold_id CHAR(36)      NOT NULL,
  kpi_id       INT           NOT NULL,
  rag_id       INT           NOT NULL,
  min_value    DECIMAL(24,8) NOT NULL,
  max_value    DECIMAL(24,8) NOT NULL,
  created_at   TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  created_by   CHAR(36)      NULL,
  updated_at   TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by   CHAR(36)      NULL,
  PRIMARY KEY (threshold_id),
  UNIQUE KEY uk_kth_kpi_rag (kpi_id, rag_id),
  CONSTRAINT fk_kth_kpi FOREIGN KEY (kpi_id) REFERENCES KPI_master(kpi_id) ON DELETE CASCADE,
  CONSTRAINT fk_kth_rag FOREIGN KEY (rag_id) REFERENCES kpi_rag_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Hierarchy (parent–child KPI relationships)
CREATE TABLE IF NOT EXISTS kpi_hierarchy (
  hierarchy_id   CHAR(36)  NOT NULL,
  account_id     CHAR(36)  NOT NULL,
  workspace_id   CHAR(36)  NOT NULL,
  parent_kpi_id  INT       NOT NULL,
  child_kpi_id   INT       NOT NULL,
  sort_order     INT       NOT NULL DEFAULT 0,
  effective_from DATE      NULL,
  effective_to   DATE      NULL,
  created_at     TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  created_by     CHAR(36)  NULL,
  PRIMARY KEY (hierarchy_id),
  UNIQUE KEY uk_khier_par_ch (parent_kpi_id, child_kpi_id),
  CONSTRAINT fk_khier_parent FOREIGN KEY (parent_kpi_id) REFERENCES KPI_master(kpi_id) ON DELETE CASCADE,
  CONSTRAINT fk_khier_child  FOREIGN KEY (child_kpi_id)  REFERENCES KPI_master(kpi_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Calculation definition (formula / stored procedure per KPI)
CREATE TABLE IF NOT EXISTS kpi_calculation (
  calculation_id        CHAR(36)     NOT NULL,
  account_id            CHAR(36)     NOT NULL,
  workspace_id          CHAR(36)     NOT NULL,
  kpi_id                INT          NOT NULL,
  calculation_type_id   INT          NOT NULL,
  formula_expression    TEXT         NULL,
  stored_procedure_name VARCHAR(255) NULL,
  engine_notes          VARCHAR(512) NULL,
  status_id             INT          NULL DEFAULT 1,
  created_at            TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  created_by            CHAR(36)     NULL,
  updated_at            TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by            CHAR(36)     NULL,
  PRIMARY KEY (calculation_id),
  KEY idx_kcalc_kpi (kpi_id),
  CONSTRAINT fk_kcalc_kpi  FOREIGN KEY (kpi_id)              REFERENCES KPI_master(kpi_id) ON DELETE CASCADE,
  CONSTRAINT fk_kcalc_type FOREIGN KEY (calculation_type_id) REFERENCES kpi_calculation_type_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Template (scorecard template grouping multiple KPIs)
-- Workflow state: kpi_template_workflow_status ENUM
CREATE TABLE IF NOT EXISTS kpi_template (
  template_id        CHAR(36)     NOT NULL,
  account_id         CHAR(36)     NOT NULL,
  workspace_id       CHAR(36)     NOT NULL,
  control_unit_id    CHAR(36)     NULL,
  template_name      VARCHAR(255) NOT NULL,
  template_code      VARCHAR(64)  NOT NULL,
  category_label     VARCHAR(128) NOT NULL,
  business_scope_id  INT          NULL,
  job_type           VARCHAR(64)  NOT NULL DEFAULT 'All' COMMENT 'Equipment/cargo scope: All, FCL, LCL, Air…',
  period_type_id     INT          NOT NULL,
  description        TEXT         NOT NULL,
  status_id          INT          NULL DEFAULT 1,
  version_no         INT          NOT NULL DEFAULT 1,
  last_updated_at    TIMESTAMP    NULL,
  last_updated_by    CHAR(36)     NULL,
  created_at         TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  created_by         CHAR(36)     NULL,
  updated_at         TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by         CHAR(36)     NULL,
  kpi_template_workflow_status ENUM('draft','active','archived') NULL DEFAULT 'draft',
  PRIMARY KEY (template_id),
  UNIQUE KEY uk_ktmpl_ws_code (workspace_id, template_code),
  CONSTRAINT fk_ktmpl_cu     FOREIGN KEY (control_unit_id)   REFERENCES control_unit(control_unit_id),
  CONSTRAINT fk_ktmpl_biz    FOREIGN KEY (business_scope_id) REFERENCES kpi_business_scope_master(id),
  CONSTRAINT fk_ktmpl_period FOREIGN KEY (period_type_id)    REFERENCES period_type(period_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Template — Applicable Role cross-reference
-- Uses role_code string (matches es_service_role / app_role patterns in platform)
CREATE TABLE IF NOT EXISTS kpi_template_applicable_role_xref (
  template_id CHAR(36)    NOT NULL,
  role_code   VARCHAR(64) NOT NULL,
  PRIMARY KEY (template_id, role_code),
  CONSTRAINT fk_ktar_tmpl FOREIGN KEY (template_id) REFERENCES kpi_template(template_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Template — Shipment Mode cross-reference
CREATE TABLE IF NOT EXISTS kpi_template_shipment_mode_xref (
  template_id      CHAR(36) NOT NULL,
  shipment_mode_id INT      NOT NULL,
  PRIMARY KEY (template_id, shipment_mode_id),
  CONSTRAINT fk_ktsm_tmpl FOREIGN KEY (template_id)      REFERENCES kpi_template(template_id) ON DELETE CASCADE,
  CONSTRAINT fk_ktsm_mode FOREIGN KEY (shipment_mode_id) REFERENCES kpi_shipment_mode_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Template — Trade Direction cross-reference
CREATE TABLE IF NOT EXISTS kpi_template_trade_direction_xref (
  template_id        CHAR(36) NOT NULL,
  trade_direction_id INT      NOT NULL,
  PRIMARY KEY (template_id, trade_direction_id),
  CONSTRAINT fk_kttd_tmpl FOREIGN KEY (template_id)        REFERENCES kpi_template(template_id) ON DELETE CASCADE,
  CONSTRAINT fk_kttd_td   FOREIGN KEY (trade_direction_id) REFERENCES kpi_trade_direction_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Template Lines (KPIs included in a template with weights)
CREATE TABLE IF NOT EXISTS kpi_template_line (
  line_id           CHAR(36)     NOT NULL,
  template_id       CHAR(36)     NOT NULL,
  kpi_id            INT          NOT NULL,
  kpi_code_snapshot VARCHAR(64)  NOT NULL,
  kpi_name_snapshot VARCHAR(255) NOT NULL,
  unit_type_id      INT          NOT NULL,
  weight_pct        DECIMAL(9,4) NOT NULL,
  display_order     INT          NOT NULL,
  created_at        TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  created_by        CHAR(36)     NULL,
  updated_at        TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by        CHAR(36)     NULL,
  PRIMARY KEY (line_id),
  UNIQUE KEY uk_ktl_tmpl_kpi (template_id, kpi_id),
  KEY idx_ktl_tmpl (template_id),
  CONSTRAINT fk_ktl_tmpl FOREIGN KEY (template_id) REFERENCES kpi_template(template_id) ON DELETE CASCADE,
  CONSTRAINT fk_ktl_kpi  FOREIGN KEY (kpi_id)      REFERENCES KPI_master(kpi_id),
  CONSTRAINT fk_ktl_ut   FOREIGN KEY (unit_type_id) REFERENCES kpi_unit_type_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Template Changelog
CREATE TABLE IF NOT EXISTS kpi_template_changelog (
  changelog_id   CHAR(36)  NOT NULL,
  template_id    CHAR(36)  NOT NULL,
  version_no     INT       NOT NULL,
  changed_at     TIMESTAMP NOT NULL,
  changed_by     CHAR(36)  NULL,
  change_summary TEXT      NOT NULL,
  PRIMARY KEY (changelog_id),
  KEY idx_ktcl_tmpl (template_id),
  CONSTRAINT fk_ktcl_tmpl FOREIGN KEY (template_id) REFERENCES kpi_template(template_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subject Party (individual or team used as allocation target)
CREATE TABLE IF NOT EXISTS kpi_subject_party (
  subject_party_id CHAR(36)     NOT NULL,
  account_id       CHAR(36)     NOT NULL,
  workspace_id     CHAR(36)     NOT NULL,
  subject_type_id  INT          NOT NULL,
  display_name     VARCHAR(255) NOT NULL,
  employee_ref     VARCHAR(64)  NULL,
  team_ref         VARCHAR(64)  NULL,
  control_unit_id  CHAR(36)     NULL,
  created_at       TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  created_by       CHAR(36)     NULL,
  updated_at       TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by       CHAR(36)     NULL,
  PRIMARY KEY (subject_party_id),
  KEY idx_ksp_ws (workspace_id),
  CONSTRAINT fk_ksp_stype FOREIGN KEY (subject_type_id)  REFERENCES kpi_subject_type_master(id),
  CONSTRAINT fk_ksp_cu    FOREIGN KEY (control_unit_id)  REFERENCES control_unit(control_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Organisation Hierarchy Node (for template allocation hierarchy tree UI)
CREATE TABLE IF NOT EXISTS kpi_org_hierarchy_node (
  node_id            CHAR(36)     NOT NULL,
  account_id         CHAR(36)     NOT NULL,
  workspace_id       CHAR(36)     NOT NULL,
  control_unit_id    CHAR(36)     NULL,
  parent_node_id     CHAR(36)     NULL,
  node_name          VARCHAR(255) NOT NULL,
  hierarchy_level_id INT          NOT NULL,
  region             VARCHAR(128) NULL,
  allocation_status  ENUM('allocated','partial','none') NOT NULL DEFAULT 'none',
  external_ref       VARCHAR(128) NULL,
  created_at         TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  created_by         CHAR(36)     NULL,
  updated_at         TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by         CHAR(36)     NULL,
  PRIMARY KEY (node_id),
  KEY idx_kohn_parent (parent_node_id),
  KEY idx_kohn_ws     (workspace_id),
  CONSTRAINT fk_kohn_cu     FOREIGN KEY (control_unit_id)    REFERENCES control_unit(control_unit_id),
  CONSTRAINT fk_kohn_parent FOREIGN KEY (parent_node_id)     REFERENCES kpi_org_hierarchy_node(node_id),
  CONSTRAINT fk_kohn_level  FOREIGN KEY (hierarchy_level_id) REFERENCES kpi_hierarchy_level_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Allocation (template × subject × fiscal year header)
-- Extended complement to KPI_year_plans: links template + subject party + fiscal year.
-- Workflow state: kpi_allocation_workflow_status ENUM
CREATE TABLE IF NOT EXISTS kpi_allocation (
  allocation_id      CHAR(36)     NOT NULL,
  account_id         CHAR(36)     NOT NULL,
  workspace_id       CHAR(36)     NOT NULL,
  control_unit_id    CHAR(36)     NULL,
  template_id        CHAR(36)     NOT NULL,
  fiscal_year_id     CHAR(36)     NOT NULL,
  period_type_id     INT          NOT NULL,
  subject_party_id   CHAR(36)     NOT NULL,
  hierarchy_level_id INT          NOT NULL,
  allocated_label    VARCHAR(255) NOT NULL,
  status_id          INT          NOT NULL DEFAULT 1,
  approval_status_id INT          NOT NULL DEFAULT 1,
  is_locked          TINYINT(1)   NOT NULL DEFAULT 0,
  created_at         TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  created_by         CHAR(36)     NULL,
  updated_at         TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by         CHAR(36)     NULL,
  kpi_allocation_workflow_status ENUM('draft','submitted','approved','locked') NULL DEFAULT 'draft',
  PRIMARY KEY (allocation_id),
  UNIQUE KEY uk_kalloc_natural (workspace_id, template_id, fiscal_year_id, subject_party_id, hierarchy_level_id),
  KEY idx_kalloc_tmpl_fy (template_id, fiscal_year_id),
  CONSTRAINT fk_kalloc_cu     FOREIGN KEY (control_unit_id)    REFERENCES control_unit(control_unit_id),
  CONSTRAINT fk_kalloc_tmpl   FOREIGN KEY (template_id)        REFERENCES kpi_template(template_id),
  CONSTRAINT fk_kalloc_fy     FOREIGN KEY (fiscal_year_id)     REFERENCES fiscal_year(fiscal_year_id),
  CONSTRAINT fk_kalloc_pt     FOREIGN KEY (period_type_id)     REFERENCES period_type(period_type_id),
  CONSTRAINT fk_kalloc_subj   FOREIGN KEY (subject_party_id)   REFERENCES kpi_subject_party(subject_party_id),
  CONSTRAINT fk_kalloc_hlvl   FOREIGN KEY (hierarchy_level_id) REFERENCES kpi_hierarchy_level_master(id),
  CONSTRAINT fk_kalloc_status FOREIGN KEY (status_id)          REFERENCES kpi_allocation_status_master(id),
  CONSTRAINT fk_kalloc_appr   FOREIGN KEY (approval_status_id) REFERENCES kpi_approval_status_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Target Detail (annual + H1/H2 + quarterly splits per allocation × KPI)
-- Richer complement to KPI_targets: stores period splits and weight.
CREATE TABLE IF NOT EXISTS kpi_target_detail (
  target_detail_id  CHAR(36)      NOT NULL,
  account_id        CHAR(36)      NOT NULL,
  workspace_id      CHAR(36)      NOT NULL,
  allocation_id     CHAR(36)      NOT NULL,
  kpi_id            INT           NOT NULL,
  kpi_code_snapshot VARCHAR(64)   NOT NULL,
  kpi_name_snapshot VARCHAR(255)  NOT NULL,
  unit_type_id      INT           NOT NULL,
  weight_pct        DECIMAL(9,4)  NOT NULL,
  annual_target     DECIMAL(24,8) NOT NULL,
  h1_target         DECIMAL(24,8) NOT NULL DEFAULT 0,
  h2_target         DECIMAL(24,8) NOT NULL DEFAULT 0,
  q1_target         DECIMAL(24,8) NOT NULL DEFAULT 0,
  q2_target         DECIMAL(24,8) NOT NULL DEFAULT 0,
  q3_target         DECIMAL(24,8) NOT NULL DEFAULT 0,
  q4_target         DECIMAL(24,8) NOT NULL DEFAULT 0,
  created_at        TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  created_by        CHAR(36)      NULL,
  updated_at        TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by        CHAR(36)      NULL,
  PRIMARY KEY (target_detail_id),
  UNIQUE KEY uk_ktd_alloc_kpi (allocation_id, kpi_id),
  KEY idx_ktd_alloc (allocation_id),
  CONSTRAINT fk_ktd_alloc FOREIGN KEY (allocation_id) REFERENCES kpi_allocation(allocation_id) ON DELETE CASCADE,
  CONSTRAINT fk_ktd_kpi   FOREIGN KEY (kpi_id)        REFERENCES KPI_master(kpi_id),
  CONSTRAINT fk_ktd_ut    FOREIGN KEY (unit_type_id)  REFERENCES kpi_unit_type_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Target Distribution (daily / weekly / monthly sub-period splits)
CREATE TABLE IF NOT EXISTS kpi_target_distribution (
  distribution_id      CHAR(36)      NOT NULL,
  target_detail_id     CHAR(36)      NOT NULL,
  distribution_type_id INT           NOT NULL,
  period_sequence      SMALLINT      NOT NULL,
  period_label         VARCHAR(32)   NULL,
  amount               DECIMAL(24,8) NOT NULL,
  created_at           TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  created_by           CHAR(36)      NULL,
  updated_at           TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by           CHAR(36)      NULL,
  PRIMARY KEY (distribution_id),
  UNIQUE KEY uk_ktdist_seq (target_detail_id, distribution_type_id, period_sequence),
  CONSTRAINT fk_ktdist_tgt   FOREIGN KEY (target_detail_id)     REFERENCES kpi_target_detail(target_detail_id) ON DELETE CASCADE,
  CONSTRAINT fk_ktdist_dtype FOREIGN KEY (distribution_type_id) REFERENCES kpi_distribution_type_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Actual (enriched actual entries with attainment and RAG tracking)
-- Workflow state: kpi_actual_workflow_status ENUM
CREATE TABLE IF NOT EXISTS kpi_actual (
  actual_id          CHAR(36)      NOT NULL,
  account_id         CHAR(36)      NOT NULL,
  workspace_id       CHAR(36)      NOT NULL,
  allocation_id      CHAR(36)      NOT NULL,
  kpi_id             INT           NOT NULL,
  subject_party_id   CHAR(36)      NOT NULL,
  employee_ref       VARCHAR(64)   NULL,
  employee_name      VARCHAR(255)  NULL,
  period_type_id     INT           NOT NULL,
  period_label       VARCHAR(64)   NOT NULL,
  fiscal_year_id     CHAR(36)      NOT NULL,
  date_start         INT           NULL COMMENT 'FK → time_dimension.date_id',
  date_end           INT           NULL COMMENT 'FK → time_dimension.date_id',
  target_value       DECIMAL(24,8) NOT NULL,
  actual_value       DECIMAL(24,8) NOT NULL,
  attainment_pct     DECIMAL(9,4)  NOT NULL,
  prior_period_pct   DECIMAL(9,4)  NOT NULL DEFAULT 0,
  rag_id             INT           NOT NULL,
  trend_json         JSON          NULL,
  data_source        VARCHAR(64)   NULL DEFAULT 'manual',
  entry_status_id    INT           NOT NULL,
  approval_status_id INT           NOT NULL,
  created_at         TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  created_by         CHAR(36)      NULL,
  updated_at         TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by         CHAR(36)      NULL,
  kpi_actual_workflow_status ENUM('draft','submitted','approved','rejected') NULL DEFAULT 'draft',
  PRIMARY KEY (actual_id),
  KEY idx_kact_alloc_kpi (allocation_id, kpi_id),
  KEY idx_kact_period    (fiscal_year_id, period_label),
  CONSTRAINT fk_kact_alloc    FOREIGN KEY (allocation_id)      REFERENCES kpi_allocation(allocation_id) ON DELETE CASCADE,
  CONSTRAINT fk_kact_kpi      FOREIGN KEY (kpi_id)             REFERENCES KPI_master(kpi_id),
  CONSTRAINT fk_kact_subj     FOREIGN KEY (subject_party_id)   REFERENCES kpi_subject_party(subject_party_id),
  CONSTRAINT fk_kact_fy       FOREIGN KEY (fiscal_year_id)     REFERENCES fiscal_year(fiscal_year_id),
  CONSTRAINT fk_kact_rag      FOREIGN KEY (rag_id)             REFERENCES kpi_rag_master(id),
  CONSTRAINT fk_kact_entry_st FOREIGN KEY (entry_status_id)    REFERENCES kpi_actual_entry_status_master(id),
  CONSTRAINT fk_kact_appr     FOREIGN KEY (approval_status_id) REFERENCES kpi_approval_status_master(id),
  CONSTRAINT fk_kact_ds       FOREIGN KEY (date_start)         REFERENCES time_dimension(date_id),
  CONSTRAINT fk_kact_de       FOREIGN KEY (date_end)           REFERENCES time_dimension(date_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Performance Snapshot (materialised target vs actual; powers reporting / charts)
CREATE TABLE IF NOT EXISTS kpi_performance (
  performance_id CHAR(36)      NOT NULL,
  account_id     CHAR(36)      NOT NULL,
  workspace_id   CHAR(36)      NOT NULL,
  allocation_id  CHAR(36)      NOT NULL,
  kpi_id         INT           NOT NULL,
  fiscal_year_id CHAR(36)      NOT NULL,
  period_type_id INT           NOT NULL,
  period_index   SMALLINT      NOT NULL,
  period_label   VARCHAR(64)   NOT NULL,
  target_value   DECIMAL(24,8) NOT NULL,
  actual_value   DECIMAL(24,8) NOT NULL,
  variance_value DECIMAL(24,8) NOT NULL,
  attainment_pct DECIMAL(9,4)  NOT NULL,
  weighted_score DECIMAL(24,8) NULL,
  rag_id         INT           NOT NULL,
  calc_run_at    TIMESTAMP     NOT NULL,
  created_at     TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (performance_id),
  UNIQUE KEY uk_kperf_grain (allocation_id, kpi_id, fiscal_year_id, period_type_id, period_index),
  KEY idx_kperf_ws_fy (workspace_id, fiscal_year_id),
  CONSTRAINT fk_kperf_alloc FOREIGN KEY (allocation_id)  REFERENCES kpi_allocation(allocation_id) ON DELETE CASCADE,
  CONSTRAINT fk_kperf_kpi   FOREIGN KEY (kpi_id)         REFERENCES KPI_master(kpi_id),
  CONSTRAINT fk_kperf_fy    FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_year(fiscal_year_id),
  CONSTRAINT fk_kperf_pt    FOREIGN KEY (period_type_id) REFERENCES period_type(period_type_id),
  CONSTRAINT fk_kperf_rag   FOREIGN KEY (rag_id)         REFERENCES kpi_rag_master(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Period Instance (open/close state per template × fiscal year × period)
CREATE TABLE IF NOT EXISTS kpi_period_instance (
  instance_id    CHAR(36)    NOT NULL,
  account_id     CHAR(36)    NOT NULL,
  workspace_id   CHAR(36)    NOT NULL,
  template_id    CHAR(36)    NOT NULL,
  fiscal_year_id CHAR(36)    NOT NULL,
  period_type_id INT         NOT NULL,
  period_index   SMALLINT    NOT NULL,
  period_label   VARCHAR(64) NOT NULL,
  state_enum     ENUM('open','closed') NOT NULL DEFAULT 'open',
  closed_at      TIMESTAMP   NULL,
  closed_by      CHAR(36)    NULL,
  created_at     TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP,
  created_by     CHAR(36)    NULL,
  updated_at     TIMESTAMP   NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by     CHAR(36)    NULL,
  PRIMARY KEY (instance_id),
  UNIQUE KEY uk_kpi_period_grain (workspace_id, template_id, fiscal_year_id, period_type_id, period_index),
  CONSTRAINT fk_kpip_tmpl FOREIGN KEY (template_id)    REFERENCES kpi_template(template_id),
  CONSTRAINT fk_kpip_fy   FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_year(fiscal_year_id),
  CONSTRAINT fk_kpip_pt   FOREIGN KEY (period_type_id) REFERENCES period_type(period_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Carry Forward Ledger (backlog in/out between periods)
CREATE TABLE IF NOT EXISTS kpi_carry_forward_ledger (
  ledger_id            CHAR(36)      NOT NULL,
  account_id           CHAR(36)      NOT NULL,
  workspace_id         CHAR(36)      NOT NULL,
  allocation_id        CHAR(36)      NOT NULL,
  kpi_id               INT           NOT NULL,
  from_period_key      VARCHAR(64)   NOT NULL,
  to_period_key        VARCHAR(64)   NOT NULL,
  backlog_in           DECIMAL(24,8) NOT NULL,
  backlog_out          DECIMAL(24,8) NOT NULL,
  next_adjusted_target DECIMAL(24,8) NULL,
  created_at           TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  created_by           CHAR(36)      NULL,
  PRIMARY KEY (ledger_id),
  KEY idx_cf_alloc (allocation_id),
  CONSTRAINT fk_cf_alloc FOREIGN KEY (allocation_id) REFERENCES kpi_allocation(allocation_id) ON DELETE CASCADE,
  CONSTRAINT fk_cf_kpi   FOREIGN KEY (kpi_id)        REFERENCES KPI_master(kpi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Comments & Notes (polymorphic: covers both old and new KPI tables)
CREATE TABLE IF NOT EXISTS kpi_comment (
  comment_id   CHAR(36)   NOT NULL,
  account_id   CHAR(36)   NOT NULL,
  workspace_id CHAR(36)   NOT NULL,
  entity_type  ENUM('KPI_master','KPI_year_plans','KPI_targets',
                    'kpi_allocation','kpi_target_detail',
                    'kpi_actual','kpi_performance') NOT NULL,
  entity_id    CHAR(36)   NOT NULL,
  body         TEXT       NOT NULL,
  is_internal  TINYINT(1) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP  NULL DEFAULT CURRENT_TIMESTAMP,
  created_by   CHAR(36)   NULL,
  updated_at   TIMESTAMP  NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by   CHAR(36)   NULL,
  PRIMARY KEY (comment_id),
  KEY idx_kcomm_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Allocation Event Log (history of target-set / lock / distribute actions)
CREATE TABLE IF NOT EXISTS kpi_allocation_event (
  event_id      CHAR(36)  NOT NULL,
  allocation_id CHAR(36)  NOT NULL,
  event_time    TIMESTAMP NOT NULL,
  changed_by    CHAR(36)  NULL,
  action_code   ENUM('target-set','distributed','locked','template-changed') NOT NULL,
  detail_text   TEXT      NOT NULL,
  PRIMARY KEY (event_id),
  KEY idx_kae_alloc (allocation_id),
  CONSTRAINT fk_kae_alloc FOREIGN KEY (allocation_id) REFERENCES kpi_allocation(allocation_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Audit Log (row-level change history for all KPI entities)
CREATE TABLE IF NOT EXISTS kpi_audit_log (
  log_id       CHAR(36)    NOT NULL,
  account_id   CHAR(36)    NOT NULL,
  workspace_id CHAR(36)    NOT NULL,
  entity_type  VARCHAR(64) NOT NULL,
  entity_id    CHAR(36)    NOT NULL,
  action       ENUM('insert','update','delete') NOT NULL,
  changed_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by   CHAR(36)    NULL,
  old_json     JSON        NULL,
  new_json     JSON        NULL,
  PRIMARY KEY (log_id),
  KEY idx_kal_entity  (entity_type, entity_id),
  KEY idx_kal_ws_time (workspace_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- KPI Master Version History (snapshot per version change)
CREATE TABLE IF NOT EXISTS kpi_master_history (
  history_id     CHAR(36)  NOT NULL,
  kpi_id         INT       NOT NULL,
  version_no     INT       NOT NULL,
  snapshot_json  JSON      NOT NULL,
  effective_from TIMESTAMP NOT NULL,
  effective_to   TIMESTAMP NULL,
  changed_by     CHAR(36)  NULL,
  PRIMARY KEY (history_id),
  KEY idx_kmh_kpi (kpi_id),
  CONSTRAINT fk_kmh_kpi FOREIGN KEY (kpi_id) REFERENCES KPI_master(kpi_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Saved Filter Presets (ActualsVsTarget "Save Filter" screen)
CREATE TABLE IF NOT EXISTS kpi_user_filter_preset (
  preset_id    CHAR(36)     NOT NULL,
  account_id   CHAR(36)     NOT NULL,
  workspace_id CHAR(36)     NOT NULL,
  user_id      CHAR(36)     NOT NULL,
  name         VARCHAR(128) NOT NULL,
  filter_json  JSON         NOT NULL,
  created_at   TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (preset_id),
  UNIQUE KEY uk_ufp_user_name (workspace_id, user_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- SECTION 5 : SEED DATA
-- Platform tables (period_type, target_status_master, plan_status_master) are
-- already seeded in dev; included here for greenfield deploys.
-- =============================================================================

INSERT IGNORE INTO period_type (period_type_id, period_type_name) VALUES
  (1,'Daily'),(2,'Weekly'),(3,'Monthly'),(4,'Quarterly'),(5,'Annual');

INSERT IGNORE INTO target_status_master (target_status_id, target_status_name) VALUES
  (1,'Draft'),(2,'Approved'),(3,'Locked');

INSERT IGNORE INTO plan_status_master (plan_status_id, plan_status_name) VALUES
  (1,'Draft'),(2,'Submitted'),(3,'Approved'),(4,'Locked');

INSERT IGNORE INTO kpi_aggregation_type_master (id, code, label) VALUES
  (1,'sum','SUM'),(2,'avg','AVG'),(3,'min','MIN'),(4,'max','MAX'),
  (5,'weighted_avg','Weighted average'),(6,'last','Last value');

INSERT IGNORE INTO kpi_calculation_type_master (id, code, label) VALUES
  (1,'auto','Auto / System'),(2,'manual','Manual'),(3,'formula','Formula'),
  (4,'cumulative_ytd','Cumulative YTD'),(5,'rolling_avg','Rolling average'),
  (6,'weighted_avg','Weighted average'),(7,'stored_procedure','Stored procedure'),
  (8,'percentage','Percentage');

INSERT IGNORE INTO kpi_distribution_type_master (id, code, label) VALUES
  (1,'daily','Daily'),(2,'weekly','Weekly'),(3,'monthly','Monthly'),
  (4,'annual_quarterly','Annual / Quarterly split');

INSERT IGNORE INTO kpi_rag_master (id, code, label) VALUES
  (1,'green','Green'),(2,'amber','Amber'),(3,'red','Red');

INSERT IGNORE INTO kpi_unit_type_master (id, code, label) VALUES
  (1,'percentage','Percentage'),(2,'number','Number'),(3,'currency','Currency'),
  (4,'days','Days'),(5,'hours','Hours'),(6,'teu','TEU'),(7,'cbm','CBM'),
  (8,'tonnes','Tonnes'),(9,'score','Score'),(10,'ratio','Ratio');

INSERT IGNORE INTO kpi_trend_direction_master (id, code, label) VALUES
  (1,'higher_better','Higher is better'),(2,'lower_better','Lower is better'),
  (3,'target_range','Target range');

INSERT IGNORE INTO kpi_shipment_mode_master (id, code, label) VALUES
  (1,'sea','Sea'),(2,'air','Air'),(3,'road','Road'),(4,'rail','Rail'),
  (5,'multimodal','Multimodal'),(6,'courier','Courier');

INSERT IGNORE INTO kpi_trade_direction_master (id, code, label) VALUES
  (1,'import','Import'),(2,'export','Export'),(3,'cross_trade','Cross trade'),
  (4,'import_clearance','Import clearance'),(5,'export_clearance','Export clearance');

INSERT IGNORE INTO kpi_business_scope_master (id, code, label) VALUES
  (1,'freight','Freight'),(2,'corporate','Corporate');

INSERT IGNORE INTO kpi_hierarchy_level_master (id, code, label, level_rank) VALUES
  (1,'leadership','Leadership',10),(2,'branch_head','Branch head',20),
  (3,'sales_manager','Sales manager',30),(4,'sales_lead','Sales lead',40),
  (5,'sales_executive','Sales executive',50);

INSERT IGNORE INTO kpi_approval_status_master (id, code, label) VALUES
  (1,'none','None'),(2,'pending','Pending'),
  (3,'approved','Approved'),(4,'rejected','Rejected');

INSERT IGNORE INTO kpi_allocation_status_master (id, code, label) VALUES
  (1,'draft','Draft'),(2,'confirmed','Confirmed'),(3,'locked','Locked');

INSERT IGNORE INTO kpi_subject_type_master (id, code, label) VALUES
  (1,'individual','Individual'),(2,'team','Team');

INSERT IGNORE INTO kpi_actual_entry_status_master (id, code, label) VALUES
  (1,'draft','Draft'),(2,'submitted','Submitted'),
  (3,'approved','Approved'),(4,'rejected','Rejected');

-- =============================================================================
-- END OF FILE
-- =============================================================================
