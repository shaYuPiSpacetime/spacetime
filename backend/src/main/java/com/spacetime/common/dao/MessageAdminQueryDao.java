package com.spacetime.common.dao;

import com.spacetime.common.model.message.MessageAdminRecordFilter;
import com.spacetime.common.model.message.MessageAdminRecordProjection;
import com.spacetime.common.model.message.MessageAdminRecordStatsProjection;

import java.util.List;

/** 管理后台消息元数据统一查询 DAO。 */
public interface MessageAdminQueryDao {
    List<MessageAdminRecordProjection> selectPage(MessageAdminRecordFilter filter, int offset, int limit);
    long count(MessageAdminRecordFilter filter);
    MessageAdminRecordStatsProjection stats(MessageAdminRecordFilter filter);
    MessageAdminRecordProjection selectByRecordNo(String recordNo);
}
