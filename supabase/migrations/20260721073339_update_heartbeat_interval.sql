-- Update heartbeat interval to 30s to prevent rate limiting issues while maintaining billing sync

update public.consultation_settings
set heartbeat_interval_seconds = 30
where id = true;
