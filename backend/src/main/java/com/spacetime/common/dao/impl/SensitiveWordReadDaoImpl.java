package com.spacetime.common.dao.impl;

import com.spacetime.common.config.SensitiveWordReadResources;
import com.spacetime.common.dao.SensitiveWordReadDao;
import com.spacetime.common.entity.ContentSensitiveWord;
import com.spacetime.common.sensitiveword.persistence.SensitiveWordReadMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import java.util.List;

/** 每个读取自有会话，与调用线程的业务事务完全隔离。 */
@Repository @RequiredArgsConstructor
public class SensitiveWordReadDaoImpl implements SensitiveWordReadDao {
    private final SensitiveWordReadResources resources;
    @Override public Long currentRevision(){
        try(var session=resources.openSession()){return session.getMapper(SensitiveWordReadMapper.class).currentRevision();}
    }
    @Override public List<ContentSensitiveWord> selectEnabled(){
        try(var session=resources.openSession()){return session.getMapper(SensitiveWordReadMapper.class).selectEnabled();}
    }
}
