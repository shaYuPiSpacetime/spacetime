-- 清理商业化配置日志中递归嵌入的 latestLogs。
-- 历史实现把最近日志连同大快照再次写入新快照，导致数据量指数增长并拖慢配置首页。

UPDATE `app_commercial_config_log`
SET
    `before_snapshot` = CASE
        WHEN JSON_VALID(`before_snapshot`) = 1
            THEN JSON_REMOVE(`before_snapshot`, '$.latestLogs')
        ELSE `before_snapshot`
    END,
    `after_snapshot` = CASE
        WHEN JSON_VALID(`after_snapshot`) = 1
            THEN JSON_REMOVE(`after_snapshot`, '$.latestLogs')
        ELSE `after_snapshot`
    END
WHERE `deleted` = 0
  AND (
      CASE
          WHEN JSON_VALID(`before_snapshot`) = 1
              THEN JSON_CONTAINS_PATH(`before_snapshot`, 'one', '$.latestLogs')
          ELSE 0
      END = 1
      OR CASE
          WHEN JSON_VALID(`after_snapshot`) = 1
              THEN JSON_CONTAINS_PATH(`after_snapshot`, 'one', '$.latestLogs')
          ELSE 0
      END = 1
  );
