-- Authorized read-only diagnosis; no profile content or other account identifiers.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET TRANSACTION READ ONLY;
START TRANSACTION;
SET @target_user=(SELECT id FROM app_user WHERE id=1052 AND deleted=0);
SELECT 'account' AS section, COUNT(*) AS matches FROM app_user WHERE id=@target_user;
SELECT 'asset' AS section, coin_balance,vip_status,vip_expire_time,update_time
FROM app_user_asset WHERE user_id=@target_user AND deleted=0;
SELECT 'unlock_prices' AS section,scene_code,unit_price,status FROM app_coin_scene_config
WHERE scene_code IN ('likes_unlock_one','viewers_unlock_one') AND deleted=0;
SELECT 'popup' AS section,p.popup_status,p.create_time,p.delivered_time,p.read_time,p.read_action,
 TIMESTAMPDIFF(SECOND,p.create_time,p.delivered_time) AS delivered_delay_seconds,
 m.match_status,m.create_time AS match_created
FROM app_relation_match_popup p JOIN app_relation_match m ON m.id=p.match_id
WHERE p.user_id=@target_user AND p.deleted=0 ORDER BY p.id DESC LIMIT 12;
SELECT 'recent_unlocks' AS section,unlock_scene,status,COUNT(*) AS n,MAX(create_time) AS latest
FROM app_user_unlock_record WHERE user_id=@target_user AND deleted=0 GROUP BY unlock_scene,status;
COMMIT;
