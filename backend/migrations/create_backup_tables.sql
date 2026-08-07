-- Database backup logs + settings (local dumps + optional R2 upload metadata)

CREATE TABLE IF NOT EXISTS backup_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    type character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    filename character varying(512),
    size_bytes bigint,
    triggered_by character varying(64),
    r2_uploaded boolean DEFAULT false NOT NULL,
    r2_key character varying(1024),
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_backup_logs_created_at
    ON backup_logs USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_backup_logs_type_status
    ON backup_logs USING btree (type, status);

CREATE TABLE IF NOT EXISTS backup_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    daily_enabled boolean DEFAULT true NOT NULL,
    weekly_enabled boolean DEFAULT true NOT NULL,
    monthly_enabled boolean DEFAULT true NOT NULL,
    max_daily integer DEFAULT 30 NOT NULL,
    max_weekly integer DEFAULT 12 NOT NULL,
    max_monthly integer DEFAULT 12 NOT NULL,
    r2_enabled boolean DEFAULT false NOT NULL,
    r2_auto_upload boolean DEFAULT false NOT NULL,
    delete_local_after_r2 boolean DEFAULT false NOT NULL
);
