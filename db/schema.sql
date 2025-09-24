-- Core schema for Infostream MVP
CREATE TABLE IF NOT EXISTS dim_stock (
  ts_code TEXT PRIMARY KEY,
  name TEXT,
  industry TEXT,
  list_date DATE,
  exchange TEXT
);

CREATE TABLE IF NOT EXISTS prices_ohlcv (
  id BIGSERIAL PRIMARY KEY,
  ts_code TEXT NOT NULL,
  trade_date DATE NOT NULL,
  open NUMERIC,
  high NUMERIC,
  low NUMERIC,
  close NUMERIC,
  pre_close NUMERIC,
  change NUMERIC,
  pct_chg NUMERIC,
  vol NUMERIC,
  amount NUMERIC,
  freq TEXT DEFAULT 'D',
  UNIQUE (ts_code, trade_date, freq)
);
CREATE INDEX IF NOT EXISTS idx_prices_ts_date ON prices_ohlcv (ts_code, trade_date);

CREATE TABLE IF NOT EXISTS fin_report_meta (
  id BIGSERIAL PRIMARY KEY,
  ts_code TEXT NOT NULL,
  report_period DATE NOT NULL,
  report_type TEXT,
  source TEXT,
  file_url TEXT,
  file_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_meta_code_period ON fin_report_meta (ts_code, report_period);

CREATE TABLE IF NOT EXISTS fin_metrics (
  id BIGSERIAL PRIMARY KEY,
  ts_code TEXT NOT NULL,
  report_period DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  unit TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (ts_code, report_period, metric_name)
);
CREATE INDEX IF NOT EXISTS idx_fin_metrics_code_period ON fin_metrics (ts_code, report_period);

CREATE TABLE IF NOT EXISTS tech_indicators (
  id BIGSERIAL PRIMARY KEY,
  ts_code TEXT NOT NULL,
  trade_date DATE NOT NULL,
  freq TEXT DEFAULT 'D',
  ma5 NUMERIC, ma10 NUMERIC, ma20 NUMERIC,
  macd NUMERIC, macd_signal NUMERIC, macd_hist NUMERIC,
  rsi6 NUMERIC, rsi14 NUMERIC,
  boll_upper NUMERIC, boll_mid NUMERIC, boll_lower NUMERIC,
  UNIQUE (ts_code, trade_date, freq)
);
CREATE INDEX IF NOT EXISTS idx_tech_ts_date ON tech_indicators (ts_code, trade_date);

CREATE TABLE IF NOT EXISTS valuations (
  id BIGSERIAL PRIMARY KEY,
  ts_code TEXT NOT NULL,
  as_of_date DATE NOT NULL,
  method TEXT NOT NULL,
  input_json JSONB,
  result_json JSONB,
  pe_implied_price NUMERIC,
  pb_implied_price NUMERIC,
  dcf_base NUMERIC,
  dcf_range_low NUMERIC,
  dcf_range_high NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_valuations_ts_date ON valuations (ts_code, as_of_date);

CREATE TABLE IF NOT EXISTS dcf_valuations (
  id BIGSERIAL PRIMARY KEY,
  ts_code TEXT NOT NULL,
  as_of_date DATE NOT NULL,
  current_price NUMERIC,
  dcf_value NUMERIC,
  upside_downside NUMERIC,
  pe_ratio NUMERIC,
  pb_ratio NUMERIC,
  discount_rate NUMERIC,
  terminal_growth_rate NUMERIC,
  projection_years INTEGER,
  growth_rates JSONB,
  projections JSONB,
  terminal_value NUMERIC,
  pv_terminal_value NUMERIC,
  enterprise_value NUMERIC,
  sensitivity_analysis JSONB,
  input_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (ts_code, as_of_date)
);
CREATE INDEX IF NOT EXISTS idx_dcf_ts_date ON dcf_valuations (ts_code, as_of_date);

CREATE TABLE IF NOT EXISTS ai_scores (
  id BIGSERIAL PRIMARY KEY,
  ts_code TEXT NOT NULL,
  as_of_date DATE NOT NULL,
  score NUMERIC,
  action TEXT,
  top_factors_json JSONB,
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (ts_code, as_of_date)
);

CREATE TABLE IF NOT EXISTS etl_jobs (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  message TEXT
);

CREATE TABLE IF NOT EXISTS data_quality_checks (
  id BIGSERIAL PRIMARY KEY,
  check_name TEXT NOT NULL,
  ts_code TEXT,
  report_period DATE,
  status TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
