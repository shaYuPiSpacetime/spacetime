package com.spacetime.miniapp.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.spacetime.common.dao.AppConfigDao;
import com.spacetime.common.dao.AppUserDao;
import com.spacetime.common.entity.AppConfig;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.service.ProfileDictionaryService;
import com.spacetime.common.service.RelationAccessProjectionService;
import com.spacetime.miniapp.dto.request.MeetingPreferenceSaveReq;
import com.spacetime.miniapp.dto.response.MeetingPreferenceOptionVO;
import com.spacetime.miniapp.dto.response.MeetingPreferenceVO;
import com.spacetime.miniapp.service.MeetingPreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/** 见面偏好资料服务实现。 */
@Service
@RequiredArgsConstructor
public class MeetingPreferenceServiceImpl implements MeetingPreferenceService {
    private static final String MEETING_DICT = "meeting_preference";
    private static final String ACTIVITY_DICT = "preferred_activity";
    private static final String MAX_ACTIVITIES_KEY = "prd01.profile.preferredActivities.maxCount";
    private static final int DEFAULT_MAX_ACTIVITIES = 6;

    private final AppUserDao appUserDao;
    private final AppConfigDao appConfigDao;
    private final ProfileDictionaryService profileDictionaryService;
    private final RelationAccessProjectionService accessProjectionService;

    @Override
    public MeetingPreferenceVO get(Long userId) {
        return toVO(requireOpenUser(userId));
    }

    @Override
    @Transactional
    public MeetingPreferenceVO save(Long userId, MeetingPreferenceSaveReq req) {
        AppUser user = requireOpenUser(userId);
        if (req == null) {
            throw new BusinessException(400, "见面偏好参数有误");
        }
        List<String> activities = normalize(req.getPreferredActivities());
        int maxActivities = maxActivities();
        if (activities.size() > maxActivities) {
            throw new BusinessException(400, "喜欢的见面活动最多选择 " + maxActivities + " 项");
        }
        String meetingPreference = StrUtil.trim(req.getMeetingPreference());
        if (StrUtil.isNotBlank(meetingPreference)) {
            meetingPreference = profileDictionaryService.requireCode(
                    MEETING_DICT, meetingPreference, "见面偏好");
        } else {
            meetingPreference = null;
        }
        List<String> validatedActivities = activities.stream()
                .map(code -> profileDictionaryService.requireCode(ACTIVITY_DICT, code, "见面活动"))
                .toList();

        user.setMeetingPreference(meetingPreference);
        user.setPreferredActivities(JSONUtil.toJsonStr(validatedActivities));
        user.setUpdateTime(LocalDateTime.now());
        appUserDao.updateById(user);
        return toVO(user);
    }

    private AppUser requireOpenUser(Long userId) {
        AppUser user = userId == null ? null : appUserDao.selectById(userId);
        if (user == null || !"OPEN".equals(accessProjectionService.project(user))) {
            throw new BusinessException(403, "完成资料和三项认证后即可设置见面偏好");
        }
        return user;
    }

    private MeetingPreferenceVO toVO(AppUser user) {
        MeetingPreferenceVO vo = new MeetingPreferenceVO();
        List<String> selectedActivities = parseList(user.getPreferredActivities());
        vo.setMeetingPreference(user.getMeetingPreference());
        vo.setPreferredActivities(selectedActivities);
        vo.setMaxActivities(maxActivities());
        vo.setUpdatedAt(user.getUpdateTime());
        try {
            List<MeetingPreferenceOptionVO> meetingOptions = options(MEETING_DICT);
            List<MeetingPreferenceOptionVO> activityOptions = options(ACTIVITY_DICT);
            appendDisabledHistory(meetingOptions, user.getMeetingPreference(), MEETING_DICT);
            for (String selected : selectedActivities) {
                appendDisabledHistory(activityOptions, selected, ACTIVITY_DICT);
            }
            Map<String, String> meetingLabels = labels(meetingOptions);
            Map<String, String> activityLabels = labels(activityOptions);
            vo.setMeetingPreferenceLabel(meetingLabels.get(user.getMeetingPreference()));
            vo.setPreferredActivityLabels(selectedActivities.stream()
                    .map(code -> activityLabels.getOrDefault(code, code)).toList());
            vo.setMeetingPreferenceOptions(meetingOptions);
            vo.setPreferredActivityOptions(activityOptions);
            vo.setDictionaryAvailable(true);
        } catch (RuntimeException ignored) {
            // 字典服务异常时保留历史 code，只读降级，禁止客户端保存覆盖。
            vo.setMeetingPreferenceLabel(user.getMeetingPreference());
            vo.setPreferredActivityLabels(selectedActivities);
            vo.setMeetingPreferenceOptions(List.of());
            vo.setPreferredActivityOptions(List.of());
            vo.setDictionaryAvailable(false);
        }
        return vo;
    }

    private List<MeetingPreferenceOptionVO> options(String dictType) {
        List<SysDictData> rows = profileDictionaryService.options(dictType);
        if (rows == null) {
            return new ArrayList<>();
        }
        return new ArrayList<>(rows.stream()
                .map(item -> new MeetingPreferenceOptionVO(
                        item.getDictValue(), item.getDictLabel(), true))
                .toList());
    }

    private void appendDisabledHistory(List<MeetingPreferenceOptionVO> options,
                                       String selectedCode,
                                       String dictType) {
        if (StrUtil.isBlank(selectedCode)
                || options.stream().anyMatch(item -> selectedCode.equals(item.getCode()))) {
            return;
        }
        String label;
        try {
            label = profileDictionaryService.label(dictType, selectedCode);
        } catch (RuntimeException ignored) {
            label = selectedCode;
        }
        options.add(new MeetingPreferenceOptionVO(selectedCode, label, false));
    }

    private Map<String, String> labels(List<MeetingPreferenceOptionVO> options) {
        Map<String, String> labels = new LinkedHashMap<>();
        for (MeetingPreferenceOptionVO item : options) {
            labels.put(item.getCode(), item.getLabel());
        }
        return labels;
    }

    private int maxActivities() {
        List<AppConfig> configs = appConfigDao.selectByKeys(List.of(MAX_ACTIVITIES_KEY));
        if (configs == null || configs.isEmpty()) {
            return DEFAULT_MAX_ACTIVITIES;
        }
        try {
            return Math.max(1, Integer.parseInt(configs.get(0).getConfigValue()));
        } catch (NumberFormatException ignored) {
            return DEFAULT_MAX_ACTIVITIES;
        }
    }

    private List<String> normalize(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return new LinkedHashSet<>(values.stream()
                .map(StrUtil::trim)
                .filter(StrUtil::isNotBlank)
                .toList()).stream().toList();
    }

    private List<String> parseList(String json) {
        if (StrUtil.isBlank(json)) {
            return List.of();
        }
        try {
            return JSONUtil.parseArray(json).toList(String.class);
        } catch (RuntimeException ignored) {
            return List.of();
        }
    }
}
