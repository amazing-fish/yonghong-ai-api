SELECT
    CAST(event_time AS DATE) AS event_date,
    event_id,
    os_name,
    sdk_pure_version,
    COUNT(*) AS total_count,
    SUM(CASE WHEN result = 'success' THEN 1 ELSE 0 END) AS success_count,
    SUM(CASE WHEN result <> 'success' THEN 1 ELSE 0 END) AS failure_count,
    SUM(CASE WHEN result <> 'success' THEN 1 ELSE 0 END) * 1.0
        / NULLIF(COUNT(*), 0) AS failure_rate,
    AVG(total_time) AS avg_total_time
FROM analytics.event_log
WHERE event_time >= :start_time
  AND event_time < :end_time
  AND event_id = :event_id
GROUP BY CAST(event_time AS DATE), event_id, os_name, sdk_pure_version;
