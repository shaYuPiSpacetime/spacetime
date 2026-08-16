-- =============================================================
-- 推荐与理想型分类回归数据（生产验收账号专用）
-- 目标账号：仅通过手机号 17366629764 定位，不写死用户主键。
-- 数据边界：只新增 REG-RI-* 虚构候选与关联记录，不修改余额和交易流水。
-- 特性：可重复执行；不清理既有业务数据；候选不写手机号或证件信息。
-- 用途：测试/验收环境手工执行，禁止加入自动生产迁移目录。
-- =============================================================

SET NAMES utf8mb4;

SET @target_user_id := (
  SELECT id FROM app_user WHERE phone = '17366629764' AND deleted = 0 LIMIT 1
);

DROP PROCEDURE IF EXISTS assert_recommend_ideal_seed_target;
DELIMITER $$
CREATE PROCEDURE assert_recommend_ideal_seed_target()
BEGIN
  IF @target_user_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '目标验收账号 17366629764 不存在，终止分类回归数据脚本';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'ct_ideal_filter_snapshot'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PRD-08 数据表未迁移，终止分类回归数据脚本';
  END IF;
END$$
DELIMITER ;
CALL assert_recommend_ideal_seed_target();
DROP PROCEDURE assert_recommend_ideal_seed_target;

START TRANSACTION;

SET @profile_hero := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/bbcbb75d67491052/edit-hero-photo.jpg';
SET @profile_avatar := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/261827265aa63898/heart-avatar.webp';
SET @profile_portrait := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/b792aaaa728828e4/heart-person.webp';
SET @profile_alternate := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/4898cbe71d1bfd15/match-photo.webp';
SET @preference_version := COALESCE((
  SELECT version FROM ct_recommend_preference
  WHERE user_id = @target_user_id AND deleted = 0 LIMIT 1
), 0);

-- 新增 12 名候选，资料维度交叉覆盖六大理想型分类。
-- openid 是稳定种子标识；phone/id_card/wechat 等可联系身份均不写入。
INSERT INTO app_user (
  openid,register_source,register_time,last_login_time,account_status,
  first_login_completed,first_login_next_step,nickname,gender,birthday,age,height,weight,
  location_province,location_city,location_district,hometown_province,hometown_city,
  dating_goal,marital_status,emotional_status,meeting_preference,preferred_activities,
  school,major,education_level,tags,identity,industry,occupation,company,annual_income,zodiac,
  create_time,update_time,created_by,updated_by,deleted
)
VALUES
('REG-RI-USER-13','SHOWCASE',NOW()-INTERVAL 95 DAY,NOW()-INTERVAL 2 MINUTE,'NORMAL',1,5,'雨棠','FEMALE','1999-02-18',27,168,51,'110000','110100','110105','320000','320100','TIMING_MATURE','SINGLE','SEARCHING','NATURAL',JSON_ARRAY('COFFEE','EXHIBITION'),'清华大学','建筑学','DOCTOR',JSON_ARRAY('HOME_OWNER','LOVE_TRAVEL','PET_LOVER','OUTDOOR_LOVER','SERIOUS_RELATIONSHIP'),'WORKER','ARCHITECTURE','DESIGNER','城市共创院','FROM_300K_TO_500K','水瓶座',NOW()-INTERVAL 95 DAY,NOW()-INTERVAL 2 MINUTE,NULL,NULL,0),
('REG-RI-USER-14','SHOWCASE',NOW()-INTERVAL 92 DAY,NOW()-INTERVAL 5 MINUTE,'NORMAL',1,5,'清妍','FEMALE','2000-10-12',25,166,49,'110000','110100','110108','110000','110100','SERIOUS_RELATIONSHIP','SINGLE','LOOKING','PLANNED',JSON_ARRAY('FOOD','WALK'),'北京大学','国际经济','MASTER',JSON_ARRAY('OVERSEAS_RETURNEE','CAR_OWNER','FOODIE','RUNNING','FAMILY_ORIENTED'),'WORKER','FINANCE','FINANCE','远景咨询','FROM_300K_TO_500K','天秤座',NOW()-INTERVAL 92 DAY,NOW()-INTERVAL 5 MINUTE,NULL,NULL,0),
('REG-RI-USER-15','SHOWCASE',NOW()-INTERVAL 89 DAY,NOW()-INTERVAL 8 MINUTE,'NORMAL',1,5,'念安','FEMALE','2001-05-21',25,165,50,'110000','110100','110106','370000','370100','TIMING_MATURE','SINGLE','SEARCHING','SLOW_PACED',JSON_ARRAY('SPORTS','TRAVEL'),'北京体育大学','运动人体科学','MASTER',JSON_ARRAY('ONLY_CHILD','CYCLING','FITNESS','PET_LOVER','OUTDOOR_LOVER'),'WORKER','HEALTHCARE','OTHER','运动实验室','FROM_150K_TO_300K','双子座',NOW()-INTERVAL 89 DAY,NOW()-INTERVAL 8 MINUTE,NULL,NULL,0),
('REG-RI-USER-16','SHOWCASE',NOW()-INTERVAL 86 DAY,NOW()-INTERVAL 12 MINUTE,'NORMAL',1,5,'知微','FEMALE','1998-11-06',27,170,54,'110000','110100','110101','110000','110100','ONE_TO_TWO_YEARS','SINGLE','SEARCHING','PLANNED',JSON_ARRAY('EXHIBITION','WALK'),'中国人民大学','社会学','DOCTOR',JSON_ARRAY('PUBLIC_SECTOR_FAMILY','LOVE_TRAVEL','READING','MARRIAGE_ORIENTED'),'WORKER','EDUCATION_RESEARCH','TEACHER','公共研究中心','FROM_300K_TO_500K','天蝎座',NOW()-INTERVAL 86 DAY,NOW()-INTERVAL 12 MINUTE,NULL,NULL,0),
('REG-RI-USER-17','SHOWCASE',NOW()-INTERVAL 83 DAY,NOW()-INTERVAL 18 MINUTE,'NORMAL',1,5,'映竹','FEMALE','2002-03-27',24,164,48,'110000','110100','110102','510000','510100','TIMING_MATURE','SINGLE','SEARCHING','SPONTANEOUS',JSON_ARRAY('SPORTS','FOOD'),'北京邮电大学','计算机科学','MASTER',JSON_ARRAY('OVERSEAS_RETURNEE','HOME_OWNER','RUNNING','FOODIE','OUTDOOR_LOVER'),'WORKER','IT_INTERNET','PRODUCT_MANAGER','澄明科技','FROM_300K_TO_500K','白羊座',NOW()-INTERVAL 83 DAY,NOW()-INTERVAL 18 MINUTE,NULL,NULL,0),
('REG-RI-USER-18','SHOWCASE',NOW()-INTERVAL 80 DAY,NOW()-INTERVAL 25 MINUTE,'NORMAL',1,5,'诗遥','FEMALE','2000-07-09',26,163,47,'110000','110100','110114','110000','110100','ONE_TO_TWO_YEARS','SINGLE','LOOKING','NATURAL',JSON_ARRAY('WALK','TRAVEL'),'北京师范大学','心理学','MASTER',JSON_ARRAY('HOME_OWNER','CAR_OWNER','PET_LOVER','TRAVEL_MEMORY','SLOW_RELATIONSHIP'),'WORKER','EDUCATION_RESEARCH','TEACHER','知行教育','FROM_150K_TO_300K','巨蟹座',NOW()-INTERVAL 80 DAY,NOW()-INTERVAL 25 MINUTE,NULL,NULL,0),
('REG-RI-USER-19','SHOWCASE',NOW()-INTERVAL 77 DAY,NOW()-INTERVAL 33 MINUTE,'NORMAL',1,5,'向晚','FEMALE','1999-09-15',26,169,52,'110000','110100','110107','330000','330100','TIMING_MATURE','SINGLE','SEARCHING','SPONTANEOUS',JSON_ARRAY('SPORTS','COFFEE'),'北京航空航天大学','工业设计','DOCTOR',JSON_ARRAY('ONLY_CHILD','CYCLING','FOODIE','OUTDOOR_LOVER','SERIOUS_RELATIONSHIP'),'WORKER','MANUFACTURING','DESIGNER','未来造物','FROM_300K_TO_500K','处女座',NOW()-INTERVAL 77 DAY,NOW()-INTERVAL 33 MINUTE,NULL,NULL,0),
('REG-RI-USER-20','SHOWCASE',NOW()-INTERVAL 74 DAY,NOW()-INTERVAL 42 MINUTE,'NORMAL',1,5,'予晴','FEMALE','2001-12-20',24,167,50,'110000','110100','110105','440000','440100','ONE_TO_TWO_YEARS','SINGLE','SEARCHING','PLANNED',JSON_ARRAY('EXHIBITION','TRAVEL'),'中国传媒大学','数字媒体','MASTER',JSON_ARRAY('OVERSEAS_RETURNEE','PUBLIC_SECTOR_FAMILY','LOVE_TRAVEL','READING','MARRIAGE_ORIENTED'),'WORKER','CULTURE_MEDIA','DESIGNER','光屿文化','FROM_150K_TO_300K','射手座',NOW()-INTERVAL 74 DAY,NOW()-INTERVAL 42 MINUTE,NULL,NULL,0),
('REG-RI-USER-21','SHOWCASE',NOW()-INTERVAL 71 DAY,NOW()-INTERVAL 55 MINUTE,'NORMAL',1,5,'栖月','FEMALE','1998-04-02',28,162,48,'110000','110100','110112','120000','120100','SERIOUS_RELATIONSHIP','SINGLE','LOOKING','SLOW_PACED',JSON_ARRAY('SPORTS','WALK'),'中央财经大学','金融学','MASTER',JSON_ARRAY('HOME_OWNER','PUBLIC_SECTOR_FAMILY','FITNESS','PET_LOVER','FAMILY_ORIENTED'),'WORKER','FINANCE','FINANCE','安澜资产','FROM_300K_TO_500K','白羊座',NOW()-INTERVAL 71 DAY,NOW()-INTERVAL 55 MINUTE,NULL,NULL,0),
('REG-RI-USER-22','SHOWCASE',NOW()-INTERVAL 68 DAY,NOW()-INTERVAL 1 HOUR,'NORMAL',1,5,'星澜','FEMALE','1999-06-11',27,171,55,'110000','110100','110108','110000','110100','ONE_TO_TWO_YEARS','SINGLE','SEARCHING','NATURAL',JSON_ARRAY('FOOD','EXHIBITION'),'北京理工大学','材料科学','DOCTOR',JSON_ARRAY('CAR_OWNER','FOODIE','HIKING','MARRIAGE_ORIENTED'),'WORKER','MANUFACTURING','OTHER','新材研究院','FROM_300K_TO_500K','双子座',NOW()-INTERVAL 68 DAY,NOW()-INTERVAL 1 HOUR,NULL,NULL,0),
('REG-RI-USER-23','SHOWCASE',NOW()-INTERVAL 65 DAY,NOW()-INTERVAL 2 HOUR,'NORMAL',1,5,'书禾','FEMALE','2002-08-24',23,164,49,'110000','110100','110106','610000','610100','TIMING_MATURE','SINGLE','SEARCHING','SPONTANEOUS',JSON_ARRAY('SPORTS','TRAVEL'),'北京外国语大学','国际传播','MASTER',JSON_ARRAY('OVERSEAS_RETURNEE','ONLY_CHILD','CYCLING','LOVE_TRAVEL','OUTDOOR_LOVER'),'WORKER','CULTURE_MEDIA','OTHER','新知出版','FROM_150K_TO_300K','处女座',NOW()-INTERVAL 65 DAY,NOW()-INTERVAL 2 HOUR,NULL,NULL,0),
('REG-RI-USER-24','SHOWCASE',NOW()-INTERVAL 62 DAY,NOW()-INTERVAL 3 HOUR,'NORMAL',1,5,'温言','FEMALE','2000-01-30',26,168,51,'110000','110100','110105','110000','110100','ONE_TO_TWO_YEARS','SINGLE','SEARCHING','PLANNED',JSON_ARRAY('COFFEE','SPORTS','TRAVEL'),'北京大学','城市规划','MASTER',JSON_ARRAY('OVERSEAS_RETURNEE','HOME_OWNER','CAR_OWNER','ONLY_CHILD','PUBLIC_SECTOR_FAMILY','CYCLING','FOODIE','PET_LOVER','LOVE_TRAVEL','OUTDOOR_LOVER','MARRIAGE_ORIENTED'),'WORKER','ARCHITECTURE','DESIGNER','山海规划','FROM_300K_TO_500K','水瓶座',NOW()-INTERVAL 62 DAY,NOW()-INTERVAL 3 HOUR,NULL,NULL,0)
ON DUPLICATE KEY UPDATE
  nickname=VALUES(nickname),gender=VALUES(gender),birthday=VALUES(birthday),age=VALUES(age),
  height=VALUES(height),weight=VALUES(weight),location_province=VALUES(location_province),
  location_city=VALUES(location_city),location_district=VALUES(location_district),
  hometown_province=VALUES(hometown_province),hometown_city=VALUES(hometown_city),
  dating_goal=VALUES(dating_goal),marital_status=VALUES(marital_status),emotional_status=VALUES(emotional_status),
  meeting_preference=VALUES(meeting_preference),preferred_activities=VALUES(preferred_activities),
  school=VALUES(school),major=VALUES(major),education_level=VALUES(education_level),tags=VALUES(tags),
  identity=VALUES(identity),industry=VALUES(industry),occupation=VALUES(occupation),company=VALUES(company),
  annual_income=VALUES(annual_income),zodiac=VALUES(zodiac),last_login_time=VALUES(last_login_time),
  account_status='NORMAL',first_login_completed=1,first_login_next_step=5,update_time=NOW(),deleted=0;

-- 三项认证；material_json.seedKey 负责单记录幂等。
INSERT INTO app_user_audit_record (
  user_id,audit_group,audit_type,status,audit_source,media_url,thumb_url,content_hash,
  education_method,school_name,material_json,machine_signal_json,submit_time,audit_time,
  extra_json,create_time,update_time,created_by,updated_by,deleted
)
SELECT u.id,'CERTIFICATION',cert.audit_type,'APPROVED','MANUAL',
       CASE WHEN cert.audit_type='AVATAR' THEN ELT(MOD(CAST(RIGHT(u.openid,2) AS UNSIGNED)-1,3)+1,@profile_avatar,@profile_portrait,@profile_alternate) END,
       CASE WHEN cert.audit_type='AVATAR' THEN ELT(MOD(CAST(RIGHT(u.openid,2) AS UNSIGNED)-1,3)+1,@profile_avatar,@profile_portrait,@profile_alternate) END,
       SHA2(CONCAT(u.openid,':',cert.audit_type),256),
       CASE WHEN cert.audit_type='EDUCATION' THEN 'SHOWCASE_VERIFIED' END,
       CASE WHEN cert.audit_type='EDUCATION' THEN u.school END,
       JSON_OBJECT('seedKey',CONCAT(u.openid,':',cert.audit_type),'showcase',TRUE),
       JSON_OBJECT('decision','approved','source','showcase'),NOW()-INTERVAL 30 DAY,NOW()-INTERVAL 30 DAY,
       JSON_OBJECT('showcase',TRUE),NOW()-INTERVAL 30 DAY,NOW()-INTERVAL 30 DAY,NULL,NULL,0
FROM app_user u
JOIN (SELECT 'REAL_NAME' audit_type UNION ALL SELECT 'AVATAR' UNION ALL SELECT 'EDUCATION') cert
WHERE u.openid LIKE 'REG-RI-USER-%'
  AND NOT EXISTS (
    SELECT 1 FROM app_user_audit_record r
    WHERE r.user_id=u.id AND r.audit_type=cert.audit_type
      AND JSON_UNQUOTE(JSON_EXTRACT(r.material_json,'$.seedKey'))=CONCAT(u.openid,':',cert.audit_type)
  );

-- 独立主页背景。
INSERT INTO app_user_audit_record (
  user_id,audit_group,audit_type,status,audit_source,media_url,thumb_url,content_hash,
  material_json,machine_signal_json,submit_time,audit_time,extra_json,create_time,update_time,deleted
)
SELECT u.id,'MEDIA','PROFILE_BG','APPROVED','MANUAL',
       ELT(MOD(CAST(RIGHT(u.openid,2) AS UNSIGNED)-1,3)+1,@profile_hero,@profile_portrait,@profile_alternate),
       ELT(MOD(CAST(RIGHT(u.openid,2) AS UNSIGNED)-1,3)+1,@profile_hero,@profile_portrait,@profile_alternate),
       SHA2(CONCAT(u.openid,':PROFILE_BG'),256),
       JSON_OBJECT('seedKey',CONCAT(u.openid,':PROFILE_BG'),'showcase',TRUE),
       JSON_OBJECT('decision','approved'),NOW()-INTERVAL 29 DAY,NOW()-INTERVAL 29 DAY,
       JSON_OBJECT('showcase',TRUE),NOW()-INTERVAL 29 DAY,NOW()-INTERVAL 29 DAY,0
FROM app_user u
WHERE u.openid LIKE 'REG-RI-USER-%'
  AND NOT EXISTS (
    SELECT 1 FROM app_user_audit_record r
    WHERE r.user_id=u.id AND r.audit_type='PROFILE_BG'
      AND JSON_UNQUOTE(JSON_EXTRACT(r.material_json,'$.seedKey'))=CONCAT(u.openid,':PROFILE_BG')
  );

-- 每人三张相册图。
INSERT INTO app_user_audit_record (
  user_id,audit_group,audit_type,status,audit_source,media_url,thumb_url,content_hash,
  material_json,machine_signal_json,submit_time,audit_time,extra_json,create_time,update_time,deleted
)
SELECT u.id,'MEDIA','ALBUM_PHOTO','APPROVED','MANUAL',
       ELT(MOD(CAST(RIGHT(u.openid,2) AS UNSIGNED)+album.seq-2,3)+1,@profile_portrait,@profile_hero,@profile_alternate),
       ELT(MOD(CAST(RIGHT(u.openid,2) AS UNSIGNED)+album.seq-2,3)+1,@profile_portrait,@profile_hero,@profile_alternate),
       SHA2(CONCAT(u.openid,':ALBUM_PHOTO:',album.seq),256),
       JSON_OBJECT('seedKey',CONCAT(u.openid,':ALBUM_PHOTO:',album.seq),'showcase',TRUE,'sort',album.seq),
       JSON_OBJECT('decision','approved'),NOW()-INTERVAL (28-album.seq) DAY,NOW()-INTERVAL (28-album.seq) DAY,
       JSON_OBJECT('showcase',TRUE),NOW()-INTERVAL (28-album.seq) DAY,NOW()-INTERVAL (28-album.seq) DAY,0
FROM app_user u
JOIN (SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3) album
WHERE u.openid LIKE 'REG-RI-USER-%'
  AND NOT EXISTS (
    SELECT 1 FROM app_user_audit_record r
    WHERE r.user_id=u.id AND r.audit_type='ALBUM_PHOTO'
      AND JSON_UNQUOTE(JSON_EXTRACT(r.material_json,'$.seedKey'))=CONCAT(u.openid,':ALBUM_PHOTO:',album.seq)
  );

-- 关于我。
INSERT INTO app_user_audit_record (
  user_id,audit_group,audit_type,status,audit_source,content_text,content_hash,material_json,
  machine_signal_json,submit_time,audit_time,extra_json,create_time,update_time,deleted
)
SELECT u.id,'TEXT','ABOUT_ME','APPROVED','MANUAL',
       CONCAT('在北京认真生活，也认真期待一段稳定的关系。',u.nickname,'喜欢把工作之外的时间留给运动、阅读、看展和短途旅行，希望从真实交流开始慢慢了解。'),
       SHA2(CONCAT(u.openid,':ABOUT_ME'),256),
       JSON_OBJECT('seedKey',CONCAT(u.openid,':ABOUT_ME'),'showcase',TRUE),
       JSON_OBJECT('decision','approved'),NOW()-INTERVAL 24 DAY,NOW()-INTERVAL 24 DAY,
       JSON_OBJECT('showcase',TRUE),NOW()-INTERVAL 24 DAY,NOW()-INTERVAL 24 DAY,0
FROM app_user u
WHERE u.openid LIKE 'REG-RI-USER-%'
  AND NOT EXISTS (
    SELECT 1 FROM app_user_audit_record r
    WHERE r.user_id=u.id AND r.audit_type='ABOUT_ME'
      AND JSON_UNQUOTE(JSON_EXTRACT(r.material_json,'$.seedKey'))=CONCAT(u.openid,':ABOUT_ME')
  );

-- 推荐五类动作，每类三条；view 全部落在昨天，避免占用当天浏览额度。
INSERT INTO ct_recommend_view_log (
  event_no,request_id,user_id,candidate_user_id,scene,filter_version,snapshot_no,action,position,viewed_at,
  create_time,update_time,created_by,updated_by,deleted
)
SELECT CONCAT('REG-RI-ACTION-',seed.action_code,'-',LPAD(seed.seq,2,'0')),
       CONCAT('REG-RI-ACTION-REQ-',seed.action_code,'-',LPAD(seed.seq,2,'0')),
       @target_user_id,u.id,'recommend',@preference_version,NULL,LOWER(seed.action_code),seed.seq,
       NOW()-INTERVAL seed.day_offset DAY-INTERVAL seed.minute_offset MINUTE,
       NOW(),NOW(),@target_user_id,@target_user_id,0
FROM (
  SELECT 'VIEW' action_code,1 seq,13 user_no,1 day_offset,11 minute_offset UNION ALL
  SELECT 'VIEW',2,14,1,22 UNION ALL SELECT 'VIEW',3,15,1,33 UNION ALL
  SELECT 'DETAIL',1,16,0,44 UNION ALL SELECT 'DETAIL',2,17,1,55 UNION ALL SELECT 'DETAIL',3,18,2,66 UNION ALL
  SELECT 'SKIP',1,19,0,77 UNION ALL SELECT 'SKIP',2,20,1,88 UNION ALL SELECT 'SKIP',3,21,2,99 UNION ALL
  SELECT 'LIKE',1,22,0,110 UNION ALL SELECT 'LIKE',2,23,1,121 UNION ALL SELECT 'LIKE',3,24,2,132 UNION ALL
  SELECT 'NEVER',1,21,4,143 UNION ALL SELECT 'NEVER',2,22,5,154 UNION ALL SELECT 'NEVER',3,23,6,165
) seed
JOIN app_user u ON u.openid=CONCAT('REG-RI-USER-',LPAD(seed.user_no,2,'0'))
ON DUPLICATE KEY UPDATE
  candidate_user_id=VALUES(candidate_user_id),scene='recommend',filter_version=VALUES(filter_version),
  action=VALUES(action),position=VALUES(position),viewed_at=VALUES(viewed_at),update_time=NOW(),deleted=0;

-- never 动作同步“不再推荐”关系，避免回归数据违反领域状态。
INSERT INTO app_user_relation_block (
  user_id,target_user_id,block_type,source_scene,status,create_time,update_time,created_by,updated_by,deleted
)
SELECT @target_user_id,u.id,'NO_RECOMMEND','recommend','ENABLED',NOW(),NOW(),@target_user_id,@target_user_id,0
FROM app_user u
WHERE u.openid IN ('REG-RI-USER-21','REG-RI-USER-22','REG-RI-USER-23')
ON DUPLICATE KEY UPDATE source_scene='recommend',status='ENABLED',update_time=NOW(),deleted=0;

-- 六大分类各一个有效快照，每类 4 个候选；另补一个过期快照。
INSERT INTO ct_ideal_filter_snapshot (
  snapshot_no,user_id,request_id,condition_digest,preference_version,target_city_codes,min_age,max_age,
  condition_codes,condition_payload,result_count,status,expires_at,create_time,update_time,created_by,updated_by,deleted
)
VALUES
('REG-RI-SNAPSHOT-APPEARANCE',@target_user_id,'REG-RI-REQUEST-APPEARANCE',SHA2('REG-RI-SNAPSHOT-APPEARANCE',256),@preference_version,JSON_ARRAY('110100'),20,30,JSON_ARRAY('M08-IDEAL-height-165'),JSON_ARRAY(JSON_OBJECT('code','M08-IDEAL-height-165','name','身高165+','category','外在条件')),4,'active',NOW()+INTERVAL 90 DAY,NOW()-INTERVAL 6 DAY,NOW(),@target_user_id,@target_user_id,0),
('REG-RI-SNAPSHOT-EDUCATION',@target_user_id,'REG-RI-REQUEST-EDUCATION',SHA2('REG-RI-SNAPSHOT-EDUCATION',256),@preference_version,JSON_ARRAY('110100'),20,30,JSON_ARRAY('M08-IDEAL-overseas'),JSON_ARRAY(JSON_OBJECT('code','M08-IDEAL-overseas','name','留学海归','category','教育背景')),4,'active',NOW()+INTERVAL 90 DAY,NOW()-INTERVAL 5 DAY,NOW(),@target_user_id,@target_user_id,0),
('REG-RI-SNAPSHOT-ECONOMY',@target_user_id,'REG-RI-REQUEST-ECONOMY',SHA2('REG-RI-SNAPSHOT-ECONOMY',256),@preference_version,JSON_ARRAY('110100'),20,30,JSON_ARRAY('M08-IDEAL-home-owner'),JSON_ARRAY(JSON_OBJECT('code','M08-IDEAL-home-owner','name','已购房','category','经济实力')),4,'active',NOW()+INTERVAL 90 DAY,NOW()-INTERVAL 4 DAY,NOW(),@target_user_id,@target_user_id,0),
('REG-RI-SNAPSHOT-FAMILY',@target_user_id,'REG-RI-REQUEST-FAMILY',SHA2('REG-RI-SNAPSHOT-FAMILY',256),@preference_version,JSON_ARRAY('110100'),20,30,JSON_ARRAY('M08-IDEAL-local'),JSON_ARRAY(JSON_OBJECT('code','M08-IDEAL-local','name','本地人','category','家庭背景')),4,'active',NOW()+INTERVAL 90 DAY,NOW()-INTERVAL 3 DAY,NOW(),@target_user_id,@target_user_id,0),
('REG-RI-SNAPSHOT-INTEREST',@target_user_id,'REG-RI-REQUEST-INTEREST',SHA2('REG-RI-SNAPSHOT-INTEREST',256),@preference_version,JSON_ARRAY('110100'),20,30,JSON_ARRAY('M08-IDEAL-interest-similar'),JSON_ARRAY(JSON_OBJECT('code','M08-IDEAL-interest-similar','name','兴趣相似','category','兴趣爱好')),4,'active',NOW()+INTERVAL 90 DAY,NOW()-INTERVAL 2 DAY,NOW(),@target_user_id,@target_user_id,0),
('REG-RI-SNAPSHOT-RELATIONSHIP',@target_user_id,'REG-RI-REQUEST-RELATIONSHIP',SHA2('REG-RI-SNAPSHOT-RELATIONSHIP',256),@preference_version,JSON_ARRAY('110100'),20,30,JSON_ARRAY('M08-IDEAL-marry-2y'),JSON_ARRAY(JSON_OBJECT('code','M08-IDEAL-marry-2y','name','想2年内结婚','category','感情与经历')),4,'active',NOW()+INTERVAL 90 DAY,NOW()-INTERVAL 1 DAY,NOW(),@target_user_id,@target_user_id,0),
('REG-RI-SNAPSHOT-EXPIRED',@target_user_id,'REG-RI-REQUEST-EXPIRED',SHA2('REG-RI-SNAPSHOT-EXPIRED',256),@preference_version,JSON_ARRAY('110100'),20,30,JSON_ARRAY('M08-IDEAL-travel'),JSON_ARRAY(JSON_OBJECT('code','M08-IDEAL-travel','name','喜欢旅行','category','兴趣爱好')),4,'expired',NOW()-INTERVAL 1 DAY,NOW()-INTERVAL 100 DAY,NOW(),@target_user_id,@target_user_id,0)
ON DUPLICATE KEY UPDATE
  preference_version=VALUES(preference_version),target_city_codes=VALUES(target_city_codes),
  min_age=VALUES(min_age),max_age=VALUES(max_age),condition_codes=VALUES(condition_codes),
  condition_payload=VALUES(condition_payload),result_count=4,status=VALUES(status),
  expires_at=VALUES(expires_at),update_time=NOW(),deleted=0;

-- 分类候选清单。每条 item_no 由分类和序号组成，便于接口回归定位。
INSERT INTO ct_ideal_snapshot_candidate (
  snapshot_id,item_no,candidate_user_id,sort_time,sort_tie_breaker,matched_condition_codes,
  create_time,update_time,created_by,updated_by,deleted
)
SELECT s.id,seed.item_no,u.id,NOW()-INTERVAL seed.sort_minutes MINUTE,
       LPAD(seed.sort_minutes,4,'0'),JSON_ARRAY(seed.condition_code),
       NOW(),NOW(),@target_user_id,@target_user_id,0
FROM (
  SELECT 'REG-RI-SNAPSHOT-APPEARANCE' snapshot_no,'REG-RI-APPEARANCE-ITEM-01' item_no,13 user_no,'M08-IDEAL-height-165' condition_code,11 sort_minutes UNION ALL
  SELECT 'REG-RI-SNAPSHOT-APPEARANCE','REG-RI-APPEARANCE-ITEM-02',14,'M08-IDEAL-height-165',12 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-APPEARANCE','REG-RI-APPEARANCE-ITEM-03',15,'M08-IDEAL-height-165',13 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-APPEARANCE','REG-RI-APPEARANCE-ITEM-04',16,'M08-IDEAL-height-165',14 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-EDUCATION','REG-RI-EDUCATION-ITEM-01',14,'M08-IDEAL-overseas',21 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-EDUCATION','REG-RI-EDUCATION-ITEM-02',17,'M08-IDEAL-overseas',22 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-EDUCATION','REG-RI-EDUCATION-ITEM-03',20,'M08-IDEAL-overseas',23 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-EDUCATION','REG-RI-EDUCATION-ITEM-04',24,'M08-IDEAL-overseas',24 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-ECONOMY','REG-RI-ECONOMY-ITEM-01',13,'M08-IDEAL-home-owner',31 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-ECONOMY','REG-RI-ECONOMY-ITEM-02',17,'M08-IDEAL-home-owner',32 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-ECONOMY','REG-RI-ECONOMY-ITEM-03',18,'M08-IDEAL-home-owner',33 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-ECONOMY','REG-RI-ECONOMY-ITEM-04',24,'M08-IDEAL-home-owner',34 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-FAMILY','REG-RI-FAMILY-ITEM-01',14,'M08-IDEAL-local',41 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-FAMILY','REG-RI-FAMILY-ITEM-02',18,'M08-IDEAL-local',42 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-FAMILY','REG-RI-FAMILY-ITEM-03',16,'M08-IDEAL-local',43 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-FAMILY','REG-RI-FAMILY-ITEM-04',24,'M08-IDEAL-local',44 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-INTEREST','REG-RI-INTEREST-ITEM-01',15,'M08-IDEAL-interest-similar',51 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-INTEREST','REG-RI-INTEREST-ITEM-02',19,'M08-IDEAL-interest-similar',52 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-INTEREST','REG-RI-INTEREST-ITEM-03',13,'M08-IDEAL-interest-similar',53 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-INTEREST','REG-RI-INTEREST-ITEM-04',24,'M08-IDEAL-interest-similar',54 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-RELATIONSHIP','REG-RI-RELATIONSHIP-ITEM-01',16,'M08-IDEAL-marry-2y',61 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-RELATIONSHIP','REG-RI-RELATIONSHIP-ITEM-02',20,'M08-IDEAL-marry-2y',62 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-RELATIONSHIP','REG-RI-RELATIONSHIP-ITEM-03',18,'M08-IDEAL-marry-2y',63 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-RELATIONSHIP','REG-RI-RELATIONSHIP-ITEM-04',24,'M08-IDEAL-marry-2y',64 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-EXPIRED','REG-RI-EXPIRED-ITEM-01',13,'M08-IDEAL-travel',71 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-EXPIRED','REG-RI-EXPIRED-ITEM-02',16,'M08-IDEAL-travel',72 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-EXPIRED','REG-RI-EXPIRED-ITEM-03',20,'M08-IDEAL-travel',73 UNION ALL
  SELECT 'REG-RI-SNAPSHOT-EXPIRED','REG-RI-EXPIRED-ITEM-04',24,'M08-IDEAL-travel',74
) seed
JOIN ct_ideal_filter_snapshot s ON s.snapshot_no=seed.snapshot_no AND s.deleted=0
JOIN app_user u ON u.openid=CONCAT('REG-RI-USER-',LPAD(seed.user_no,2,'0')) AND u.deleted=0
ON DUPLICATE KEY UPDATE
  snapshot_id=VALUES(snapshot_id),candidate_user_id=VALUES(candidate_user_id),sort_time=VALUES(sort_time),
  sort_tie_breaker=VALUES(sort_tie_breaker),matched_condition_codes=VALUES(matched_condition_codes),
  update_time=NOW(),deleted=0;

-- 三条有效、三条过期的历史解锁；均标记 SHOWCASE 且 coin_cost=0，不伪造支付和资产流水。
INSERT INTO app_user_unlock_record (
  unlock_no,request_id,quote_token,user_id,target_user_id,target_biz_type,target_biz_no,
  snapshot_no,snapshot_item_no,active_marker,unlock_scene,unlock_method,coin_cost,
  effective_time,expire_time,status,create_time,update_time,created_by,updated_by,deleted
)
SELECT seed.unlock_no,seed.request_id,seed.quote_token,@target_user_id,u.id,'ideal',CAST(u.id AS CHAR),
       seed.snapshot_no,seed.item_no,seed.active_marker,'ideal_user_unlock','SHOWCASE',0,
       seed.effective_time,seed.expire_time,seed.status,seed.effective_time,NOW(),@target_user_id,@target_user_id,0
FROM (
  SELECT 'REG-RI-UNLOCK-ACTIVE-01' unlock_no,'REG-RI-UNLOCK-ACTIVE-REQ-01' request_id,'REG-RI-QUOTE-ACTIVE-01' quote_token,13 user_no,
         'REG-RI-SNAPSHOT-APPEARANCE' snapshot_no,'REG-RI-APPEARANCE-ITEM-01' item_no,1 active_marker,
         NOW()-INTERVAL 2 DAY effective_time,NOW()+INTERVAL 88 DAY expire_time,'active' status UNION ALL
  SELECT 'REG-RI-UNLOCK-ACTIVE-02','REG-RI-UNLOCK-ACTIVE-REQ-02','REG-RI-QUOTE-ACTIVE-02',17,
         'REG-RI-SNAPSHOT-ECONOMY','REG-RI-ECONOMY-ITEM-02',1,NOW()-INTERVAL 1 DAY,NOW()+INTERVAL 89 DAY,'active' UNION ALL
  SELECT 'REG-RI-UNLOCK-ACTIVE-03','REG-RI-UNLOCK-ACTIVE-REQ-03','REG-RI-QUOTE-ACTIVE-03',20,
         'REG-RI-SNAPSHOT-RELATIONSHIP','REG-RI-RELATIONSHIP-ITEM-02',1,NOW()-INTERVAL 12 HOUR,NOW()+INTERVAL 89 DAY,'active' UNION ALL
  SELECT 'REG-RI-UNLOCK-EXPIRED-01','REG-RI-UNLOCK-EXPIRED-REQ-01','REG-RI-QUOTE-EXPIRED-01',14,
         'REG-RI-SNAPSHOT-EXPIRED','REG-RI-EXPIRED-ITEM-01',NULL,NOW()-INTERVAL 100 DAY,NOW()-INTERVAL 10 DAY,'expired' UNION ALL
  SELECT 'REG-RI-UNLOCK-EXPIRED-02','REG-RI-UNLOCK-EXPIRED-REQ-02','REG-RI-QUOTE-EXPIRED-02',18,
         'REG-RI-SNAPSHOT-EXPIRED','REG-RI-EXPIRED-ITEM-02',NULL,NOW()-INTERVAL 99 DAY,NOW()-INTERVAL 9 DAY,'expired' UNION ALL
  SELECT 'REG-RI-UNLOCK-EXPIRED-03','REG-RI-UNLOCK-EXPIRED-REQ-03','REG-RI-QUOTE-EXPIRED-03',24,
         'REG-RI-SNAPSHOT-EXPIRED','REG-RI-EXPIRED-ITEM-04',NULL,NOW()-INTERVAL 98 DAY,NOW()-INTERVAL 8 DAY,'expired'
) seed
JOIN app_user u ON u.openid=CONCAT('REG-RI-USER-',LPAD(seed.user_no,2,'0')) AND u.deleted=0
ON DUPLICATE KEY UPDATE
  request_id=VALUES(request_id),quote_token=VALUES(quote_token),target_user_id=VALUES(target_user_id),
  target_biz_type='ideal',target_biz_no=VALUES(target_biz_no),snapshot_no=VALUES(snapshot_no),
  snapshot_item_no=VALUES(snapshot_item_no),active_marker=VALUES(active_marker),unlock_scene='ideal_user_unlock',
  unlock_method='SHOWCASE',coin_cost=0,effective_time=VALUES(effective_time),expire_time=VALUES(expire_time),
  status=VALUES(status),update_time=NOW(),deleted=0;

COMMIT;

-- =============================================================
-- 执行后核验：期望 12 / 5 / 6 / 24；快照与解锁均含 active、expired。
-- =============================================================
SELECT 'recommend_new_candidates' AS metric,COUNT(*) AS total
FROM app_user WHERE openid LIKE 'REG-RI-USER-%' AND account_status='NORMAL' AND deleted=0;

SELECT 'recommend_action_types' AS metric,COUNT(DISTINCT action) AS total
FROM ct_recommend_view_log WHERE event_no LIKE 'REG-RI-ACTION-%' AND deleted=0;

SELECT 'recommend_action_detail' AS metric,action,COUNT(*) AS total
FROM ct_recommend_view_log WHERE event_no LIKE 'REG-RI-ACTION-%' AND deleted=0
GROUP BY action ORDER BY action;

SELECT 'ideal_category_snapshots' AS metric,COUNT(*) AS total
FROM ct_ideal_filter_snapshot
WHERE snapshot_no IN (
  'REG-RI-SNAPSHOT-APPEARANCE','REG-RI-SNAPSHOT-EDUCATION','REG-RI-SNAPSHOT-ECONOMY',
  'REG-RI-SNAPSHOT-FAMILY','REG-RI-SNAPSHOT-INTEREST','REG-RI-SNAPSHOT-RELATIONSHIP'
) AND status='active' AND deleted=0;

SELECT 'ideal_category_candidates' AS metric,
       JSON_UNQUOTE(JSON_EXTRACT(s.condition_payload,'$[0].category')) AS category,
       COUNT(c.id) AS total
FROM ct_ideal_filter_snapshot s
JOIN ct_ideal_snapshot_candidate c ON c.snapshot_id=s.id AND c.deleted=0
WHERE s.snapshot_no LIKE 'REG-RI-SNAPSHOT-%' AND s.snapshot_no<>'REG-RI-SNAPSHOT-EXPIRED' AND s.deleted=0
GROUP BY JSON_UNQUOTE(JSON_EXTRACT(s.condition_payload,'$[0].category'))
ORDER BY category;

SELECT 'ideal_snapshot_statuses' AS metric,status,COUNT(*) AS total
FROM ct_ideal_filter_snapshot
WHERE snapshot_no LIKE 'REG-RI-SNAPSHOT-%' AND deleted=0
GROUP BY status ORDER BY status;

SELECT 'ideal_unlock_statuses' AS metric,status,COUNT(*) AS total
FROM app_user_unlock_record
WHERE unlock_no LIKE 'REG-RI-UNLOCK-%' AND deleted=0
GROUP BY status ORDER BY status;

SELECT 'duplicate_business_keys' AS metric,COALESCE(SUM(duplicate_count),0) AS total
FROM (
  SELECT COUNT(*)-COUNT(DISTINCT openid) duplicate_count FROM app_user WHERE openid LIKE 'REG-RI-USER-%' AND deleted=0
  UNION ALL
  SELECT COUNT(*)-COUNT(DISTINCT event_no) FROM ct_recommend_view_log WHERE event_no LIKE 'REG-RI-ACTION-%' AND deleted=0
  UNION ALL
  SELECT COUNT(*)-COUNT(DISTINCT snapshot_no) FROM ct_ideal_filter_snapshot WHERE snapshot_no LIKE 'REG-RI-SNAPSHOT-%' AND deleted=0
  UNION ALL
  SELECT COUNT(*)-COUNT(DISTINCT item_no) FROM ct_ideal_snapshot_candidate WHERE item_no LIKE 'REG-RI-%-ITEM-%' AND deleted=0
  UNION ALL
  SELECT COUNT(*)-COUNT(DISTINCT unlock_no) FROM app_user_unlock_record WHERE unlock_no LIKE 'REG-RI-UNLOCK-%' AND deleted=0
) duplicate_check;
