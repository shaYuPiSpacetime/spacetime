# Spacetime 平台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 搭建"成家立业"平台：Spring Boot 后端（管理后台 API + 小程序 API）+ React 管理后台前端

**Architecture:** 单仓库单体应用，内部包路径分区（common/admin/miniapp），Controller → Service → ServiceImpl → DAO → DAOImpl → Mapper 六层，MySQL 8.0 + Redis + OSS，Docker 部署

**Tech Stack:** Java 21, Spring Boot 3.x, MyBatis-Plus 3.5+, Hutool 5.8+, MySQL 8.0, Redis 7.x, React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS, Zustand

---

## Phase 1: 后端项目搭建

### Task 1.1: 初始化 Spring Boot 项目

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/src/main/java/com/spacetime/SpacetimeApplication.java`
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/resources/application-dev.yml`
- Create: `backend/src/main/resources/application-prod.yml`
- Create: `backend/.gitignore`

- [ ] **Step 1: 创建 pom.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.4.1</version>
    </parent>
    <groupId>com.spacetime</groupId>
    <artifactId>spacetime</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <name>spacetime</name>

    <properties>
        <java.version>21</java.version>
        <mybatis-plus.version>3.5.9</mybatis-plus.version>
        <hutool.version>5.8.32</hutool.version>
        <knife4j.version>4.5.0</knife4j.version>
    </properties>

    <dependencies>
        <!-- Spring Boot -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>

        <!-- MyBatis-Plus -->
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
            <version>${mybatis-plus.version}</version>
        </dependency>

        <!-- MySQL -->
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
        </dependency>

        <!-- Hutool -->
        <dependency>
            <groupId>cn.hutool</groupId>
            <artifactId>hutool-all</artifactId>
            <version>${hutool.version}</version>
        </dependency>

        <!-- Knife4j -->
        <dependency>
            <groupId>com.github.xiaoymin</groupId>
            <artifactId>knife4j-openapi3-jakarta-spring-boot-starter</artifactId>
            <version>${knife4j.version}</version>
        </dependency>

        <!-- OSS -->
        <dependency>
            <groupId>com.aliyun.oss</groupId>
            <artifactId>aliyun-sdk-oss</artifactId>
            <version>3.18.1</version>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 2: 创建启动类**

```java
package com.spacetime;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.spacetime.common.mapper")
public class SpacetimeApplication {
    public static void main(String[] args) {
        SpringApplication.run(SpacetimeApplication.class, args);
    }
}
```

- [ ] **Step 3: 创建 application.yml**

```yaml
server:
  port: 8080

spring:
  application:
    name: spacetime
  profiles:
    active: dev
  jackson:
    date-format: yyyy-MM-dd HH:mm:ss
    time-zone: GMT+8
    default-property-inclusion: non_null
```

- [ ] **Step 4: 创建 application-dev.yml**

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/spacetime?useUnicode=true&characterEncoding=utf8mb4&serverTimezone=Asia/Shanghai
    username: root
    password: ${DB_PASSWORD:root}
    driver-class-name: com.mysql.cj.jdbc.Driver

  data:
    redis:
      host: localhost
      port: 6379
      password: ${REDIS_PASSWORD:}

mybatis-plus:
  configuration:
    map-underscore-to-camel-case: true
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
  global-config:
    db-config:
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0

knife4j:
  enable: true
```

- [ ] **Step 5: 创建 application-prod.yml**

```yaml
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST}:${DB_PORT:3306}/spacetime?useUnicode=true&characterEncoding=utf8mb4&serverTimezone=Asia/Shanghai
    username: ${DB_USER}
    password: ${DB_PASSWORD}
    driver-class-name: com.mysql.cj.jdbc.Driver

  data:
    redis:
      host: ${REDIS_HOST}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD}

mybatis-plus:
  configuration:
    map-underscore-to-camel-case: true

knife4j:
  enable: false
```

- [ ] **Step 6: 验证项目能启动**

Run: `cd backend && mvn spring-boot:run`
Expected: 启动成功，输出 "Started SpacetimeApplication"

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: init Spring Boot 3.x project with dependencies"
```

---

### Task 1.2: 创建公共基础类

**Files:**
- Create: `backend/src/main/java/com/spacetime/common/result/R.java`
- Create: `backend/src/main/java/com/spacetime/common/exception/BusinessException.java`
- Create: `backend/src/main/java/com/spacetime/common/exception/GlobalExceptionHandler.java`
- Create: `backend/src/main/java/com/spacetime/common/entity/BaseEntity.java`

- [ ] **Step 1: 创建统一返回体 R.java**

```java
package com.spacetime.common.result;

import lombok.Data;

@Data
public class R<T> {
    private int code;
    private String msg;
    private T data;

    public static <T> R<T> ok(T data) {
        R<T> r = new R<>();
        r.code = 200;
        r.msg = "success";
        r.data = data;
        return r;
    }

    public static <T> R<T> ok() {
        return ok(null);
    }

    public static <T> R<T> fail(int code, String msg) {
        R<T> r = new R<>();
        r.code = code;
        r.msg = msg;
        return r;
    }

    public static <T> R<T> fail(String msg) {
        return fail(500, msg);
    }
}
```

- [ ] **Step 2: 创建 BusinessException.java**

```java
package com.spacetime.common.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final int code;

    public BusinessException(int code, String msg) {
        super(msg);
        this.code = code;
    }

    public BusinessException(String msg) {
        this(500, msg);
    }
}
```

- [ ] **Step 3: 创建 GlobalExceptionHandler.java**

```java
package com.spacetime.common.exception;

import com.spacetime.common.result.R;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public R<Void> handleBusinessException(BusinessException e) {
        log.warn("business error: {}", e.getMessage());
        return R.fail(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public R<Void> handleException(Exception e) {
        log.error("system error", e);
        return R.fail("系统异常");
    }
}
```

- [ ] **Step 4: 创建 BaseEntity.java**

```java
package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BaseEntity {
    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateTime;

    @TableField(fill = FieldFill.INSERT)
    private Long createdBy;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private Long updatedBy;

    @TableLogic
    private Integer deleted;
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/spacetime/common/
git commit -m "feat: add common base classes (R, BusinessException, BaseEntity)"
```

---

### Task 1.3: MyBatis-Plus 自动填充 + 配置

**Files:**
- Create: `backend/src/main/java/com/spacetime/common/config/MybatisPlusConfig.java`
- Create: `backend/src/main/java/com/spacetime/common/config/MyMetaObjectHandler.java`

- [ ] **Step 1: 创建 MybatisPlusConfig.java**

```java
package com.spacetime.common.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MybatisPlusConfig {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }
}
```

- [ ] **Step 2: 创建 MyMetaObjectHandler.java**

```java
package com.spacetime.common.config;

import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class MyMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        this.strictInsertFill(metaObject, "createTime", LocalDateTime.class, LocalDateTime.now());
        this.strictInsertFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        this.strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/spacetime/common/config/
git commit -m "feat: add MyBatis-Plus config with auto-fill and pagination"
```

---

## Phase 2: 数据库

### Task 2.1: 创建数据库 DDL

**Files:**
- Create: `backend/src/main/resources/db/init.sql`

- [ ] **Step 1: 创建 init.sql（全量建表语句）**

```sql
CREATE DATABASE IF NOT EXISTS spacetime DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE spacetime;

-- ========== 认证与权限 ==========
CREATE TABLE sys_user (
    id          BIGINT(20) NOT NULL AUTO_INCREMENT,
    username    VARCHAR(50) NOT NULL COMMENT '用户名',
    password    VARCHAR(255) NOT NULL COMMENT '密码',
    nickname    VARCHAR(50) COMMENT '昵称',
    email       VARCHAR(100) COMMENT '邮箱',
    phone       VARCHAR(20) COMMENT '手机号',
    status      VARCHAR(20) NOT NULL DEFAULT 'ENABLED' COMMENT '状态: ENABLED/DISABLED',
    last_login_time DATETIME COMMENT '最后登录时间',
    create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by  BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by  BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted     BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id),
    UNIQUE KEY uk_sys_user_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理员账号';

CREATE TABLE sys_role (
    id          BIGINT(20) NOT NULL AUTO_INCREMENT,
    name        VARCHAR(50) NOT NULL COMMENT '角色名称',
    label       VARCHAR(50) COMMENT '角色标签',
    sort_order  INT DEFAULT 0 COMMENT '排序值',
    status      VARCHAR(20) NOT NULL DEFAULT 'ENABLED' COMMENT '状态',
    remark      VARCHAR(255) COMMENT '备注',
    create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by  BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by  BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted     BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

CREATE TABLE sys_permission (
    id          BIGINT(20) NOT NULL AUTO_INCREMENT,
    parent_id   BIGINT(20) DEFAULT 0 COMMENT '父权限ID',
    name        VARCHAR(100) NOT NULL COMMENT '权限名称',
    code        VARCHAR(100) NOT NULL COMMENT '权限编码',
    type        VARCHAR(20) NOT NULL COMMENT '类型: MENU/BUTTON/API/DATA',
    path        VARCHAR(255) COMMENT '菜单路径',
    icon        VARCHAR(100) COMMENT '菜单图标',
    sort_order  INT DEFAULT 0 COMMENT '排序值',
    create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by  BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by  BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted     BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id),
    UNIQUE KEY uk_sys_permission_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限点';

CREATE TABLE sys_role_permission (
    id            BIGINT(20) NOT NULL AUTO_INCREMENT,
    role_id       BIGINT(20) NOT NULL COMMENT '角色ID',
    permission_id BIGINT(20) NOT NULL COMMENT '权限ID',
    create_time   DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time   DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted       BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id),
    KEY idx_sys_rp_role_id (role_id),
    KEY idx_sys_rp_permission_id (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色-权限关联';

CREATE TABLE sys_user_role (
    id          BIGINT(20) NOT NULL AUTO_INCREMENT,
    user_id     BIGINT(20) NOT NULL COMMENT '用户ID',
    role_id     BIGINT(20) NOT NULL COMMENT '角色ID',
    create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted     BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id),
    KEY idx_sys_ur_user_id (user_id),
    KEY idx_sys_ur_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户-角色关联';

CREATE TABLE sys_log (
    id           BIGINT(20) NOT NULL AUTO_INCREMENT,
    operator_id  BIGINT(20) COMMENT '操作人ID',
    operator     VARCHAR(50) COMMENT '操作人',
    module       VARCHAR(50) COMMENT '操作模块',
    action       VARCHAR(50) COMMENT '操作类型',
    target       VARCHAR(255) COMMENT '操作对象',
    request_ip   VARCHAR(50) COMMENT '请求IP',
    request_params TEXT COMMENT '请求参数(脱敏)',
    result       VARCHAR(20) COMMENT '操作结果: SUCCESS/FAIL',
    cost_ms      INT COMMENT '耗时(ms)',
    create_time  DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (id),
    KEY idx_sys_log_operator_id (operator_id),
    KEY idx_sys_log_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志';

-- ========== 用户中心 ==========
CREATE TABLE app_user (
    id              BIGINT(20) NOT NULL AUTO_INCREMENT,
    openid          VARCHAR(100) NOT NULL COMMENT '微信openid',
    unionid         VARCHAR(100) COMMENT '微信unionid',
    nickname        VARCHAR(50) COMMENT '昵称',
    avatar          VARCHAR(500) COMMENT '头像',
    phone           VARCHAR(20) COMMENT '手机号(脱敏展示)',
    gender          VARCHAR(10) COMMENT '性别: MALE/FEMALE',
    birthday        DATE COMMENT '生日',
    university      VARCHAR(100) COMMENT '学校',
    occupation      VARCHAR(100) COMMENT '职业',
    city            VARCHAR(50) COMMENT '城市',
    bio             VARCHAR(500) COMMENT '个人简介',
    status          VARCHAR(20) NOT NULL DEFAULT 'NORMAL' COMMENT '状态: NORMAL/FROZEN/DISABLED',
    auth_status     VARCHAR(20) NOT NULL DEFAULT 'NONE' COMMENT '认证状态: NONE/REAL_NAME/EDUCATION/AVATAR',
    coin_balance    DECIMAL(16,4) DEFAULT 0.0000 COMMENT '成家币余额',
    vip_level       INT DEFAULT 0 COMMENT 'VIP等级',
    vip_expire_time DATETIME COMMENT 'VIP到期时间',
    last_login_time DATETIME COMMENT '最后登录时间',
    create_time     DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time     DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by      BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by      BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted         BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id),
    UNIQUE KEY uk_app_user_openid (openid),
    KEY idx_app_user_phone (phone),
    KEY idx_app_user_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小程序用户';

CREATE TABLE app_user_auth (
    id          BIGINT(20) NOT NULL AUTO_INCREMENT,
    user_id     BIGINT(20) NOT NULL COMMENT '用户ID',
    auth_type   VARCHAR(30) NOT NULL COMMENT '认证类型: REAL_NAME/EDUCATION/AVATAR',
    real_name   VARCHAR(30) COMMENT '真实姓名',
    id_card     VARCHAR(20) COMMENT '身份证号',
    id_card_imgs VARCHAR(1000) COMMENT '身份证图片(JSON数组)',
    cert_imgs   VARCHAR(1000) COMMENT '证件图片(JSON数组)',
    avatar_imgs VARCHAR(1000) COMMENT '头像认证图片',
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '状态: PENDING/APPROVED/REJECTED',
    reject_reason VARCHAR(255) COMMENT '驳回原因',
    reviewer_id BIGINT(20) COMMENT '审核人ID',
    review_time DATETIME COMMENT '审核时间',
    create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by  BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by  BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted     BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id),
    KEY idx_app_user_auth_user_id (user_id),
    KEY idx_app_user_auth_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='认证记录';

-- ========== 测评系统 ==========
CREATE TABLE scale (
    id              BIGINT(20) NOT NULL AUTO_INCREMENT,
    name            VARCHAR(100) NOT NULL COMMENT '量表名称',
    category        VARCHAR(50) COMMENT '分类',
    cover_img       VARCHAR(500) COMMENT '封面图',
    description     VARCHAR(500) COMMENT '简介',
    estimated_time  INT COMMENT '预计完成时间(分钟)',
    version         INT DEFAULT 1 COMMENT '版本号',
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT' COMMENT '状态: DRAFT/PUBLISHED/OFFLINE',
    guide_html      TEXT COMMENT '引导页富文本',
    report_config   TEXT COMMENT '报告配置(JSON)',
    share_poster    VARCHAR(500) COMMENT '分享海报背景图',
    answer_count    INT DEFAULT 0 COMMENT '作答人数',
    completion_rate DECIMAL(5,2) DEFAULT 0.00 COMMENT '完成率',
    avg_score       DECIMAL(5,2) COMMENT '平均得分',
    create_time     DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time     DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by      BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by      BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted         BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id),
    KEY idx_scale_status (status),
    KEY idx_scale_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='量表基本信息';

CREATE TABLE scale_dimension (
    id          BIGINT(20) NOT NULL AUTO_INCREMENT,
    scale_id    BIGINT(20) NOT NULL COMMENT '量表ID',
    name        VARCHAR(100) NOT NULL COMMENT '维度名称',
    description VARCHAR(255) COMMENT '维度描述',
    sort_order  INT DEFAULT 0 COMMENT '排序',
    create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by  BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by  BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted     BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id),
    KEY idx_scale_dimension_scale_id (scale_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='维度';

CREATE TABLE scale_question (
    id            BIGINT(20) NOT NULL AUTO_INCREMENT,
    dimension_id  BIGINT(20) NOT NULL COMMENT '维度ID',
    title         VARCHAR(500) NOT NULL COMMENT '题目标题',
    question_type VARCHAR(20) NOT NULL COMMENT '题型: SINGLE/MULTIPLE/LIKERT',
    is_required   BIT(1) DEFAULT b'1' COMMENT '是否必答',
    sort_order    INT DEFAULT 0 COMMENT '排序',
    create_time   DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time   DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by    BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by    BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted       BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id),
    KEY idx_scale_question_dimension_id (dimension_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题目';

CREATE TABLE scale_question_option (
    id          BIGINT(20) NOT NULL AUTO_INCREMENT,
    question_id BIGINT(20) NOT NULL COMMENT '题目ID',
    label       VARCHAR(255) NOT NULL COMMENT '选项文案',
    score       INT DEFAULT 0 COMMENT '分值',
    sort_order  INT DEFAULT 0 COMMENT '排序',
    create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by  BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by  BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted     BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id),
    KEY idx_scale_option_question_id (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='选项';

CREATE TABLE scale_result_range (
    id          BIGINT(20) NOT NULL AUTO_INCREMENT,
    scale_id    BIGINT(20) NOT NULL COMMENT '量表ID',
    range_name  VARCHAR(100) NOT NULL COMMENT '区间名称',
    min_score   DECIMAL(5,1) NOT NULL COMMENT '最小分',
    max_score   DECIMAL(5,1) NOT NULL COMMENT '最大分',
    description TEXT COMMENT '解释文案',
    tags        VARCHAR(500) COMMENT '性格标签(JSON)',
    sort_order  INT DEFAULT 0 COMMENT '排序',
    create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by  BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by  BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted     BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id),
    KEY idx_scale_result_scale_id (scale_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='结果分段';

-- ========== 财务 ==========
CREATE TABLE pay_order (
    id              BIGINT(20) NOT NULL AUTO_INCREMENT,
    order_no        VARCHAR(32) NOT NULL COMMENT '订单号',
    user_id         BIGINT(20) NOT NULL COMMENT '用户ID',
    product_type    VARCHAR(30) NOT NULL COMMENT '商品类型: VIP/COIN',
    product_id      BIGINT(20) COMMENT '商品ID',
    product_name    VARCHAR(100) COMMENT '商品名称',
    amount          DECIMAL(16,4) NOT NULL COMMENT '支付金额',
    pay_method      VARCHAR(20) COMMENT '支付方式: WECHAT/ALIPAY/IAP',
    pay_channel     VARCHAR(20) COMMENT '支付渠道',
    status          VARCHAR(20) NOT NULL DEFAULT 'WAITING' COMMENT '状态: WAITING/SUCCESS/REFUNDING/REFUNDED',
    pay_time        DATETIME COMMENT '支付时间',
    transaction_id  VARCHAR(100) COMMENT '第三方交易号',
    callback_body   TEXT COMMENT '支付回调原始数据',
    remark          VARCHAR(255) COMMENT '备注',
    create_time     DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time     DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by      BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by      BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted         BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id),
    UNIQUE KEY uk_pay_order_order_no (order_no),
    KEY idx_pay_order_user_id (user_id),
    KEY idx_pay_order_status (status),
    KEY idx_pay_order_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='充值/VIP订单';

CREATE TABLE pay_refund (
    id             BIGINT(20) NOT NULL AUTO_INCREMENT,
    order_id       BIGINT(20) NOT NULL COMMENT '原订单ID',
    refund_no      VARCHAR(32) NOT NULL COMMENT '退款单号',
    refund_amount  DECIMAL(16,4) NOT NULL COMMENT '退款金额',
    refund_reason  VARCHAR(500) COMMENT '退款原因',
    status         VARCHAR(20) NOT NULL DEFAULT 'PROCESSING' COMMENT '状态: PROCESSING/SUCCESS/FAILED',
    reviewer_id    BIGINT(20) COMMENT '审核人ID',
    review_remark  VARCHAR(255) COMMENT '审核备注',
    review_time    DATETIME COMMENT '审核时间',
    create_time    DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time    DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by     BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by     BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted        BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id),
    UNIQUE KEY uk_pay_refund_no (refund_no),
    KEY idx_pay_refund_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='退款记录';

CREATE TABLE app_user_coin_log (
    id          BIGINT(20) NOT NULL AUTO_INCREMENT,
    user_id     BIGINT(20) NOT NULL COMMENT '用户ID',
    amount      DECIMAL(16,4) NOT NULL COMMENT '变动金额(正=收入,负=支出)',
    type        VARCHAR(30) NOT NULL COMMENT '类型: RECHARGE/CONSUME/REFUND/PROMOTION_REWARD',
    biz_id      VARCHAR(100) COMMENT '业务单号',
    description VARCHAR(255) COMMENT '描述',
    balance_after DECIMAL(16,4) COMMENT '变动后余额',
    create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (id),
    KEY idx_coin_log_user_id (user_id),
    KEY idx_coin_log_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成家币流水';

-- ========== 配置 ==========
CREATE TABLE sys_config (
    id          BIGINT(20) NOT NULL AUTO_INCREMENT,
    config_key  VARCHAR(100) NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    description VARCHAR(255) COMMENT '描述',
    create_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by  BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by  BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted     BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id),
    UNIQUE KEY uk_sys_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统参数KV配置';

-- ========== 推广 ==========
CREATE TABLE promotion_rule (
    id              BIGINT(20) NOT NULL AUTO_INCREMENT,
    rule_type       VARCHAR(30) NOT NULL COMMENT '规则类型: REGISTER_REWARD/CONSUME_REWARD',
    target_role     VARCHAR(20) NOT NULL COMMENT '推广者身份: APP_USER/AGENT',
    reward_coin     DECIMAL(16,4) DEFAULT 0.0000 COMMENT '奖励成家币',
    relation_days   INT DEFAULT 180 COMMENT '关系有效期天数',
    status          VARCHAR(20) NOT NULL DEFAULT 'ENABLED' COMMENT '状态',
    create_time     DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time     DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by      BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by      BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted         BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推广奖励规则';

CREATE TABLE promotion_record (
    id              BIGINT(20) NOT NULL AUTO_INCREMENT,
    promoter_id     BIGINT(20) COMMENT '推广者用户ID',
    agent_id        BIGINT(20) COMMENT '代理ID',
    promoter_role   VARCHAR(20) NOT NULL COMMENT '推广者身份',
    invitee_id      BIGINT(20) NOT NULL COMMENT '被推广用户ID',
    reward_coin     DECIMAL(16,4) DEFAULT 0.0000 COMMENT '奖励成家币',
    reward_type     VARCHAR(30) NOT NULL COMMENT '奖励类型',
    biz_ref         VARCHAR(100) COMMENT '关联业务单号',
    relation_start  DATETIME COMMENT '绑定时间',
    relation_end    DATETIME COMMENT '绑定到期时间',
    create_time     DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (id),
    KEY idx_promo_promoter_id (promoter_id),
    KEY idx_promo_invitee_id (invitee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推广记录';

CREATE TABLE promotion_agent (
    id              BIGINT(20) NOT NULL AUTO_INCREMENT,
    name            VARCHAR(100) NOT NULL COMMENT '代理名称',
    contact_person  VARCHAR(50) COMMENT '联系人',
    contact_phone   VARCHAR(20) COMMENT '联系电话',
    qrcode_path     VARCHAR(500) COMMENT '专属码路径',
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT '状态: ACTIVE/PAUSED',
    remark          VARCHAR(255) COMMENT '备注',
    total_register  INT DEFAULT 0 COMMENT '累计推广注册人次',
    total_reward    DECIMAL(16,4) DEFAULT 0.0000 COMMENT '累计奖励成家币',
    create_time     DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    update_time     DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    updated_by      BIGINT(20) NULL DEFAULT NULL COMMENT '修改人id',
    created_by      BIGINT(20) NULL DEFAULT NULL COMMENT '创建人id',
    deleted         BIT(1) NULL DEFAULT b'0' COMMENT '删除标识',
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代理信息';
```

- [ ] **Step 2: 执行 DDL**

Run: `mysql -u root -p < backend/src/main/resources/db/init.sql`
Expected: 20 张表创建成功

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/
git commit -m "feat: add full database DDL (20 tables)"
```

---

## Phase 3: 后端基础设施

### Task 3.1: Token 拦截器

**Files:**
- Create: `backend/src/main/java/com/spacetime/common/interceptor/TokenInterceptor.java`
- Create: `backend/src/main/java/com/spacetime/common/interceptor/WebConfig.java`
- Create: `backend/src/main/java/com/spacetime/common/util/JwtUtil.java`
- Create: `backend/src/main/java/com/spacetime/common/constant/AuthConstant.java`

- [ ] **Step 1: 创建 AuthConstant.java**

```java
package com.spacetime.common.constant;

public class AuthConstant {
    public static final String TOKEN_HEADER = "X-Auth-Token";
    public static final String ADMIN_TOKEN_PREFIX = "admin:token:";
    public static final String MINIAPP_TOKEN_PREFIX = "miniapp:token:";
    public static final String CURRENT_USER_ATTR = "currentUser";

    private AuthConstant() {}
}
```

- [ ] **Step 2: 创建 JwtUtil.java**

```java
package com.spacetime.common.util;

import cn.hutool.core.util.IdUtil;
import cn.hutool.jwt.JWTUtil;
import java.util.Map;

public class JwtUtil {

    private static final byte[] KEY = "spacetime2026".getBytes();

    public static String createToken(Map<String, Object> payload) {
        return JWTUtil.createToken(payload, KEY);
    }

    public static boolean verify(String token) {
        return JWTUtil.verify(token, KEY);
    }
}
```

- [ ] **Step 3: 创建 TokenInterceptor.java**

```java
package com.spacetime.common.interceptor;

import cn.hutool.core.util.StrUtil;
import com.spacetime.common.constant.AuthConstant;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Slf4j
@Component
@RequiredArgsConstructor
public class TokenInterceptor implements HandlerInterceptor {

    private final StringRedisTemplate redisTemplate;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String token = request.getHeader(AuthConstant.TOKEN_HEADER);
        if (StrUtil.isBlank(token)) {
            response.setStatus(401);
            return false;
        }
        String prefix = request.getRequestURI().startsWith("/admin/")
                ? AuthConstant.ADMIN_TOKEN_PREFIX
                : AuthConstant.MINIAPP_TOKEN_PREFIX;
        String cached = redisTemplate.opsForValue().get(prefix + token);
        if (cached == null) {
            response.setStatus(401);
            return false;
        }
        request.setAttribute(AuthConstant.CURRENT_USER_ATTR, cached);
        return true;
    }
}
```

- [ ] **Step 4: 创建 WebConfig.java**

```java
package com.spacetime.common.interceptor;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final TokenInterceptor tokenInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tokenInterceptor)
                .addPathPatterns("/admin/**", "/miniapp/**")
                .excludePathPatterns("/admin/login", "/miniapp/login/**");
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/spacetime/common/interceptor/
git add backend/src/main/java/com/spacetime/common/util/
git add backend/src/main/java/com/spacetime/common/constant/
git commit -m "feat: add Token interceptor with Redis session management"
```

---

### Task 3.2: Redis + OSS 配置

**Files:**
- Create: `backend/src/main/java/com/spacetime/common/config/RedisConfig.java`
- Create: `backend/src/main/java/com/spacetime/common/config/OssConfig.java`
- Create: `backend/src/main/java/com/spacetime/common/util/OssUtil.java`

- [ ] **Step 1: 创建 RedisConfig.java**

```java
package com.spacetime.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory factory) {
        StringRedisTemplate template = new StringRedisTemplate(factory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }
}
```

- [ ] **Step 2: 创建 OssConfig.java**

```java
package com.spacetime.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "oss")
public class OssConfig {
    private String endpoint;
    private String accessKeyId;
    private String accessKeySecret;
    private String bucketName;
}
```

- [ ] **Step 3: 创建 OssUtil.java**

```java
package com.spacetime.common.util;

import cn.hutool.core.util.IdUtil;
import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.spacetime.common.config.OssConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Component
@RequiredArgsConstructor
public class OssUtil {

    private final OssConfig ossConfig;

    public String upload(InputStream inputStream, String originalFilename) {
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        String ext = originalFilename.substring(originalFilename.lastIndexOf("."));
        String key = datePath + "/" + IdUtil.simpleUUID() + ext;
        OSS oss = new OSSClientBuilder().build(ossConfig.getEndpoint(), ossConfig.getAccessKeyId(), ossConfig.getAccessKeySecret());
        try {
            oss.putObject(ossConfig.getBucketName(), key, inputStream);
        } finally {
            oss.shutdown();
        }
        return "https://" + ossConfig.getBucketName() + "." + ossConfig.getEndpoint() + "/" + key;
    }
}
```

- [ ] **Step 4: 更新 application-dev.yml 增加 OSS 配置**

在 application-dev.yml 末尾追加：

```yaml
oss:
  endpoint: oss-cn-hangzhou.aliyuncs.com
  access-key-id: ${OSS_ACCESS_KEY:}
  access-key-secret: ${OSS_ACCESS_SECRET:}
  bucket-name: spacetime-dev
```

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat: add Redis and OSS configuration"
```

---

## Phase 4: 管理后台后端 - 认证与权限

### Task 4.1: 管理员登录

**Files:**
- Create: `backend/src/main/java/com/spacetime/admin/controller/AuthController.java`
- Create: `backend/src/main/java/com/spacetime/admin/service/AuthService.java`
- Create: `backend/src/main/java/com/spacetime/admin/service/impl/AuthServiceImpl.java`
- Create: `backend/src/main/java/com/spacetime/admin/dto/request/LoginReq.java`
- Create: `backend/src/main/java/com/spacetime/admin/dto/response/LoginVO.java`
- Create: `backend/src/main/java/com/spacetime/common/entity/SysUser.java`
- Create: `backend/src/main/java/com/spacetime/common/mapper/SysUserMapper.java`

- [ ] **Step 1: 创建 SysUser Entity**

```java
package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_user")
public class SysUser extends BaseEntity {
    private String username;
    private String password;
    private String nickname;
    private String email;
    private String phone;
    private String status;
    private LocalDateTime lastLoginTime;
}
```

- [ ] **Step 2: 创建 SysUserMapper.java**

```java
package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.SysUser;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SysUserMapper extends BaseMapper<SysUser> {
}
```

- [ ] **Step 3: 创建 LoginReq.java**

```java
package com.spacetime.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginReq {
    @NotBlank(message = "用户名不能为空")
    private String username;

    @NotBlank(message = "密码不能为空")
    private String password;

    private String captcha;
}
```

- [ ] **Step 4: 创建 LoginVO.java**

```java
package com.spacetime.admin.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class LoginVO {
    private String token;
    private String nickname;
    private String avatar;
    private List<String> permissions;
}
```

- [ ] **Step 5: 创建 AuthService.java**

```java
package com.spacetime.admin.service;

import com.spacetime.admin.dto.request.LoginReq;
import com.spacetime.admin.dto.response.LoginVO;

public interface AuthService {
    LoginVO login(LoginReq req);
    void logout(Long userId);
}
```

- [ ] **Step 6: 创建 AuthServiceImpl.java**

```java
package com.spacetime.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.crypto.SecureUtil;
import com.spacetime.admin.dto.request.LoginReq;
import com.spacetime.admin.dto.response.LoginVO;
import com.spacetime.admin.service.AuthService;
import com.spacetime.common.constant.AuthConstant;
import com.spacetime.common.entity.SysUser;
import com.spacetime.common.exception.BusinessException;
import com.spacetime.common.mapper.SysUserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final SysUserMapper sysUserMapper;
    private final StringRedisTemplate redisTemplate;

    @Override
    public LoginVO login(LoginReq req) {
        SysUser user = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, req.getUsername()));
        if (user == null || !user.getPassword().equals(SecureUtil.md5(req.getPassword()))) {
            throw new BusinessException("用户名或密码错误");
        }
        if ("DISABLED".equals(user.getStatus())) {
            throw new BusinessException("账号已禁用");
        }
        String token = UUID.randomUUID().toString().replace("-", "");
        redisTemplate.opsForValue().set(AuthConstant.ADMIN_TOKEN_PREFIX + token,
                StrUtil.toString(user.getId()),
                7, TimeUnit.DAYS);
        LoginVO vo = new LoginVO();
        vo.setToken(token);
        vo.setNickname(user.getNickname());
        return vo;
    }

    @Override
    public void logout(Long userId) {
        // Token 失效由前端清除，Redis 中 token 可设置过期或不做处理
    }
}
```

- [ ] **Step 7: 创建 AuthController.java**

```java
package com.spacetime.admin.controller;

import com.spacetime.admin.dto.request.LoginReq;
import com.spacetime.admin.service.AuthService;
import com.spacetime.common.result.R;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public R<?> login(@Valid @RequestBody LoginReq req) {
        return R.ok(authService.login(req));
    }

    @PostMapping("/logout")
    public R<Void> logout() {
        authService.logout(null);
        return R.ok();
    }
}
```

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat: add admin login/logout API"
```

---

### Task 4.2: 角色管理 CRUD

**Files:**
- Create: `backend/src/main/java/com/spacetime/common/entity/SysRole.java`
- Create: `backend/src/main/java/com/spacetime/common/mapper/SysRoleMapper.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/RoleDao.java`
- Create: `backend/src/main/java/com/spacetime/common/dao/impl/RoleDaoImpl.java`
- Create: `backend/src/main/java/com/spacetime/admin/controller/RoleController.java`
- Create: `backend/src/main/java/com/spacetime/admin/service/RoleService.java`
- Create: `backend/src/main/java/com/spacetime/admin/service/impl/RoleServiceImpl.java`
- Create: `backend/src/main/java/com/spacetime/admin/dto/request/RolePageReq.java`
- Create: `backend/src/main/java/com/spacetime/admin/dto/request/RoleSaveReq.java`
- Create: `backend/src/main/java/com/spacetime/admin/dto/response/RoleVO.java`

- [ ] **Step 1: 创建 SysRole Entity**

```java
package com.spacetime.common.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_role")
public class SysRole extends BaseEntity {
    private String name;
    private String label;
    private Integer sortOrder;
    private String status;
    private String remark;
}
```

- [ ] **Step 2: 创建 SysRoleMapper.java**

```java
package com.spacetime.common.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.spacetime.common.entity.SysRole;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SysRoleMapper extends BaseMapper<SysRole> {
}
```

- [ ] **Step 3: 创建 RoleDao.java / RoleDaoImpl.java**

```java
package com.spacetime.common.dao;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.entity.SysRole;

public interface RoleDao {
    Page<SysRole> selectPage(Page<SysRole> page, String name, String status);
}
```

```java
package com.spacetime.common.dao.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.spacetime.common.dao.RoleDao;
import com.spacetime.common.entity.SysRole;
import com.spacetime.common.mapper.SysRoleMapper;
import cn.hutool.core.util.StrUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class RoleDaoImpl implements RoleDao {

    private final SysRoleMapper sysRoleMapper;

    @Override
    public Page<SysRole> selectPage(Page<SysRole> page, String name, String status) {
        LambdaQueryWrapper<SysRole> wrapper = new LambdaQueryWrapper<>();
        wrapper.like(StrUtil.isNotBlank(name), SysRole::getName, name);
        wrapper.eq(StrUtil.isNotBlank(status), SysRole::getStatus, status);
        wrapper.orderByAsc(SysRole::getSortOrder);
        return sysRoleMapper.selectPage(page, wrapper);
    }
}
```

- [ ] **Step 4: 创建 DTO**

```java
package com.spacetime.admin.dto.request;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class RolePageReq extends com.spacetime.common.dto.PageReq {
    private String name;
    private String status;
}
```

(需要先创建 PageReq 基类):

```java
package com.spacetime.common.dto;

import lombok.Data;

@Data
public class PageReq {
    private int page = 1;
    private int size = 20;
    private String sortBy;
    private String sortDir;
}
```

- [ ] **Step 5: 创建 Service + Controller**

RoleService、RoleServiceImpl、RoleController 按模板编写：分页列表、新增、编辑、删除、停用/启用。

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: add role management CRUD"
```

---

## Phase 5-7: 后续模块概要

以下模块均按上述分层模式（Controller → Service → ServiceImpl → DAO → DAOImpl → Mapper）实现，每个模块独立 Commit。

### Task 5.x: 权限管理
- `SysPermission` Entity + Mapper
- 树形查询接口（按 type 分组返回菜单/按钮/API/数据四类权限树）
- 角色权限分配接口

### Task 5.y: 管理员账号管理
- `SysUserRole` 关联表操作
- 账号增删改查、启用禁用、重置密码

### Task 5.z: 用户中心
- `AppUser` 分页查询 + 详情 + 启用/禁用/冻结
- `AppUserAuth` 认证审核列表 + 通过/驳回

### Task 6.x: 量表管理
- `Scale` + `ScaleDimension` + `ScaleQuestion` + `ScaleQuestionOption` + `ScaleResultRange` 全套 CRUD
- 版本管理（上架/下架/回滚）

### Task 6.y: 财务管理
- `PayOrder` 订单列表 + 详情 + 异常标记
- `PayRefund` 退款审核（同意/驳回）
- 对账差异导出

### Task 6.z: 推广管理
- `PromotionRule` 规则配置
- `PromotionRecord` 推广记录查询 + 导出
- `PromotionAgent` 代理信息录入 + 二维码生成 + 统计

### Task 7.x: 系统配置
- `SysConfig` KV 配置增删改查
- 配置变更日志

---

## Phase 8: 小程序后端 API

### Task 8.x: 觅缘推荐

- [ ] **Step 1: 创建 MateController**

```java
package com.spacetime.miniapp.controller;

import com.spacetime.common.result.R;
import com.spacetime.miniapp.service.MateService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/miniapp/mate")
@RequiredArgsConstructor
public class MateController {

    private final MateService mateService;

    @GetMapping("/recommend")
    public R<?> recommend() {
        return R.ok(mateService.recommend());
    }

    @PostMapping("/like/{userId}")
    public R<?> like(@PathVariable Long userId) {
        mateService.like(userId);
        return R.ok();
    }

    @PostMapping("/skip/{userId}")
    public R<?> skip(@PathVariable Long userId) {
        mateService.skip(userId);
        return R.ok();
    }

    @GetMapping("/history")
    public R<?> history() {
        return R.ok(mateService.history());
    }
}
```

(Service 接口 + 实现 + DAO 以此类推)

### Task 8.y: VIP 与成家币
- 套餐配置查询（从 `sys_config` 读取）
- 下单接口（生成 `PayOrder`，返回支付参数）
- 支付回调处理（验证签名，更新订单状态，发放权益/成家币）

### Task 8.z: 社区动态
- 发布动态（文本 + 图片上传 OSS）
- 动态列表（推荐/最新 切换）
- 点赞/评论

---

## Phase 9: 管理后台前端

### Task 9.1: 前端项目初始化

**Files:**
- Create: `admin-web/` (Vite + React + TypeScript 项目)

- [ ] **Step 1: 创建项目**

```bash
cd admin-web
npm create vite@latest . -- --template react-ts
npm install react-router-dom axios zustand
npx shadcn@latest init
npx shadcn@latest add button input table dialog dropdown-menu sheet sidebar
npm install echarts
```

- [ ] **Step 2: 配置 Tailwind + Vite**

按 shadcn/ui 默认配置即可，无需额外调整。

- [ ] **Step 3: 创建 axios 实例 src/api/request.ts**

```typescript
import axios from 'axios';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['X-Auth-Token'] = token;
  }
  return config;
});

request.interceptors.response.use(
  (res) => {
    if (res.data.code !== 200) {
      throw new Error(res.data.msg);
    }
    return res.data;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default request;
```

- [ ] **Step 4: Commit**

```bash
git add admin-web/
git commit -m "feat: init React admin frontend with Vite + shadcn/ui"
```

---

### Task 9.2: 登录 + 路由守卫

**Files:**
- Create: `admin-web/src/stores/authStore.ts`
- Create: `admin-web/src/pages/login/LoginPage.tsx`
- Create: `admin-web/src/router/index.tsx`
- Create: `admin-web/src/router/guard.tsx`

- [ ] **Step 1: 创建 Zustand authStore**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import request from '@/api/request';

interface AuthState {
  token: string | null;
  user: { nickname: string; permissions: string[] } | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (username, password) => {
        const res = await request.post('/admin/login', { username, password });
        set({ token: res.data.token, user: res.data });
        localStorage.setItem('token', res.data.token);
      },
      logout: () => {
        set({ token: null, user: null });
        localStorage.removeItem('token');
      },
    }),
    { name: 'auth' }
  )
);
```

- [ ] **Step 2: 创建路由守卫 guard.tsx**

```tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 3: Commit**

```bash
git add admin-web/
git commit -m "feat: add login page, auth store and route guard"
```

---

### Task 9.3: AppLayout + 侧边栏 + 页面骨架

**Files:**
- Create: `admin-web/src/components/layout/AppLayout.tsx`
- Create: `admin-web/src/components/layout/Sidebar.tsx`
- Create: `admin-web/src/components/common/DataTable.tsx`
- Create: `admin-web/src/hooks/useTable.ts`

(按设计文档页面模块逐个实现：用户管理、认证审核、量表管理、财务中心、运营中心、系统管理、推广管理)

---

## Phase 10: Docker 部署

### Task 10.1: Dockerfile + docker-compose

**Files:**
- Create: `backend/Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: 创建 Dockerfile**

```dockerfile
FROM eclipse-temurin:21-jre-alpine
COPY target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

- [ ] **Step 2: 创建 docker-compose.yml**

```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: spacetime
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    environment:
      SPRING_PROFILES_ACTIVE: prod
      DB_HOST: mysql
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
      OSS_ACCESS_KEY: ${OSS_ACCESS_KEY}
      OSS_ACCESS_SECRET: ${OSS_ACCESS_SECRET}
    ports:
      - "8080:8080"
    depends_on:
      - mysql
      - redis

volumes:
  mysql_data:
```

- [ ] **Step 3: Commit**

```bash
git add backend/Dockerfile docker-compose.yml
git commit -m "feat: add Dockerfile and docker-compose for deployment"
```

---

## Summary

| Phase | Tasks | 说明 |
|-------|-------|------|
| 1 | 1.1-1.3 | 项目搭建 + 公共类 |
| 2 | 2.1 | 数据库 DDL |
| 3 | 3.1-3.2 | Token 拦截器 + Redis + OSS |
| 4 | 4.1-4.2+ | 管理后台认证 + 角色管理 |
| 5 | 5.x-5.z | 权限 + 账号 + 用户管理 |
| 6 | 6.x-6.z | 量表 + 财务 + 推广 |
| 7 | 7.x | 系统配置 |
| 8 | 8.x-8.z | 小程序 API |
| 9 | 9.1-9.3 | 管理后台前端 |
| 10 | 10.1 | Docker 部署 |

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | ISSUES_OPEN | 9 issues, 1 critical gap |
| DX Review | `/plan-devex-review` | Developer experience gaps | 1 | ISSUES_OPEN | score 6.6→8.0/10, TTHW: N/A→<5min |
| CEO Review | — | Scope & strategy | 0 | — | — |
| Design Review | — | UI/UX gaps | 0 | — | — |
| Adversarial | — | Independent 2nd opinion | 0 | — | — |
| Outside Voice | — | Cross-model check | 0 | — | — |

- **ENG:** 9 issues, all resolved. Changes (D2-D12) apply to Phase 3-4.
- **DX:** score 6.6→8.0/10 (DX POLISH mode). Changes (D13-D20) apply to Phase 1 + 9.
- **UNRESOLVED:** 0 (all 20 decisions resolved)
- **VERDICT:** ENG + DX CLEARED — plan updated, ready to implement framework skeleton
