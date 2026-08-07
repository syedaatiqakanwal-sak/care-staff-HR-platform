-- Monthly database backup settings (1st of month 04:00 Europe/London)

ALTER TABLE backup_settings
    ADD COLUMN IF NOT EXISTS monthly_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE backup_settings
    ADD COLUMN IF NOT EXISTS max_monthly integer NOT NULL DEFAULT 12;
