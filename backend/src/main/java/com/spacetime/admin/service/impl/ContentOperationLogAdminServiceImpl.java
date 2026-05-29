package com.spacetime.admin.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.admin.dto.request.ContentOperationLogPageReq;
import com.spacetime.admin.dto.response.ContentOperationLogVO;
import com.spacetime.admin.service.ContentOperationLogAdminService;
import com.spacetime.common.dao.ContentOperationLogDao;
import com.spacetime.common.dao.UserDao;
import com.spacetime.common.entity.ContentOperationLog;
import com.spacetime.common.entity.SysUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 内容操作日志管理服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ContentOperationLogAdminServiceImpl implements ContentOperationLogAdminService {

    private final ContentOperationLogDao contentOperationLogDao;
    private final UserDao userDao;

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public Page<ContentOperationLogVO> list(ContentOperationLogPageReq req) {
        LambdaQueryWrapper<ContentOperationLog> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(StringUtils.hasText(req.getBizType()), ContentOperationLog::getBizType, req.getBizType());
        wrapper.eq(StringUtils.hasText(req.getAction()), ContentOperationLog::getAction, req.getAction());
        wrapper.orderByDesc(ContentOperationLog::getCreateTime);

        Page<ContentOperationLog> page = new Page<>(req.getPage(), req.getSize());
        Page<ContentOperationLog> result = contentOperationLogDao.selectPage(page, wrapper);

        Page<ContentOperationLogVO> voPage = new Page<>(result.getCurrent(), result.getSize(), result.getTotal());
        List<ContentOperationLog> records = result.getRecords();

        Set<Long> userIds = records.stream()
                .map(ContentOperationLog::getCreatedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> userNameMap = userIds.stream()
                .collect(Collectors.toMap(id -> id, id -> {
                    SysUser user = userDao.selectById(id);
                    return user != null ? user.getNickname() : String.valueOf(id);
                }));

        voPage.setRecords(records.stream().map(e -> toVO(e, userNameMap)).toList());
        return voPage;
    }

    private ContentOperationLogVO toVO(ContentOperationLog entity, Map<Long, String> userNameMap) {
        ContentOperationLogVO vo = new ContentOperationLogVO();
        vo.setId(entity.getId());
        vo.setBizType(entity.getBizType());
        vo.setBizId(entity.getBizId());
        vo.setAction(entity.getAction());
        vo.setBeforeValue(entity.getBeforeValue());
        vo.setAfterValue(entity.getAfterValue());
        vo.setOperatorName(entity.getCreatedBy() != null ? userNameMap.getOrDefault(entity.getCreatedBy(), "-") : "-");
        vo.setRemark(entity.getRemark());
        vo.setCreateTime(entity.getCreateTime() != null ? entity.getCreateTime().format(FMT) : null);
        return vo;
    }
}
