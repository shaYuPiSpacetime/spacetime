-- ======================================================
-- PRD01 认证强引导与未认证部分完成态文案
-- 所有认证流程文案由 prd01.copy.rules 动态下发；仅追加缺失 key，不覆盖后台已有配置。
-- 可重复执行。
-- ======================================================

INSERT INTO app_config (config_key, config_value, config_group, config_type, public_visible, status, remark)
SELECT 'prd01.copy.rules', '{"rows":[]}', 'PRD01_AUDIT', 'JSON', 0, 'ENABLED', '认证流程文案配置'
WHERE NOT EXISTS (SELECT 1 FROM app_config WHERE config_key = 'prd01.copy.rules' AND deleted = 0);

SET @prd01_onboarding_copy = '{"rows":[
  {"group":"认证强引导","scene":"主标题","copyKey":"verification_onboarding_heading","content":"完善资料和认证","enabled":true},
  {"group":"认证强引导","scene":"说明","copyKey":"verification_onboarding_notice","content":"时空邂逅是一个严肃、靠谱的交友平台，请认真填写资料","enabled":true},
  {"group":"认证强引导","scene":"步骤-基本资料","copyKey":"verification_step_basic","content":"基本资料","enabled":true},
  {"group":"认证强引导","scene":"步骤-添加头像","copyKey":"verification_step_avatar","content":"添加头像","enabled":true},
  {"group":"认证强引导","scene":"步骤-自我介绍","copyKey":"verification_step_intro","content":"自我介绍","enabled":true},
  {"group":"认证强引导","scene":"步骤-三重认证","copyKey":"verification_step_triple","content":"三重认证","enabled":true},
  {"group":"认证强引导","scene":"下一步","copyKey":"verification_next_action","content":"下一步","enabled":true},
  {"group":"认证拦截页","scene":"初始态第二行标题","copyKey":"verification_home_initial_heading_line2","content":"解锁更多专属权益","enabled":true},
  {"group":"认证拦截页","scene":"初始态说明","copyKey":"verification_home_initial_notice","content":"资料信息越完整，脱单邂逅更高效","enabled":true},
  {"group":"认证拦截页","scene":"部分完成态说明","copyKey":"verification_home_partial_notice","content":"拦不住不真诚、资料虚假的用户，营造严肃靠谱的交友环境","enabled":true},
  {"group":"认证拦截页","scene":"基本资料标题","copyKey":"verification_home_basic_title","content":"基本资料","enabled":true},
  {"group":"认证拦截页","scene":"基本资料说明","copyKey":"verification_home_basic_desc","content":"快速了解，提高匹配效率","enabled":true},
  {"group":"认证拦截页","scene":"头像简介标题","copyKey":"verification_home_avatar_intro_title","content":"头像简介","enabled":true},
  {"group":"认证拦截页","scene":"头像简介说明","copyKey":"verification_home_avatar_intro_desc","content":"真实友好，获得有效曝光","enabled":true},
  {"group":"认证拦截页","scene":"三重认证标题","copyKey":"verification_home_triple_title","content":"三重认证","enabled":true},
  {"group":"认证拦截页","scene":"三重认证说明","copyKey":"verification_home_triple_desc","content":"头像·实名·学历认证，严肃认真","enabled":true},
  {"group":"认证拦截页","scene":"主按钮","copyKey":"verification_home_primary_action","content":"立即完善","enabled":true},
  {"group":"认证拦截页","scene":"稍后操作","copyKey":"verification_home_later_action","content":"稍后再说","enabled":true},
  {"group":"头像认证","scene":"头像引导标题","copyKey":"avatar_guide_title","content":"选一张你满意的头像","enabled":true},
  {"group":"头像认证","scene":"本人照片规则","copyKey":"avatar_rule_self","content":"本人照片","enabled":true},
  {"group":"头像认证","scene":"清晰长相规则","copyKey":"avatar_rule_clear","content":"能看清长相","enabled":true},
  {"group":"头像认证","scene":"最佳展示规则","copyKey":"avatar_rule_best","content":"展示完美的你","enabled":true},
  {"group":"头像认证","scene":"不通过标题","copyKey":"avatar_invalid_title","content":"以下照片不能通过审核","enabled":true},
  {"group":"头像认证","scene":"非人物照","copyKey":"avatar_invalid_non_person","content":"非人物照","enabled":true},
  {"group":"头像认证","scene":"风景照","copyKey":"avatar_invalid_landscape","content":"风景照","enabled":true},
  {"group":"头像认证","scene":"模糊遮挡","copyKey":"avatar_invalid_blurred","content":"模糊遮挡","enabled":true},
  {"group":"头像认证","scene":"无正脸","copyKey":"avatar_invalid_no_face","content":"无正脸","enabled":true},
  {"group":"头像认证","scene":"选择照片按钮","copyKey":"avatar_choose_action","content":"知道了，去选照片","enabled":true},
  {"group":"自我介绍认证","scene":"区域标题","copyKey":"intro_section_title","content":"自我描述","enabled":true},
  {"group":"自我介绍认证","scene":"输入提示","copyKey":"intro_placeholder","content":"简单描述下自己是怎么一个人，性格、习惯、爱好、优点、缺点等，不少于20字","enabled":true},
  {"group":"自我介绍认证","scene":"最少字数提示","copyKey":"intro_minimum_hint","content":"最少20字","enabled":true},
  {"group":"三重认证","scene":"安全说明","copyKey":"triple_safety_notice","content":"确保信息真实才可在平台交友，与官方数据联网比对，承诺保障信息安全","enabled":true}
]}';

UPDATE app_config AS target
SET config_value = JSON_SET(
        COALESCE(target.config_value, JSON_OBJECT()),
        '$.rows',
        JSON_MERGE_PRESERVE(
            COALESCE(JSON_EXTRACT(target.config_value, '$.rows'), JSON_ARRAY()),
            COALESCE((
                SELECT JSON_ARRAYAGG(
                    JSON_EXTRACT(@prd01_onboarding_copy, CONCAT('$.rows[', defaults_row.row_no - 1, ']'))
                )
                FROM JSON_TABLE(
                    @prd01_onboarding_copy,
                    '$.rows[*]' COLUMNS (
                        row_no FOR ORDINALITY,
                        copy_key VARCHAR(128) PATH '$.copyKey'
                    )
                ) AS defaults_row
                WHERE JSON_SEARCH(target.config_value, 'one', defaults_row.copy_key, NULL, '$.rows[*].copyKey') IS NULL
            ), JSON_ARRAY())
        )
    ),
    update_time = CURRENT_TIMESTAMP
WHERE target.config_key = 'prd01.copy.rules'
  AND target.deleted = 0;

SET @prd01_onboarding_copy = NULL;
