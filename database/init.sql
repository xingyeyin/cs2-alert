-- ============================================================
-- CS2饰品行情预警平台 数据库初始化脚本
-- 适用: MySQL 8.0+ / InnoDB / utf8mb4
-- 导入方式: mysql -u root -p < init.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS cs2_alert
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE cs2_alert;

-- ------------------------------------------------------------
-- 1. items 监控标的管理表（武器箱 / 纪念包）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  code          VARCHAR(32)     NOT NULL                COMMENT '标的代码',
  name          VARCHAR(128)    NOT NULL                COMMENT '标的名称',
  category      TINYINT         NOT NULL DEFAULT 0      COMMENT '类型: 0=武器箱, 1=纪念包',
  icon_url      VARCHAR(512)    DEFAULT NULL            COMMENT '图标地址',
  enabled       TINYINT(1)      NOT NULL DEFAULT 1      COMMENT '是否启用监控: 1=启用, 0=停用',
  current_price DECIMAL(12,2)   DEFAULT NULL            COMMENT '最新价(冗余, 供列表快速展示)',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_code (code),
  KEY idx_category (category),
  KEY idx_enabled (enabled)
) ENGINE=InnoDB COMMENT='监控标的管理表';

-- ------------------------------------------------------------
-- 2. price_history 日K行情表
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_history (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  item_id     BIGINT UNSIGNED NOT NULL                COMMENT '标的ID',
  trade_date  DATE            NOT NULL                COMMENT '交易日',
  open_price  DECIMAL(12,2)   NOT NULL                COMMENT '开盘价',
  high_price  DECIMAL(12,2)   NOT NULL                COMMENT '最高价',
  low_price   DECIMAL(12,2)   NOT NULL                COMMENT '最低价',
  close_price DECIMAL(12,2)   NOT NULL                COMMENT '收盘价',
  avg_price   DECIMAL(12,2)   NOT NULL                COMMENT '当日成交均价',
  volume      INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '成交量',
  amount      DECIMAL(16,2)   NOT NULL DEFAULT 0      COMMENT '成交额',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_item_date (item_id, trade_date),
  KEY idx_item_date_desc (item_id, trade_date DESC),
  CONSTRAINT fk_history_item FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='日K行情表(含当日成交均价)';

-- ------------------------------------------------------------
-- 3. alert_rules 预警规则表（用户自定义阈值, 持久化保存）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_rules (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  item_id          BIGINT UNSIGNED NOT NULL                COMMENT '标的ID',
  rule_name        VARCHAR(128)    DEFAULT NULL            COMMENT '规则备注名',
  base_type        TINYINT         NOT NULL DEFAULT 1      COMMENT '基准类型: 1=近7日均价, 2=自定义基准价',
  base_price       DECIMAL(12,2)   DEFAULT NULL            COMMENT '自定义基准价',
  up_threshold     DECIMAL(8,2)    NOT NULL DEFAULT 5.00   COMMENT '涨幅阈值(%): 默认+5%',
  down_threshold   DECIMAL(8,2)    NOT NULL DEFAULT 5.00   COMMENT '跌幅阈值(%): 默认-5%',
  notify_enabled   TINYINT(1)      NOT NULL DEFAULT 1      COMMENT '是否启用提醒: 1=是, 0=否',
  last_triggered_at DATETIME       DEFAULT NULL            COMMENT '上次触发时间(冷却用)',
  trigger_count    INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '累计触发次数',
  created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_item (item_id),
  KEY idx_notify (notify_enabled),
  CONSTRAINT fk_rule_item FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='价格预警规则表';

-- ------------------------------------------------------------
-- 4. alert_records 预警触发记录表（前端弹窗数据源）
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_records (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  rule_id        BIGINT UNSIGNED NOT NULL                COMMENT '规则ID',
  item_id        BIGINT UNSIGNED NOT NULL                COMMENT '标的ID',
  trigger_type   TINYINT         NOT NULL                COMMENT '触发方向: 1=涨, 2=跌',
  trigger_price  DECIMAL(12,2)   NOT NULL                COMMENT '触发时价格',
  base_price     DECIMAL(12,2)   NOT NULL                COMMENT '触发时基准价',
  change_rate    DECIMAL(10,4)   NOT NULL                COMMENT '涨跌幅(%)',
  threshold_value DECIMAL(8,2)   NOT NULL                COMMENT '命中的阈值(%)',
  is_read        TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '是否已读: 0=未读(待弹窗), 1=已读',
  triggered_at   DATETIME        NOT NULL                COMMENT '触发时间',
  PRIMARY KEY (id),
  KEY idx_item_time (item_id, triggered_at),
  KEY idx_read (is_read),
  KEY idx_rule (rule_id),
  CONSTRAINT fk_record_rule FOREIGN KEY (rule_id) REFERENCES alert_rules (id) ON DELETE CASCADE,
  CONSTRAINT fk_record_item FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='预警触发记录表';

-- ============================================================
-- 示例数据（便于本地联调演示, 生产环境可删除）
-- ============================================================

INSERT INTO items (code, name, category, icon_url, enabled, current_price) VALUES
  ('case-recoil', '反冲武器箱', 0, NULL, 1, 12.50),
  ('souvenir-vertigo', '殒命大厦纪念包', 1, NULL, 1, 88.00);

-- 示例行情: 近 11 个交易日（仅演示, 实际数据由行情采集写入）
INSERT INTO price_history (item_id, trade_date, open_price, high_price, low_price, close_price, avg_price, volume, amount) VALUES
  (1, '2026-07-28', 10.20, 10.60, 10.00, 10.45, 10.38, 120, 1245.60),
  (1, '2026-07-29', 10.45, 10.80, 10.30, 10.72, 10.61, 135, 1432.35),
  (1, '2026-07-30', 10.72, 11.20, 10.60, 11.05, 10.94, 150, 1641.00),
  (1, '2026-07-31', 11.05, 11.30, 10.90, 11.18, 11.10, 142, 1576.20),
  (1, '2026-08-03', 11.18, 11.50, 11.00, 11.32, 11.25, 160, 1800.00),
  (1, '2026-08-04', 11.32, 11.60, 11.20, 11.48, 11.40, 155, 1767.00),
  (1, '2026-08-05', 11.48, 11.90, 11.40, 11.85, 11.72, 170, 1992.40),
  (1, '2026-08-06', 11.85, 12.10, 11.70, 12.02, 11.95, 165, 1971.75),
  (1, '2026-08-07', 12.02, 12.35, 11.90, 12.20, 12.15, 180, 2187.00),
  (1, '2026-08-10', 12.20, 12.60, 12.10, 12.45, 12.38, 190, 2352.20),
  (1, '2026-08-11', 12.45, 12.80, 12.30, 12.50, 12.52, 200, 2504.00),
  (2, '2026-07-28', 80.00, 82.00, 79.00, 81.50, 80.90, 30, 2427.00),
  (2, '2026-07-29', 81.50, 83.50, 80.50, 83.00, 82.40, 32, 2636.80),
  (2, '2026-07-30', 83.00, 85.00, 82.00, 84.20, 83.70, 35, 2929.50),
  (2, '2026-07-31', 84.20, 86.50, 83.50, 85.80, 85.10, 38, 3233.80),
  (2, '2026-08-03', 85.80, 87.00, 84.80, 86.20, 85.90, 36, 3092.40),
  (2, '2026-08-04', 86.20, 88.00, 85.50, 87.40, 86.80, 40, 3472.00),
  (2, '2026-08-05', 87.40, 89.00, 86.50, 88.60, 87.90, 42, 3691.80),
  (2, '2026-08-06', 88.60, 90.00, 87.50, 89.20, 88.70, 44, 3902.80),
  (2, '2026-08-07', 89.20, 91.00, 88.50, 90.40, 89.80, 45, 4041.00),
  (2, '2026-08-10', 90.40, 92.50, 89.50, 91.80, 91.20, 48, 4377.60),
  (2, '2026-08-11', 91.80, 93.00, 90.00, 88.00, 90.80, 55, 4994.00);

-- 示例预警规则: 反冲武器箱, 默认 ±5%, 以近7日均价为基准
INSERT INTO alert_rules (item_id, rule_name, base_type, up_threshold, down_threshold, notify_enabled) VALUES
  (1, '反冲武器箱默认预警', 1, 5.00, 5.00, 1);
