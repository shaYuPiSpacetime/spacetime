package com.spacetime.miniapp.service.impl;

import com.spacetime.common.constant.ProfileDictType;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.miniapp.dto.response.DictOptionVO;
import com.spacetime.miniapp.dto.response.ProfileTagGroupVO;
import com.spacetime.miniapp.dto.response.RegionOptionVO;
import com.spacetime.miniapp.dto.response.RegionTreeVO;
import com.spacetime.miniapp.service.MiniappDictService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** 移动端公开字典服务实现。 */
@Service
@RequiredArgsConstructor
public class MiniappDictServiceImpl implements MiniappDictService {

    /** 中国大陆省市区字典类型编码。 */
    private static final String CHINA_REGION_DICT_TYPE = "china_region";

    private final DictDataDao dictDataDao;

    /** 每次只读取一个层级，避免首屏返回完整省市区树。 */
    @Override
    public List<RegionOptionVO> locations(String parentCode) {
        Long parentId = 0L;
        String level = "PROVINCE";
        if (StringUtils.hasText(parentCode)) {
            SysDictData parent = dictDataDao.selectEnabledByTypeAndValue(
                    CHINA_REGION_DICT_TYPE, parentCode.trim());
            if (parent == null) {
                return Collections.emptyList();
            }
            parentId = parent.getId();
            level = parent.getParentId() != null && parent.getParentId() == 0L
                    ? "CITY"
                    : "DISTRICT";
        }

        final String resultLevel = level;
        return dictDataDao.selectChildren(CHINA_REGION_DICT_TYPE, parentId, true)
                .stream()
                .map(item -> toOption(item, resultLevel))
                .toList();
    }

    /** 一次性返回省市两级，供小程序省市选择器使用；区县仍走懒加载接口。 */
    @Override
    public List<RegionTreeVO> twoLevelLocations() {
        List<SysDictData> regions = dictDataDao.selectByDictType(CHINA_REGION_DICT_TYPE);
        Map<Long, RegionTreeVO> provincesById = new LinkedHashMap<>();
        for (SysDictData item : regions) {
            if (Objects.equals(item.getParentId(), 0L)) {
                provincesById.put(item.getId(), toTreeNode(item, "PROVINCE"));
            }
        }
        for (SysDictData item : regions) {
            RegionTreeVO province = provincesById.get(item.getParentId());
            if (province != null) {
                province.getChildren().add(toTreeNode(item, "CITY"));
            }
        }
        return List.copyOf(provincesById.values());
    }

    /** 基础资料字典选项数量较小，一次返回可减少首登和资料编辑页请求次数。 */
    @Override
    public Map<String, Object> profileOptions() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("gender", options(ProfileDictType.GENDER));
        result.put("identity", options(ProfileDictType.IDENTITY));
        result.put("educationLevel", options(ProfileDictType.EDUCATION_LEVEL));
        result.put("industry", options(ProfileDictType.INDUSTRY));
        result.put("occupation", options(ProfileDictType.OCCUPATION));
        result.put("annualIncome", options(ProfileDictType.ANNUAL_INCOME));
        result.put("maritalStatus", options(ProfileDictType.MARITAL_STATUS));
        result.put("datingGoal", options(ProfileDictType.DATING_GOAL));
        result.put("emotionalStatus", options(ProfileDictType.EMOTIONAL_STATUS));
        result.put("educationUserType", options(ProfileDictType.EDUCATION_USER_TYPE));
        result.put("educationMethod", options(ProfileDictType.EDUCATION_METHOD));
        result.put("auditStatus", options(ProfileDictType.AUDIT_STATUS));
        result.put("auditSource", options(ProfileDictType.AUDIT_SOURCE));
        result.put("coreAccessStatus", options(ProfileDictType.CORE_ACCESS_STATUS));
        result.put("avatarSource", options(ProfileDictType.AVATAR_SOURCE));
        List<SysDictData> tagItems = dictDataDao.selectByDictType(ProfileDictType.PROFILE_TAG);
        List<TagCategory> tagCategories = tagCategories(tagItems);
        List<DictOptionVO> profileTags = profileTagOptions(tagItems, tagCategories);
        result.put("profileTag", profileTags);
        result.put("profileTagGroups", profileTagGroups(profileTags, tagCategories));
        return result;
    }

    private List<DictOptionVO> options(String dictType) {
        return dictDataDao.selectByDictType(dictType).stream().map(item -> {
            DictOptionVO option = new DictOptionVO();
            option.setCode(item.getDictValue());
            option.setLabel(item.getDictLabel());
            option.setSort(item.getDictSort());
            return option;
        }).toList();
    }

    private List<DictOptionVO> profileTagOptions(List<SysDictData> items, List<TagCategory> categories) {
        Map<Long, TagCategory> categoriesById = categories.stream()
                .collect(java.util.stream.Collectors.toMap(TagCategory::id, item -> item));
        return items.stream()
                .filter(item -> !isTagCategoryNode(item))
                .map(item -> {
                    DictOptionVO option = new DictOptionVO();
                    option.setCode(item.getDictValue());
                    option.setLabel(item.getDictLabel());
                    option.setSort(item.getDictSort());
                    TagCategory category = categoriesById.get(item.getParentId());
                    if (category != null) {
                        option.setCategoryCode(category.code());
                        option.setCategoryLabel(category.label());
                    }
                    return option;
                }).toList();
    }

    private List<ProfileTagGroupVO> profileTagGroups(List<DictOptionVO> tags, List<TagCategory> categories) {
        return categories.stream()
                .map(category -> tagGroup(category, tags))
                .filter(group -> !group.getOptions().isEmpty() || "ALL".equals(group.getCategoryCode()))
                .toList();
    }

    private ProfileTagGroupVO tagGroup(TagCategory category, List<DictOptionVO> tags) {
        ProfileTagGroupVO group = new ProfileTagGroupVO();
        group.setCategoryCode(category.code());
        group.setCategoryLabel(category.label());
        group.setOptions("ALL".equals(category.code())
                ? tags
                : tags.stream()
                        .filter(item -> Objects.equals(category.code(), item.getCategoryCode()))
                        .toList());
        return group;
    }

    private List<TagCategory> tagCategories(List<SysDictData> items) {
        return items.stream()
                .filter(this::isTagCategoryNode)
                .map(item -> new TagCategory(item.getId(), item.getDictValue(), item.getDictLabel()))
                .toList();
    }

    private boolean isTagCategoryNode(SysDictData item) {
        return item.getParentId() != null
                && item.getParentId() == 0L;
    }

    private RegionOptionVO toOption(SysDictData item, String level) {
        RegionOptionVO option = new RegionOptionVO();
        option.setCode(item.getDictValue());
        option.setLabel(item.getDictLabel());
        option.setLeaf(!Boolean.TRUE.equals(item.getHasChildren()));
        option.setName(item.getDictLabel());
        option.setLevel(level);
        option.setHasChildren(Boolean.TRUE.equals(item.getHasChildren()));
        return option;
    }

    private RegionTreeVO toTreeNode(SysDictData item, String level) {
        RegionTreeVO node = new RegionTreeVO();
        node.setCode(item.getDictValue());
        node.setName(item.getDictLabel());
        node.setLevel(level);
        return node;
    }

    private record TagCategory(Long id, String code, String label) {
    }
}
