SELECT
    event_id,
    os_name,
    sdk_pure_version,
    failure_reason,
    COUNT(*) AS failure_count
FROM analytics.event_log
WHERE event_time >= :start_time
  AND event_time < :end_time
  AND event_id = :event_id
  AND result <> 'success'
GROUP BY event_id, os_name, sdk_pure_version, failure_reason
ORDER BY failure_count DESC;
