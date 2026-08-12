-- =============================================================
-- 推荐 / 理想型 / 千寻 / 心动：生产感测试数据
-- 目标账号：仅通过手机号 17366629764 定位，不写死用户主键。
-- 特性：可重复执行；不删除既有数据；不写手机号、证件号或可联系身份给虚构用户。
-- 用途：测试/验收环境手工执行，禁止加入自动生产迁移目录。
-- =============================================================

SET NAMES utf8mb4;

SET @target_user_id := (
  SELECT id FROM app_user WHERE phone = '17366629764' AND deleted = 0 LIMIT 1
);

DROP PROCEDURE IF EXISTS assert_rich_seed_target;
DELIMITER $$
CREATE PROCEDURE assert_rich_seed_target()
BEGIN
  IF @target_user_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '目标账号 17366629764 不存在，终止丰富数据脚本';
  END IF;
END$$
DELIMITER ;
CALL assert_rich_seed_target();
DROP PROCEDURE assert_rich_seed_target;

START TRANSACTION;

SET @profile_hero := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/bbcbb75d67491052/edit-hero-photo.jpg';
SET @profile_avatar := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/261827265aa63898/heart-avatar.webp';
SET @profile_portrait := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/b792aaaa728828e4/heart-person.webp';
SET @profile_alternate := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/miniapp/ui-icons/4898cbe71d1bfd15/match-photo.webp';
SET @img_camp := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/c68220654bccd343/camping.webp';
SET @img_lake := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/7defd83c31c6dea6/lake.webp';
SET @img_green := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/6cbefc15fb2a45d3/greenery.webp';
SET @img_coffee := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/11ed2f2331e972fb/coffee.webp';
SET @img_book := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/415aef3f60d3c52a/bookstore.webp';
SET @img_hiking := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/5a904705a92fa0c8/hiking.webp';
SET @img_museum := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/657edf371fe06d7e/museum.webp';
SET @img_city := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/0d21b8004eaeb0b2/city.webp';
SET @img_bakery := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/033a649fca399de0/bakery.webp';
SET @img_cycling := 'https://shikongxiehou.oss-cn-shanghai.aliyuncs.com/community/demo/2026-08/98e751a59a35983d/cycling.webp';

-- 12 名北京异性候选。openid 是稳定种子标识；手机、证件、微信号保持 NULL。
INSERT INTO app_user (
  openid, register_source, register_time, last_login_time, account_status,
  first_login_completed, first_login_next_step, nickname, gender, birthday, age, height, weight,
  location_province, location_city, location_district, hometown_province, hometown_city,
  dating_goal, marital_status, emotional_status, school, major, education_level, tags,
  identity, industry, occupation, company, annual_income, zodiac,
  create_time, update_time, created_by, updated_by, deleted
)
VALUES
('RICH-QX-USER-01','SHOWCASE',NOW()-INTERVAL 80 DAY,NOW()-INTERVAL 3 MINUTE,'NORMAL',1,4,'清禾','FEMALE','2001-03-08',25,166,50,'110000','110100','110105','130000','130100','ONE_TO_TWO_YEARS','SINGLE','SEARCHING','北京工业大学','视觉传达','BACHELOR','["LOVE_TRAVEL","FOODIE","PET_LOVER","HOME_OWNER"]','WORKER','IT_INTERNET','DESIGNER','微光设计','FROM_150K_TO_300K','双鱼座',NOW()-INTERVAL 80 DAY,NOW()-INTERVAL 3 MINUTE,NULL,NULL,0),
('RICH-QX-USER-02','SHOWCASE',NOW()-INTERVAL 76 DAY,NOW()-INTERVAL 9 MINUTE,'NORMAL',1,4,'知夏','FEMALE','1999-08-17',27,168,52,'110000','110100','110108','110000','110100','TIMING_MATURE','SINGLE','SEARCHING','中国传媒大学','数字媒体','MASTER','["RUNNING","BOOKS","COFFEE","ONLY_CHILD"]','WORKER','CULTURE_MEDIA','DESIGNER','木棉文化','FROM_300K_TO_500K','狮子座',NOW()-INTERVAL 76 DAY,NOW()-INTERVAL 9 MINUTE,NULL,NULL,0),
('RICH-QX-USER-03','SHOWCASE',NOW()-INTERVAL 72 DAY,NOW()-INTERVAL 16 MINUTE,'NORMAL',1,4,'若岚','FEMALE','2002-01-25',24,163,48,'110000','110100','110106','370000','370100','ONE_TO_TWO_YEARS','SINGLE','SEARCHING','中央财经大学','金融学','BACHELOR','["MUSEUM","FITNESS","FOODIE","CAR_OWNER"]','WORKER','FINANCE','FINANCE','青川资本','FROM_300K_TO_500K','水瓶座',NOW()-INTERVAL 72 DAY,NOW()-INTERVAL 16 MINUTE,NULL,NULL,0),
('RICH-QX-USER-04','SHOWCASE',NOW()-INTERVAL 68 DAY,NOW()-INTERVAL 25 MINUTE,'NORMAL',1,4,'南乔','FEMALE','2000-11-03',25,170,54,'110000','110100','110101','320000','320100','SERIOUS_RELATIONSHIP','SINGLE','LOOKING','北京师范大学','心理学','MASTER','["HIKING","LOVE_TRAVEL","PUBLIC_SECTOR_FAMILY","LIKES_ANIMALS"]','WORKER','EDUCATION_RESEARCH','TEACHER','城市学院','FROM_150K_TO_300K','天蝎座',NOW()-INTERVAL 68 DAY,NOW()-INTERVAL 25 MINUTE,NULL,NULL,0),
('RICH-QX-USER-05','SHOWCASE',NOW()-INTERVAL 64 DAY,NOW()-INTERVAL 38 MINUTE,'NORMAL',1,4,'晚晴','FEMALE','2001-06-19',25,165,49,'110000','110100','110102','420000','420100','TIMING_MATURE','SINGLE','SEARCHING','北京科技大学','计算机科学','BACHELOR','["CYCLING","COFFEE","HOME_OWNER","SPORTS_HABIT"]','WORKER','IT_INTERNET','PRODUCT_MANAGER','星河科技','FROM_300K_TO_500K','双子座',NOW()-INTERVAL 64 DAY,NOW()-INTERVAL 38 MINUTE,NULL,NULL,0),
('RICH-QX-USER-06','SHOWCASE',NOW()-INTERVAL 60 DAY,NOW()-INTERVAL 52 MINUTE,'NORMAL',1,4,'云舒','FEMALE','2000-04-12',26,167,51,'110000','110100','110105','510000','510100','ONE_TO_TWO_YEARS','SINGLE','SEARCHING','北京邮电大学','信息工程','MASTER','["BOOKS","FITNESS","TRAVEL_MEMORY","OVERSEAS_RETURNEE"]','WORKER','IT_INTERNET','PRODUCT_MANAGER','远山互联','FROM_300K_TO_500K','白羊座',NOW()-INTERVAL 60 DAY,NOW()-INTERVAL 52 MINUTE,NULL,NULL,0),
('RICH-QX-USER-07','SHOWCASE',NOW()-INTERVAL 56 DAY,NOW()-INTERVAL 1 HOUR,'NORMAL',1,4,'鹿鸣','FEMALE','1998-12-06',27,164,49,'110000','110100','110114','110000','110100','TIMING_MATURE','SINGLE','SEARCHING','首都师范大学','汉语言文学','MASTER','["BOOKS","MUSEUM","PET_LOVER","LOCAL_LIFE"]','WORKER','EDUCATION_RESEARCH','TEACHER','春晖中学','FROM_150K_TO_300K','射手座',NOW()-INTERVAL 56 DAY,NOW()-INTERVAL 1 HOUR,NULL,NULL,0),
('RICH-QX-USER-08','SHOWCASE',NOW()-INTERVAL 52 DAY,NOW()-INTERVAL 2 HOUR,'NORMAL',1,4,'星遥','FEMALE','2002-09-28',23,169,53,'110000','110100','110107','140000','140200','ONE_TO_TWO_YEARS','SINGLE','SEARCHING','北京建筑大学','建筑学','BACHELOR','["CITY_WALK","PHOTOGRAPHY","HIKING","LOVE_TRAVEL"]','WORKER','ARCHITECTURE','DESIGNER','原点建筑','FROM_150K_TO_300K','天秤座',NOW()-INTERVAL 52 DAY,NOW()-INTERVAL 2 HOUR,NULL,NULL,0),
('RICH-QX-USER-09','SHOWCASE',NOW()-INTERVAL 48 DAY,NOW()-INTERVAL 3 HOUR,'NORMAL',1,4,'以宁','FEMALE','1999-02-14',27,162,47,'110000','110100','110112','410000','410100','SERIOUS_RELATIONSHIP','SINGLE','LOOKING','对外经济贸易大学','国际经济','MASTER','["COFFEE","FOODIE","RUNNING","ONLY_CHILD"]','WORKER','FINANCE','FINANCE','和风咨询','FROM_300K_TO_500K','水瓶座',NOW()-INTERVAL 48 DAY,NOW()-INTERVAL 3 HOUR,NULL,NULL,0),
('RICH-QX-USER-10','SHOWCASE',NOW()-INTERVAL 44 DAY,NOW()-INTERVAL 5 HOUR,'NORMAL',1,4,'书妍','FEMALE','2001-10-09',24,166,50,'110000','110100','110108','330000','330100','ONE_TO_TWO_YEARS','SINGLE','SEARCHING','北京林业大学','风景园林','BACHELOR','["GREEN_LIFE","CYCLING","PET_LOVER","CAR_OWNER"]','WORKER','ARCHITECTURE','DESIGNER','森林事务所','FROM_150K_TO_300K','天秤座',NOW()-INTERVAL 44 DAY,NOW()-INTERVAL 5 HOUR,NULL,NULL,0),
('RICH-QX-USER-11','SHOWCASE',NOW()-INTERVAL 40 DAY,NOW()-INTERVAL 7 HOUR,'NORMAL',1,4,'初月','FEMALE','2000-05-22',26,171,55,'110000','110100','110106','210000','210100','TIMING_MATURE','SINGLE','SEARCHING','北京航空航天大学','工业设计','MASTER','["FITNESS","MUSEUM","FOODIE","HOME_OWNER"]','WORKER','MANUFACTURING','DESIGNER','造物实验室','FROM_300K_TO_500K','双子座',NOW()-INTERVAL 40 DAY,NOW()-INTERVAL 7 HOUR,NULL,NULL,0),
('RICH-QX-USER-12','SHOWCASE',NOW()-INTERVAL 36 DAY,NOW()-INTERVAL 10 HOUR,'NORMAL',1,4,'简宁','FEMALE','1998-07-30',28,165,50,'110000','110100','110105','610000','610100','SERIOUS_RELATIONSHIP','SINGLE','LOOKING','北京大学','社会学','DOCTOR','["BOOKS","PUBLIC_SECTOR_FAMILY","LOVE_TRAVEL","LIKES_ANIMALS"]','WORKER','EDUCATION_RESEARCH','TEACHER','研究中心','FROM_300K_TO_500K','狮子座',NOW()-INTERVAL 36 DAY,NOW()-INTERVAL 10 HOUR,NULL,NULL,0)
ON DUPLICATE KEY UPDATE
  nickname=VALUES(nickname), gender=VALUES(gender), birthday=VALUES(birthday), age=VALUES(age),
  height=VALUES(height), weight=VALUES(weight), location_province=VALUES(location_province),
  location_city=VALUES(location_city), location_district=VALUES(location_district),
  hometown_province=VALUES(hometown_province), hometown_city=VALUES(hometown_city),
  dating_goal=VALUES(dating_goal), marital_status=VALUES(marital_status), emotional_status=VALUES(emotional_status),
  school=VALUES(school), major=VALUES(major), education_level=VALUES(education_level), tags=VALUES(tags),
  identity=VALUES(identity), industry=VALUES(industry), occupation=VALUES(occupation), company=VALUES(company),
  annual_income=VALUES(annual_income), zodiac=VALUES(zodiac), last_login_time=VALUES(last_login_time),
  account_status='NORMAL', first_login_completed=1, first_login_next_step=4, update_time=NOW(), deleted=0;

-- 三重认证、头像、相册、主页大图和介绍。material_json 内的 seedKey 保证单记录幂等。
INSERT INTO app_user_audit_record (
  user_id,audit_group,audit_type,status,audit_source,media_url,thumb_url,content_text,content_hash,
  real_name,education_method,school_name,material_json,machine_signal_json,submit_time,audit_time,
  extra_json,create_time,update_time,created_by,updated_by,deleted
)
SELECT u.id,'CERTIFICATION',cert.audit_type,'APPROVED','MANUAL',
       CASE WHEN cert.audit_type='AVATAR' THEN ELT(MOD(CAST(RIGHT(u.openid,2) AS UNSIGNED)-1,3)+1,@profile_avatar,@profile_portrait,@profile_alternate) ELSE NULL END,
       CASE WHEN cert.audit_type='AVATAR' THEN ELT(MOD(CAST(RIGHT(u.openid,2) AS UNSIGNED)-1,3)+1,@profile_avatar,@profile_portrait,@profile_alternate) ELSE NULL END,
       NULL,SHA2(CONCAT(u.openid,':',cert.audit_type),256),
       NULL,
       CASE WHEN cert.audit_type='EDUCATION' THEN 'SHOWCASE_VERIFIED' ELSE NULL END,
       CASE WHEN cert.audit_type='EDUCATION' THEN u.school ELSE NULL END,
       JSON_OBJECT('seedKey',CONCAT(u.openid,':',cert.audit_type),'showcase',TRUE),
       JSON_OBJECT('decision','approved','source','showcase'),NOW()-INTERVAL 30 DAY,NOW()-INTERVAL 30 DAY,
       JSON_OBJECT('showcase',TRUE),NOW()-INTERVAL 30 DAY,NOW()-INTERVAL 30 DAY,NULL,NULL,0
FROM app_user u
JOIN (
  SELECT 'REAL_NAME' audit_type UNION ALL SELECT 'AVATAR' UNION ALL SELECT 'EDUCATION'
) cert
WHERE u.openid LIKE 'RICH-QX-USER-%'
  AND NOT EXISTS (
    SELECT 1 FROM app_user_audit_record r
    WHERE r.user_id=u.id AND r.audit_type=cert.audit_type
      AND JSON_UNQUOTE(JSON_EXTRACT(r.material_json,'$.seedKey'))=CONCAT(u.openid,':',cert.audit_type)
  );

INSERT INTO app_user_audit_record (
  user_id,audit_group,audit_type,status,audit_source,media_url,thumb_url,content_text,content_hash,
  material_json,machine_signal_json,submit_time,audit_time,extra_json,create_time,update_time,deleted
)
SELECT u.id,'MEDIA','PROFILE_BG','APPROVED','MANUAL',
       ELT(MOD(CAST(RIGHT(u.openid,2) AS UNSIGNED)-1,3)+1,@profile_hero,@profile_portrait,@profile_alternate),
       ELT(MOD(CAST(RIGHT(u.openid,2) AS UNSIGNED)-1,3)+1,@profile_hero,@profile_portrait,@profile_alternate),NULL,
       SHA2(CONCAT(u.openid,':PROFILE_BG'),256),JSON_OBJECT('seedKey',CONCAT(u.openid,':PROFILE_BG'),'showcase',TRUE),
       JSON_OBJECT('decision','approved'),NOW()-INTERVAL 29 DAY,NOW()-INTERVAL 29 DAY,JSON_OBJECT('showcase',TRUE),
       NOW()-INTERVAL 29 DAY,NOW()-INTERVAL 29 DAY,0
FROM app_user u WHERE u.openid LIKE 'RICH-QX-USER-%'
AND NOT EXISTS (SELECT 1 FROM app_user_audit_record r WHERE r.user_id=u.id AND r.audit_type='PROFILE_BG' AND JSON_UNQUOTE(JSON_EXTRACT(r.material_json,'$.seedKey'))=CONCAT(u.openid,':PROFILE_BG'));

INSERT INTO app_user_audit_record (
  user_id,audit_group,audit_type,status,audit_source,media_url,thumb_url,content_text,content_hash,
  material_json,machine_signal_json,submit_time,audit_time,extra_json,create_time,update_time,deleted
)
SELECT u.id,'MEDIA','ALBUM_PHOTO','APPROVED','MANUAL',
       ELT(MOD(CAST(RIGHT(u.openid,2) AS UNSIGNED)+album.seq-2,3)+1,@profile_portrait,@profile_hero,@profile_alternate),
       ELT(MOD(CAST(RIGHT(u.openid,2) AS UNSIGNED)+album.seq-2,3)+1,@profile_portrait,@profile_hero,@profile_alternate),NULL,
       SHA2(CONCAT(u.openid,':ALBUM_PHOTO:',album.seq),256),
       JSON_OBJECT('seedKey',CONCAT(u.openid,':ALBUM_PHOTO:',album.seq),'showcase',TRUE,'sort',album.seq),
       JSON_OBJECT('decision','approved'),NOW()-INTERVAL (28-album.seq) DAY,NOW()-INTERVAL (28-album.seq) DAY,
       JSON_OBJECT('showcase',TRUE),NOW()-INTERVAL (28-album.seq) DAY,NOW()-INTERVAL (28-album.seq) DAY,0
FROM app_user u JOIN (SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3) album
WHERE u.openid LIKE 'RICH-QX-USER-%'
AND NOT EXISTS (SELECT 1 FROM app_user_audit_record r WHERE r.user_id=u.id AND r.audit_type='ALBUM_PHOTO' AND JSON_UNQUOTE(JSON_EXTRACT(r.material_json,'$.seedKey'))=CONCAT(u.openid,':ALBUM_PHOTO:',album.seq));

INSERT INTO app_user_audit_record (
  user_id,audit_group,audit_type,status,audit_source,content_text,content_hash,material_json,
  machine_signal_json,submit_time,audit_time,extra_json,create_time,update_time,deleted
)
SELECT u.id,'TEXT','ABOUT_ME','APPROVED','MANUAL',
       ELT(CAST(RIGHT(u.openid,2) AS UNSIGNED),
         '在设计和生活之间寻找平衡，喜欢看展、散步和认真吃一顿饭。期待一段彼此尊重、可以一起成长的关系。',
         '日常在媒体行业做内容，周末会跑步、看书。希望遇见情绪稳定、有好奇心，也愿意分享普通日常的人。',
         '金融从业但不只聊数字，喜欢博物馆和新餐厅。认真认识，慢慢了解，关系里重视坦诚与边界。',
         '老师一枚，喜欢徒步和旅行。向往简单、温暖、有行动力的两个人生活，也愿意一起经营长期关系。',
         '白天做产品，晚上骑车吹风。性格直接但温和，希望彼此有自己的节奏，也能为重要的事并肩。',
         '互联网行业，喜欢阅读、健身和偶尔远行。期待价值观相近、沟通顺畅，能把小日子过得有趣。',
         '教书也写点小文章，爱逛书店和养小动物。比起热闹，更喜欢有质量的聊天和稳定的陪伴。',
         '建筑设计师，习惯用相机记录城市。想遇见愿意一起散步、看展，也愿意认真规划未来的人。',
         '咨询行业，工作理性，生活里很爱笑。喜欢咖啡、跑步和探店，期待真诚直接的相处方式。',
         '景观设计师，热爱绿色生活和骑行。希望关系里有分享、有支持，也保留彼此舒服的空间。',
         '工业设计师，喜欢健身和看展。认真寻找长期关系，欣赏有责任感、愿意沟通并保持热爱的人。',
         '研究工作让我保持好奇，闲暇喜欢阅读和旅行。想认识温和坚定、对未来有清晰期待的人。'),
       SHA2(CONCAT(u.openid,':ABOUT_ME'),256),JSON_OBJECT('seedKey',CONCAT(u.openid,':ABOUT_ME'),'showcase',TRUE),
       JSON_OBJECT('decision','approved'),NOW()-INTERVAL 24 DAY,NOW()-INTERVAL 24 DAY,
       JSON_OBJECT('showcase',TRUE),NOW()-INTERVAL 24 DAY,NOW()-INTERVAL 24 DAY,0
FROM app_user u WHERE u.openid LIKE 'RICH-QX-USER-%'
AND NOT EXISTS (SELECT 1 FROM app_user_audit_record r WHERE r.user_id=u.id AND r.audit_type='ABOUT_ME' AND JSON_UNQUOTE(JSON_EXTRACT(r.material_json,'$.seedKey'))=CONCAT(u.openid,':ABOUT_ME'));

-- 目标账号偏好覆盖北京 20–30 岁，确保实时推荐和理想型能命中上述候选。
INSERT INTO ct_recommend_preference (
  user_id,target_city_codes,allow_neighbor_city,min_age,max_age,min_height,max_height,min_weight,max_weight,
  education_codes,hometowns,school_codes,major_names,version,create_time,update_time,created_by,updated_by,deleted
)
VALUES (@target_user_id,JSON_ARRAY('110100'),0,20,30,NULL,NULL,NULL,NULL,JSON_ARRAY(),JSON_ARRAY(),JSON_ARRAY(),JSON_ARRAY(),1,NOW(),NOW(),@target_user_id,@target_user_id,0)
ON DUPLICATE KEY UPDATE target_city_codes=VALUES(target_city_codes),allow_neighbor_city=0,min_age=20,max_age=30,
  min_height=NULL,max_height=NULL,min_weight=NULL,max_weight=NULL,education_codes=JSON_ARRAY(),hometowns=JSON_ARRAY(),
  school_codes=JSON_ARRAY(),major_names=JSON_ARRAY(),version=GREATEST(version,1),update_time=NOW(),updated_by=@target_user_id,deleted=0;

-- 三天回看：每一天 4 人，使用 detail/skip/like，避免消耗今天的 view 额度。
INSERT INTO ct_recommend_view_log (
  event_no,request_id,user_id,candidate_user_id,scene,filter_version,snapshot_no,action,position,viewed_at,
  create_time,update_time,created_by,updated_by,deleted
)
SELECT CONCAT('RICH-QX-REPLAY-',LPAD(seq.seq,2,'0')),
       CONCAT('RICH-QX-REPLAY-REQ-',LPAD(seq.seq,2,'0')),@target_user_id,u.id,'recommend',1,NULL,
       ELT(MOD(seq.seq-1,3)+1,'detail','skip','like'),seq.seq,
       NOW()-INTERVAL FLOOR((seq.seq-1)/4) DAY-INTERVAL (seq.seq*17) MINUTE,
       NOW(),NOW(),@target_user_id,@target_user_id,0
FROM (
  SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
  UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
) seq JOIN app_user u ON u.openid=CONCAT('RICH-QX-USER-',LPAD(seq.seq,2,'0'))
ON DUPLICATE KEY UPDATE candidate_user_id=VALUES(candidate_user_id),viewed_at=VALUES(viewed_at),action=VALUES(action),update_time=NOW(),deleted=0;

-- 有效理想型筛选快照与 12 个结果，支持列表、换一批和历史记录。
INSERT INTO ct_ideal_filter_snapshot (
  snapshot_no,user_id,request_id,condition_digest,preference_version,target_city_codes,min_age,max_age,
  condition_codes,condition_payload,result_count,status,expires_at,create_time,update_time,created_by,updated_by,deleted
)
VALUES ('RICH-QX-IDEAL-SNAPSHOT-01',@target_user_id,'RICH-QX-IDEAL-REQUEST-01',
        SHA2('RICH-QX-IDEAL-SNAPSHOT-01',256),1,JSON_ARRAY('110100'),20,30,
        JSON_ARRAY('M08-IDEAL-height-165','M08-IDEAL-travel'),
        JSON_OBJECT('cities',JSON_ARRAY('北京'),'age','20-30','conditions',JSON_ARRAY('身高165cm以上','喜欢旅行')),
        12,'active',NOW()+INTERVAL 90 DAY,NOW(),NOW(),@target_user_id,@target_user_id,0)
ON DUPLICATE KEY UPDATE result_count=12,status='active',expires_at=NOW()+INTERVAL 90 DAY,update_time=NOW(),deleted=0;
SET @snapshot_id := (SELECT id FROM ct_ideal_filter_snapshot WHERE snapshot_no='RICH-QX-IDEAL-SNAPSHOT-01' LIMIT 1);

INSERT INTO ct_ideal_snapshot_candidate (
  snapshot_id,item_no,candidate_user_id,sort_time,sort_tie_breaker,matched_condition_codes,
  create_time,update_time,created_by,updated_by,deleted
)
SELECT @snapshot_id,CONCAT('RICH-QX-IDEAL-ITEM-',LPAD(seq.seq,2,'0')),u.id,
       NOW()-INTERVAL seq.seq MINUTE,LPAD(seq.seq,4,'0'),
       CASE WHEN u.height>=165 THEN JSON_ARRAY('M08-IDEAL-height-165','M08-IDEAL-travel') ELSE JSON_ARRAY('M08-IDEAL-travel') END,
       NOW(),NOW(),@target_user_id,@target_user_id,0
FROM (
  SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
  UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
) seq JOIN app_user u ON u.openid=CONCAT('RICH-QX-USER-',LPAD(seq.seq,2,'0'))
ON DUPLICATE KEY UPDATE candidate_user_id=VALUES(candidate_user_id),sort_time=VALUES(sort_time),
  matched_condition_codes=VALUES(matched_condition_codes),update_time=NOW(),deleted=0;

-- 千寻种子清单：RICH-QX-POST-01 RICH-QX-POST-02 RICH-QX-POST-03 RICH-QX-POST-04
-- RICH-QX-POST-05 RICH-QX-POST-06 RICH-QX-POST-07 RICH-QX-POST-08
-- RICH-QX-POST-09 RICH-QX-POST-10 RICH-QX-POST-11 RICH-QX-POST-12
-- 千寻 12 条图文动态：10 个话题全覆盖，含普通动态与诚意贴，多图且发布时间错落。
INSERT INTO community_post (
  post_no,author_id,post_type,source_scene,distribution_scenes,title,content,image_urls,
  topic_id,topic_code,topic_name_snapshot,mention_user_ids,status,audit_status,audit_remark,
  machine_result,machine_code,machine_detail,machine_checked_at,sample_required,version,published_at,
  like_count,comment_count,report_count,read_count,deleted_by_user,create_time,update_time,created_by,updated_by,deleted
)
SELECT CONCAT('RICH-QX-POST-',LPAD(seed.seq,2,'0')),u.id,
       IF(seed.seq IN (2,7),'sincere_post','community_post'),
       IF(seed.seq IN (2,7),'qianxun_zhiyin_sincere','qianxun_chengjia'),
       IF(seed.seq IN (2,7),JSON_ARRAY('zhiyin','home'),JSON_ARRAY('chengjia','home','topic')),
       CASE seed.seq WHEN 2 THEN '认真认识，想和你分享真实生活' WHEN 7 THEN '关于长期关系，我更看重这些' ELSE NULL END,
       ELT(seed.seq,
         '周末去郊外露营，风不大，刚好适合把手机放下半天。有人也喜欢这种松弛的周末吗？',
         '我是一个慢热但真诚的人，工作稳定，也愿意认真经营生活。希望认识同样以长期关系为目标、遇到问题愿意沟通的人。',
         '最近开始固定晨跑，才发现早上的城市很安静。跑完吃一份热早餐，是这周最踏实的小幸福。',
         '下班后沿着胡同走了很久，老建筑和新店铺放在一起很有意思。下次想找个同样爱 city walk 的搭子。',
         '发现一家采光很好的咖啡店，豆子偏坚果调。比起打卡，更喜欢坐下来聊一本书或最近的生活。',
         '周末看了一个关于城市与人的展，最喜欢那句“好的关系让彼此看见更大的世界”。',
         '我期待的长期关系不是时时刻刻黏在一起，而是各自努力，也愿意分享琐碎、共同面对重要选择。认真认识，拒绝消耗。',
         '第一次完成 35 公里骑行，过程比想象中轻松。运动之后的晚风很治愈，准备慢慢解锁北京更多路线。',
         '读书会这期聊的是亲密关系里的边界感。稳定不是没有分歧，而是知道怎么把分歧说清楚。',
         '今天探到一家刚出炉就很好吃的面包店，酸面包和可颂都不错。愿意为了好吃的走远一点。',
         '雨后的公园特别绿，走路时顺手拍了几张。生活不一定每天精彩，但总能找到一点值得记录的东西。',
         '计划下个月去看海，路线还在慢慢做。旅行里最喜欢的不是景点清单，而是和合适的人一起遇见意外。'),
       ELT(seed.seq,
         JSON_ARRAY(@img_camp,@img_green,@img_lake),JSON_ARRAY(@img_lake,@img_city),JSON_ARRAY(@img_green,@img_cycling),
         JSON_ARRAY(@img_city,@img_museum,@img_coffee),JSON_ARRAY(@img_coffee,@img_book),JSON_ARRAY(@img_museum,@img_city),
         JSON_ARRAY(@img_book,@img_lake,@img_green),JSON_ARRAY(@img_cycling,@img_city),JSON_ARRAY(@img_book,@img_coffee),
         JSON_ARRAY(@img_bakery,@img_coffee),JSON_ARRAY(@img_green,@img_hiking),JSON_ARRAY(@img_lake,@img_camp,@img_city)),
       t.id,t.topic_code,t.topic_name,NULL,'published','APPROVED','生产感种子内容，已人工确认',
       'pass','SHOWCASE_PASS','图片与文本均为项目测试素材',NOW(),0,1,
       NOW()-INTERVAL seed.seq HOUR,0,0,0,120+seed.seq*37,0,
       NOW()-INTERVAL seed.seq HOUR,NOW(),u.id,u.id,0
FROM (
  SELECT 1 seq,'camp' topic_code UNION ALL SELECT 2,'serious_love' UNION ALL SELECT 3,'weekend_buddy'
  UNION ALL SELECT 4,'city_walk' UNION ALL SELECT 5,'coffee_chat' UNION ALL SELECT 6,'museum_date'
  UNION ALL SELECT 7,'serious_love' UNION ALL SELECT 8,'cycling_club' UNION ALL SELECT 9,'book_club'
  UNION ALL SELECT 10,'food_hunt' UNION ALL SELECT 11,'hiking_buddy' UNION ALL SELECT 12,'weekend_buddy'
) seed
JOIN app_user u ON u.openid=CONCAT('RICH-QX-USER-',LPAD(seed.seq,2,'0'))
JOIN community_topic t ON t.topic_code=seed.topic_code AND t.deleted=0
ON DUPLICATE KEY UPDATE author_id=VALUES(author_id),post_type=VALUES(post_type),source_scene=VALUES(source_scene),
  distribution_scenes=VALUES(distribution_scenes),title=VALUES(title),content=VALUES(content),image_urls=VALUES(image_urls),
  topic_id=VALUES(topic_id),topic_code=VALUES(topic_code),topic_name_snapshot=VALUES(topic_name_snapshot),
  status='published',audit_status='APPROVED',published_at=VALUES(published_at),read_count=VALUES(read_count),
  update_time=NOW(),deleted_by_user=0,deleted=0;

-- 评论种子清单：RICH-QX-COMMENT-01 至 RICH-QX-COMMENT-24。
-- 每条动态 1 条顶层评论 + 1 条作者回复，共 24 条；体现真实楼中楼。
INSERT INTO community_comment (
  comment_no,post_id,author_id,parent_comment_id,reply_user_id,content,status,audit_status,audit_remark,
  machine_result,machine_code,machine_detail,machine_checked_at,version,published_at,report_count,like_count,
  create_time,update_time,created_by,updated_by,deleted
)
SELECT CONCAT('RICH-QX-COMMENT-',LPAD(seed.seq*2-1,2,'0')),p.id,commenter.id,NULL,NULL,
       ELT(seed.seq,'这个周末氛围看起来太好了，帐篷颜色也很治愈。','认真且有边界感的表达很打动人。','晨跑路线可以分享一下吗？','胡同路线很适合慢慢走。','这家店的光线确实很舒服。','我也看了这个展，结尾很有力量。','长期关系里能一起解决问题真的重要。','35 公里很厉害，下次可以约骑。','同意，边界感反而让关系更稳定。','看起来很香，已经收藏。','雨后的绿色让人心情变好。','看海计划听起来很棒。'),
       'published','APPROVED','种子评论已审核','pass','SHOWCASE_PASS','文本通过',NOW(),1,
       p.published_at+INTERVAL 12 MINUTE,0,2+MOD(seed.seq,4),p.published_at+INTERVAL 12 MINUTE,NOW(),commenter.id,commenter.id,0
FROM (
  SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
  UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
) seed
JOIN community_post p ON p.post_no=CONCAT('RICH-QX-POST-',LPAD(seed.seq,2,'0'))
JOIN app_user commenter ON commenter.openid=CONCAT('RICH-QX-USER-',LPAD(MOD(seed.seq+2,12)+1,2,'0'))
ON DUPLICATE KEY UPDATE content=VALUES(content),status='published',audit_status='APPROVED',update_time=NOW(),deleted=0;

INSERT INTO community_comment (
  comment_no,post_id,author_id,parent_comment_id,reply_user_id,content,status,audit_status,audit_remark,
  machine_result,machine_code,machine_detail,machine_checked_at,version,published_at,report_count,like_count,
  create_time,update_time,created_by,updated_by,deleted
)
SELECT CONCAT('RICH-QX-COMMENT-',LPAD(seed.seq*2,2,'0')),p.id,p.author_id,parent.id,parent.author_id,
       ELT(seed.seq,'谢谢，天气好的时候一起出发。','谢谢认真看完，希望大家都能遇见舒服的关系。','可以呀，我整理好路线发在动态里。','下次准备走一条更安静的路线。','周末上午人少，很适合聊天。','是的，好的作品会让人想很久。','没错，愿意沟通比完美更重要。','安排，下周看看天气。','很喜欢这种彼此尊重的状态。','下次再分享几家私藏店。','抬头看看，普通一天也会有惊喜。','做完攻略会再来分享。'),
       'published','APPROVED','种子回复已审核','pass','SHOWCASE_PASS','文本通过',NOW(),1,
       p.published_at+INTERVAL 26 MINUTE,0,1+MOD(seed.seq,3),p.published_at+INTERVAL 26 MINUTE,NOW(),p.author_id,p.author_id,0
FROM (
  SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
  UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
) seed
JOIN community_post p ON p.post_no=CONCAT('RICH-QX-POST-',LPAD(seed.seq,2,'0'))
JOIN community_comment parent ON parent.comment_no=CONCAT('RICH-QX-COMMENT-',LPAD(seed.seq*2-1,2,'0'))
ON DUPLICATE KEY UPDATE parent_comment_id=VALUES(parent_comment_id),reply_user_id=VALUES(reply_user_id),
  content=VALUES(content),status='published',audit_status='APPROVED',update_time=NOW(),deleted=0;

-- 每条动态 5 个赞、每个顶层评论 2 个赞；关注和浏览历史补齐互动页。
INSERT INTO community_like (post_id,user_id,status,create_time,update_time,created_by,updated_by,deleted)
SELECT p.id,u.id,'ENABLED',p.published_at+INTERVAL liker.seq MINUTE,NOW(),u.id,u.id,0
FROM community_post p JOIN (
  SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) liker JOIN app_user u ON u.openid=CONCAT('RICH-QX-USER-',LPAD(MOD(p.id+liker.seq,12)+1,2,'0'))
WHERE p.post_no LIKE 'RICH-QX-POST-%'
ON DUPLICATE KEY UPDATE status='ENABLED',update_time=NOW(),deleted=0;

INSERT INTO community_comment_like (comment_id,user_id,status,active_marker,create_time,update_time,created_by,updated_by,deleted)
SELECT c.id,u.id,'enabled',1,c.published_at+INTERVAL liker.seq MINUTE,NOW(),u.id,u.id,0
FROM community_comment c JOIN (SELECT 1 seq UNION ALL SELECT 2) liker
JOIN app_user u ON u.openid=CONCAT('RICH-QX-USER-',LPAD(MOD(c.id+liker.seq,12)+1,2,'0'))
WHERE c.comment_no LIKE 'RICH-QX-COMMENT-%' AND MOD(CAST(RIGHT(c.comment_no,2) AS UNSIGNED),2)=1
ON DUPLICATE KEY UPDATE status='enabled',active_marker=1,update_time=NOW(),deleted=0;

INSERT INTO community_follow (follower_id,target_user_id,status,create_time,update_time,created_by,updated_by,deleted)
SELECT @target_user_id,u.id,'FOLLOW',NOW()-INTERVAL seq.seq DAY,NOW(),@target_user_id,@target_user_id,0
FROM (SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) seq
JOIN app_user u ON u.openid=CONCAT('RICH-QX-USER-',LPAD(seq.seq,2,'0'))
ON DUPLICATE KEY UPDATE status='FOLLOW',update_time=NOW(),deleted=0;

INSERT INTO community_view_history (user_id,post_id,viewed_at,create_time,update_time,created_by,updated_by,deleted)
SELECT @target_user_id,p.id,NOW()-INTERVAL seed.seq HOUR,NOW(),NOW(),@target_user_id,@target_user_id,0
FROM (
  SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
  UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
) seed JOIN community_post p ON p.post_no=CONCAT('RICH-QX-POST-',LPAD(seed.seq,2,'0'))
ON DUPLICATE KEY UPDATE viewed_at=VALUES(viewed_at),update_time=NOW(),deleted=0;

-- 回填动态、评论计数，确保 UI 与真实关系表一致。
UPDATE community_post p SET
  p.like_count=(SELECT COUNT(*) FROM community_like l WHERE l.post_id=p.id AND l.status='ENABLED' AND l.deleted=0),
  p.comment_count=(SELECT COUNT(*) FROM community_comment c WHERE c.post_id=p.id AND c.status='published' AND c.deleted=0),
  p.update_time=NOW()
WHERE p.post_no LIKE 'RICH-QX-POST-%';

UPDATE community_comment c SET
  c.like_count=(SELECT COUNT(*) FROM community_comment_like l WHERE l.comment_id=c.id AND l.status='enabled' AND l.deleted=0),
  c.update_time=NOW()
WHERE c.comment_no LIKE 'RICH-QX-COMMENT-%';

-- 心动：8 条喜欢我的、8 条我喜欢的；前 3 人双向喜欢形成匹配。
INSERT INTO app_relation_like (
  like_no,request_id,from_user_id,to_user_id,source_scene,like_status,active_marker,liked_time,
  create_time,update_time,created_by,updated_by,deleted
)
SELECT CONCAT('RICH-QX-LIKE-IN-',LPAD(seed.seq,2,'0')),CONCAT('RICH-QX-LIKE-IN-REQ-',LPAD(seed.seq,2,'0')),
       u.id,@target_user_id,ELT(MOD(seed.seq-1,4)+1,'featured','ideal','profile','likes_me'),'active',1,
       NOW()-INTERVAL seed.seq HOUR,NOW()-INTERVAL seed.seq HOUR,NOW(),u.id,u.id,0
FROM (SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8) seed
JOIN app_user u ON u.openid=CONCAT('RICH-QX-USER-',LPAD(seed.seq,2,'0'))
ON DUPLICATE KEY UPDATE source_scene=VALUES(source_scene),like_status='active',active_marker=1,liked_time=VALUES(liked_time),
  cancelled_time=NULL,invalid_reason=NULL,invalid_time=NULL,update_time=NOW(),deleted=0;

INSERT INTO app_relation_like (
  like_no,request_id,from_user_id,to_user_id,source_scene,like_status,active_marker,liked_time,
  create_time,update_time,created_by,updated_by,deleted
)
SELECT CONCAT('RICH-QX-LIKE-OUT-',LPAD(seed.seq,2,'0')),CONCAT('RICH-QX-LIKE-OUT-REQ-',LPAD(seed.seq,2,'0')),
       @target_user_id,u.id,ELT(MOD(seed.seq-1,4)+1,'profile','ideal','fate','recent_viewers'),'active',1,
       NOW()-INTERVAL (seed.seq+2) HOUR,NOW()-INTERVAL (seed.seq+2) HOUR,NOW(),@target_user_id,@target_user_id,0
FROM (SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8) seed
JOIN app_user u ON u.openid=CONCAT('RICH-QX-USER-',LPAD(IF(seed.seq<=4,seed.seq,seed.seq+4),2,'0'))
ON DUPLICATE KEY UPDATE source_scene=VALUES(source_scene),like_status='active',active_marker=1,liked_time=VALUES(liked_time),
  cancelled_time=NULL,invalid_reason=NULL,invalid_time=NULL,update_time=NOW(),deleted=0;

INSERT INTO app_relation_like_inbox_state (
  user_id,last_read_liked_time,last_read_like_id,read_at,create_time,update_time,created_by,updated_by,deleted
)
SELECT @target_user_id,l.liked_time,l.id,NOW()-INTERVAL 4 HOUR,NOW(),NOW(),@target_user_id,@target_user_id,0
FROM app_relation_like l WHERE l.like_no='RICH-QX-LIKE-IN-05'
ON DUPLICATE KEY UPDATE last_read_liked_time=VALUES(last_read_liked_time),last_read_like_id=VALUES(last_read_like_id),
  read_at=VALUES(read_at),update_time=NOW(),deleted=0;

-- 10 位访客及访问事件/游标，时间覆盖今天和最近 7 天。
INSERT INTO app_relation_visit (
  visit_no,visitor_user_id,target_user_id,source_scene,visit_status,first_visit_time,last_visit_time,pv_count,
  create_time,update_time,created_by,updated_by,deleted
)
SELECT CONCAT('RICH-QX-VISIT-',LPAD(seed.seq,2,'0')),u.id,@target_user_id,
       ELT(MOD(seed.seq-1,5)+1,'profile','featured','ideal','likes_me','recent_viewers'),'visible',
       NOW()-INTERVAL seed.seq DAY,NOW()-INTERVAL (seed.seq*3) HOUR,1+MOD(seed.seq,4),
       NOW()-INTERVAL seed.seq DAY,NOW(),u.id,u.id,0
FROM (SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) seed
JOIN app_user u ON u.openid=CONCAT('RICH-QX-USER-',LPAD(seed.seq,2,'0'))
ON DUPLICATE KEY UPDATE source_scene=VALUES(source_scene),visit_status='visible',first_visit_time=VALUES(first_visit_time),
  last_visit_time=VALUES(last_visit_time),pv_count=VALUES(pv_count),invalid_reason=NULL,invalid_time=NULL,update_time=NOW(),deleted=0;

INSERT INTO app_relation_visit_event (
  event_no,visit_id,visitor_user_id,target_user_id,source_scene,visit_time,
  create_time,update_time,created_by,updated_by,deleted
)
SELECT CONCAT('RICH-QX-VISIT-EVENT-',LPAD(seed.seq,2,'0')),v.id,v.visitor_user_id,v.target_user_id,v.source_scene,
       v.last_visit_time,v.last_visit_time,NOW(),v.visitor_user_id,v.visitor_user_id,0
FROM (SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10) seed
JOIN app_relation_visit v ON v.visit_no=CONCAT('RICH-QX-VISIT-',LPAD(seed.seq,2,'0'))
ON DUPLICATE KEY UPDATE visit_id=VALUES(visit_id),visit_time=VALUES(visit_time),update_time=NOW(),deleted=0;

INSERT INTO app_relation_visit_cursor (
  visitor_user_id,target_user_id,current_visit_id,last_visit_time,create_time,update_time,created_by,updated_by,deleted
)
SELECT v.visitor_user_id,v.target_user_id,v.id,v.last_visit_time,NOW(),NOW(),v.visitor_user_id,v.visitor_user_id,0
FROM app_relation_visit v WHERE v.visit_no LIKE 'RICH-QX-VISIT-%'
ON DUPLICATE KEY UPDATE current_visit_id=VALUES(current_visit_id),last_visit_time=VALUES(last_visit_time),update_time=NOW(),deleted=0;

-- 前 4 位双向喜欢形成 4 组互相心动。
INSERT INTO app_relation_match (
  match_no,user_low_id,user_high_id,primary_source,match_status,active_marker,matched_time,
  create_time,update_time,created_by,updated_by,deleted
)
SELECT CONCAT('RICH-QX-MATCH-',LPAD(seed.seq,2,'0')),LEAST(@target_user_id,u.id),GREATEST(@target_user_id,u.id),
       'double_like','matched',1,NOW()-INTERVAL seed.seq HOUR,NOW()-INTERVAL seed.seq HOUR,NOW(),NULL,NULL,0
FROM (SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) seed
JOIN app_user u ON u.openid=CONCAT('RICH-QX-USER-',LPAD(seed.seq,2,'0'))
ON DUPLICATE KEY UPDATE match_status='matched',active_marker=1,matched_time=VALUES(matched_time),
  invalid_reason=NULL,invalid_time=NULL,update_time=NOW(),deleted=0;

INSERT INTO app_relation_match_source (
  source_no,match_id,source_type,source_event_no,source_status,effective_time,
  create_time,update_time,created_by,updated_by,deleted
)
SELECT CONCAT('RICH-QX-MATCH-SOURCE-',LPAD(seed.seq,2,'0')),m.id,'double_like',
       CONCAT('RICH-QX-LIKE-IN-',LPAD(seed.seq,2,'0')),'active',m.matched_time,m.matched_time,NOW(),NULL,NULL,0
FROM (SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) seed
JOIN app_relation_match m ON m.match_no=CONCAT('RICH-QX-MATCH-',LPAD(seed.seq,2,'0'))
ON DUPLICATE KEY UPDATE match_id=VALUES(match_id),source_status='active',effective_time=VALUES(effective_time),
  revoked_time=NULL,invalid_reason=NULL,update_time=NOW(),deleted=0;

INSERT INTO app_relation_match_popup (
  match_id,match_no,user_id,popup_status,delivered_time,read_time,read_action,cancelled_time,
  create_time,update_time,created_by,updated_by,deleted
)
SELECT m.id,m.match_no,popup.user_id,'read',m.matched_time+INTERVAL 1 MINUTE,m.matched_time+INTERVAL 3 MINUTE,
       IF(popup.user_id=@target_user_id,'profile','close'),NULL,m.matched_time,NOW(),popup.user_id,popup.user_id,0
FROM app_relation_match m
JOIN (
  SELECT @target_user_id user_id,1 seq UNION ALL SELECT @target_user_id,2 UNION ALL
  SELECT @target_user_id,3 UNION ALL SELECT @target_user_id,4 UNION ALL
  SELECT u.id,seed.seq FROM (SELECT 1 seq UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4) seed
  JOIN app_user u ON u.openid=CONCAT('RICH-QX-USER-',LPAD(seed.seq,2,'0'))
) popup ON m.match_no=CONCAT('RICH-QX-MATCH-',LPAD(popup.seq,2,'0'))
ON DUPLICATE KEY UPDATE popup_status='read',delivered_time=VALUES(delivered_time),read_time=VALUES(read_time),
  read_action=VALUES(read_action),cancelled_time=NULL,update_time=NOW(),deleted=0;

COMMIT;

-- =============================================================
-- 执行后核验：期望 12 / 12 / 12 / 24 / 8 / 8 / 10 / 4。
-- =============================================================
SELECT 'recommend_candidates' AS metric, COUNT(*) AS total
FROM app_user u
WHERE u.openid LIKE 'RICH-QX-USER-%' AND u.deleted=0 AND u.account_status='NORMAL'
  AND u.first_login_completed=1 AND u.gender='FEMALE' AND u.location_city='110100' AND u.age BETWEEN 20 AND 30
  AND (SELECT COUNT(DISTINCT r.audit_type) FROM app_user_audit_record r
       WHERE r.user_id=u.id AND r.audit_type IN ('REAL_NAME','AVATAR','EDUCATION')
         AND r.status='APPROVED' AND r.deleted=0)=3
UNION ALL SELECT 'recommend_replay',COUNT(*) FROM ct_recommend_view_log WHERE event_no LIKE 'RICH-QX-REPLAY-%' AND deleted=0
UNION ALL SELECT 'qianxun_posts',COUNT(*) FROM community_post WHERE post_no LIKE 'RICH-QX-POST-%' AND status='published' AND deleted=0
UNION ALL SELECT 'qianxun_comments',COUNT(*) FROM community_comment WHERE comment_no LIKE 'RICH-QX-COMMENT-%' AND status='published' AND deleted=0
UNION ALL SELECT 'heart_incoming_likes',COUNT(*) FROM app_relation_like WHERE like_no LIKE 'RICH-QX-LIKE-IN-%' AND like_status='active' AND deleted=0
UNION ALL SELECT 'heart_outgoing_likes',COUNT(*) FROM app_relation_like WHERE like_no LIKE 'RICH-QX-LIKE-OUT-%' AND like_status='active' AND deleted=0
UNION ALL SELECT 'heart_visitors',COUNT(*) FROM app_relation_visit WHERE visit_no LIKE 'RICH-QX-VISIT-%' AND visit_status='visible' AND deleted=0
UNION ALL SELECT 'heart_matches',COUNT(*) FROM app_relation_match WHERE match_no LIKE 'RICH-QX-MATCH-%' AND match_status='matched' AND deleted=0;
