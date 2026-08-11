package com.spacetime.common.dao.impl;

import com.spacetime.common.dao.MessageAdminQueryDao;
import com.spacetime.common.mapper.MessageAdminQueryMapper;
import com.spacetime.common.model.message.MessageAdminRecordFilter;
import com.spacetime.common.model.message.MessageAdminRecordProjection;
import com.spacetime.common.model.message.MessageAdminRecordStatsProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

/** 管理后台消息元数据统一查询 DAO 实现。 */
@Repository
@RequiredArgsConstructor
public class MessageAdminQueryDaoImpl implements MessageAdminQueryDao {
    private final MessageAdminQueryMapper mapper;

    @Override
    public List<MessageAdminRecordProjection> selectPage(MessageAdminRecordFilter filter, int offset, int limit) {
        return mapper.selectPage(filter, Math.max(0, offset), Math.max(1, Math.min(limit, 10001)));
    }

    @Override
    public long count(MessageAdminRecordFilter filter) {
        return mapper.count(filter);
    }

    @Override
    public MessageAdminRecordStatsProjection stats(MessageAdminRecordFilter filter) {
        return mapper.stats(filter);
    }

    @Override
    public MessageAdminRecordProjection selectByRecordNo(String recordNo) {
        return mapper.selectByRecordNo(recordNo);
    }
}
