package com.spacetime.miniapp.service.impl;

import com.spacetime.common.constant.ProfileDictType;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.spacetime.common.enums.CommonStatusEnum;
import com.spacetime.common.dao.DictDataDao;
import com.spacetime.common.entity.SysDictData;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.miniapp.dto.response.DictOptionVO;
import com.spacetime.miniapp.dto.response.ProfileTagGroupVO;
import com.spacetime.miniapp.dto.response.RegionOptionVO;
import com.spacetime.miniapp.dto.response.RegionTreeVO;
import com.spacetime.miniapp.dto.response.SchoolOptionVO;
import com.spacetime.miniapp.service.MiniappDictService;
import com.spacetime.miniapp.service.SchoolDictionaryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** 移动端公开字典服务实现。 */
@Service
public class MiniappDictServiceImpl implements MiniappDictService {

    /** 中国大陆省市区字典类型编码。 */
    private static final String CHINA_REGION_DICT_TYPE = "china_region";

    /** 直辖市的字典含有“市辖区/县”虚拟中间层，两级选择器应直接展示其区县。 */
    private static final Set<String> MUNICIPALITY_CODES = Set.of("110000", "120000", "310000", "500000");
    private static final Set<String> VIRTUAL_CITY_LABELS = Set.of("市辖区", "县");
    /** 省及自治区直辖县级行政区划同样是虚拟中间层，应展示其下的真实地区。 */
    private static final Set<String> DIRECT_ADMIN_VIRTUAL_CITY_CODES = Set.of(
            "419000", "429000", "469000", "659000");

    private final DictDataDao dictDataDao;
    private final SchoolDictionaryService schoolDictionaryService;

    @Autowired
    public MiniappDictServiceImpl(DictDataDao dictDataDao, SchoolDictionaryService schoolDictionaryService) {
        this.dictDataDao = dictDataDao;
        this.schoolDictionaryService = schoolDictionaryService;
    }

    /** 保留单参构造器供现有字典单测使用。 */
    public MiniappDictServiceImpl(DictDataDao dictDataDao) {
        this(dictDataDao, null);
    }

    @Override
    public List<SchoolOptionVO> searchSchools(String keyword, int limit) {
        if (schoolDictionaryService == null) {
            return List.of();
        }
        return schoolDictionaryService.search(keyword, limit);
    }

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
        Map<Long, List<SysDictData>> childrenByParent = new LinkedHashMap<>();
        for (SysDictData item : regions) {
            childrenByParent.computeIfAbsent(item.getParentId(), ignored -> new ArrayList<>()).add(item);
            if (Objects.equals(item.getParentId(), 0L)) {
                provincesById.put(item.getId(), toTreeNode(item, "PROVINCE"));
            }
        }
        for (SysDictData item : regions) {
            RegionTreeVO province = provincesById.get(item.getParentId());
            if (province != null) {
                if ((MUNICIPALITY_CODES.contains(province.getCode())
                        && VIRTUAL_CITY_LABELS.contains(item.getDictLabel()))
                        || DIRECT_ADMIN_VIRTUAL_CITY_CODES.contains(item.getDictValue())) {
                    childrenByParent.getOrDefault(item.getId(), List.of()).stream()
                            .map(district -> toTreeNode(district, "CITY"))
                            .forEach(province.getChildren()::add);
                } else {
                    province.getChildren().add(toTreeNode(item, "CITY"));
                }
            }
        }
        return List.copyOf(provincesById.values());
    }

    /** 基础资料字典选项数量较小，一次返回可减少首登和资料编辑页请求次数。 */
    @Override
    public Map<String, Object> profileOptions() {
        Map<String, String> types = new LinkedHashMap<>();
        types.put("gender", ProfileDictType.GENDER);
        types.put("identity", ProfileDictType.IDENTITY);
        types.put("educationLevel", ProfileDictType.EDUCATION_LEVEL);
        types.put("industry", ProfileDictType.INDUSTRY);
        types.put("occupation", ProfileDictType.OCCUPATION);
        types.put("annualIncome", ProfileDictType.ANNUAL_INCOME);
        types.put("maritalStatus", ProfileDictType.MARITAL_STATUS);
        types.put("datingGoal", ProfileDictType.DATING_GOAL);
        types.put("emotionalStatus", ProfileDictType.EMOTIONAL_STATUS);
        types.put("educationUserType", ProfileDictType.EDUCATION_USER_TYPE);
        types.put("educationMethod", ProfileDictType.EDUCATION_METHOD);
        types.put("auditStatus", ProfileDictType.AUDIT_STATUS);
        types.put("auditSource", ProfileDictType.AUDIT_SOURCE);
        types.put("coreAccessStatus", ProfileDictType.CORE_ACCESS_STATUS);
        types.put("avatarSource", ProfileDictType.AVATAR_SOURCE);
        List<String> dictTypes = new ArrayList<>(types.values());
        dictTypes.add(ProfileDictType.PROFILE_TAG);
        List<SysDictData> rows = dictDataDao.selectList(new LambdaQueryWrapper<SysDictData>()
                .in(SysDictData::getDictType, dictTypes)
                .eq(SysDictData::getStatus, CommonStatusEnum.ENABLED.getCode())
                .orderByAsc(SysDictData::getDictSort).orderByAsc(SysDictData::getId));
        Map<String, List<SysDictData>> grouped = rows.stream()
                .collect(java.util.stream.Collectors.groupingBy(SysDictData::getDictType));
        Map<String, Object> result = new LinkedHashMap<>();
        Map<String, String> requiredLabels = Map.of("gender", "性别", "identity", "身份", "educationLevel", "学历");
        types.forEach((field, type) -> {
            List<DictOptionVO> options = options(grouped.getOrDefault(type, List.of()));
            if (options.isEmpty() && requiredLabels.containsKey(field)) {
                throw new BusinessException(requiredLabels.get(field) + "字典配置为空，请联系管理员");
            }
            result.put(field, options);
        });
        List<SysDictData> tagItems = grouped.getOrDefault(ProfileDictType.PROFILE_TAG, List.of());
        List<TagCategory> tagCategories = tagCategories(tagItems);
        List<DictOptionVO> profileTags = profileTagOptions(tagItems, tagCategories);
        result.put("profileTag", profileTags);
        result.put("profileTagGroups", profileTagGroups(profileTags, tagCategories));
        return result;
    }

    private List<DictOptionVO> options(List<SysDictData> rows) {
        return rows.stream().map(item -> {
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
        Map<String, DictOptionVO> uniqueOptions = items.stream()
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
                })
                .collect(java.util.stream.Collectors.toMap(
                        DictOptionVO::getCode,
                        item -> item,
                        (first, ignored) -> first,
                        LinkedHashMap::new));
        return List.copyOf(uniqueOptions.values());
    }

    private List<ProfileTagGroupVO> profileTagGroups(List<DictOptionVO> tags, List<TagCategory> categories) {
        List<ProfileTagGroupVO> groups = new ArrayList<>();
        groups.add(tagGroup(new TagCategory(null, "ALL", "全部"), tags));
        Map<String, TagCategory> uniqueCategories = new LinkedHashMap<>();
        for (TagCategory category : categories) {
            if (!"ALL".equals(category.code())) {
                uniqueCategories.putIfAbsent(category.code(), category);
            }
        }
        uniqueCategories.values().stream()
                .map(category -> tagGroup(category, tags))
                .filter(group -> !group.getOptions().isEmpty())
                .forEach(groups::add);
        return List.copyOf(groups);
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
