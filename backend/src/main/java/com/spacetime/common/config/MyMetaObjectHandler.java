package com.spacetime.common.config;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import com.spacetime.common.interceptor.UserContext;
import com.spacetime.common.interceptor.UserContextHolder;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * MyBatis-Plus 字段自动填充处理器
 */
@Component
public class MyMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();
        this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, now);
        this.strictInsertFill(metaObject, "updateTime", LocalDateTime.class, now);
        UserContext ctx = UserContextHolder.get();
        if (ctx != null) {
            this.strictInsertFill(metaObject, "createdBy", Long.class, ctx.getId());
            this.strictInsertFill(metaObject, "updatedBy", Long.class, ctx.getId());
        }
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
        UserContext ctx = UserContextHolder.get();
        if (ctx != null) {
            this.strictUpdateFill(metaObject, "updatedBy", Long.class, ctx.getId());
        }
    }
}
