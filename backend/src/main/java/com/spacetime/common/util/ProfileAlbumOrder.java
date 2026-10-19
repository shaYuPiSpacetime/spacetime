package com.spacetime.common.util;

import com.spacetime.common.entity.AppUserAuditRecord;

import java.util.Comparator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 相册编辑槽位与本人、公开资料的统一排序规则。 */
public final class ProfileAlbumOrder {

    /** 历史材料中的槽位；缺失或非法数值沿用编辑页的第零位兜底。 */
    private static final Pattern SORT_ORDER = Pattern.compile("\"sortOrder\"\\s*:\\s*(-?\\d+)");

    /** 同槽位按提交时间和主键稳定排序，审核时间不改变用户照片顺序。 */
    public static final Comparator<AppUserAuditRecord> COMPARATOR = Comparator
            .comparingInt((AppUserAuditRecord record) -> readSortOrder(record.getMaterialJson()))
            .thenComparing(AppUserAuditRecord::getSubmitTime, Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(AppUserAuditRecord::getId, Comparator.nullsLast(Comparator.naturalOrder()));

    private ProfileAlbumOrder() {
    }

    /**
     * 读取相册位置，兼容历史缺失、负数和超出整数范围的材料。
     * @param materialJson 审核材料
     * @return 非负照片位置
     */
    public static int readSortOrder(String materialJson) {
        if (materialJson == null) return 0;
        Matcher matcher = SORT_ORDER.matcher(materialJson);
        if (!matcher.find()) return 0;
        try {
            return Math.max(0, Integer.parseInt(matcher.group(1)));
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }
}
