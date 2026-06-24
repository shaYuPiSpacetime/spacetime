# 技术框架文档（通用模板）

> 适用于 **管理后台（React） + Java 后端（Spring Boot）** 项目启动。
> 纯技术框架，无业务逻辑，可直接复制为新项目脚手架参考。

---

## 目录

- [1. 总体架构](#1-总体架构)
- [2. 后端技术栈](#2-后端技术栈)
- [3. 后端项目结构](#3-后端项目结构)
- [4. 后端六层架构](#4-后端六层架构)
- [5. 后端基础设施](#5-后端基础设施)
- [6. 后端配置](#6-后端配置)
- [7. 数据库规范](#7-数据库规范)
- [8. 前端技术栈](#8-前端技术栈)
- [9. 前端项目结构](#9-前端项目结构)
- [10. 前端基础设施](#10-前端基础设施)
- [11. 工程化配置](#11-工程化配置)

---

## 1. 总体架构

```
┌─────────────────────────────────────────────┐
│                  Nginx / CDN                  │
└────────────────┬────────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    ▼                         ▼
┌──────────┐          ┌──────────────┐
│ 管理后台  │          │  小程序前端   │
│ React 18 │          │  (独立项目)   │
│ Vite     │          │  Taro + React│
└────┬─────┘          └──────┬───────┘
     │  HTTP / JSON           │  HTTP / JSON
     └────────┬───────────────┘
              │
              ▼
    ┌──────────────────┐
    │  Spring Boot 3.4  │
    │  Java 21          │
    │  ┌──────────────┐ │
    │  │ admin/ 模块   │ │  ← 管理后台接口
    │  │ miniapp/ 模块 │ │  ← 小程序接口
    │  │ common/ 公共  │ │  ← 共享基础设施
    │  └──────────────┘ │
    └────┬──────┬──────┘
         │      │
         ▼      ▼
    ┌────────┐ ┌───────┐
    │ MySQL  │ │ Redis │
    │ 8.0    │ │ 7.x   │
    └────────┘ └───────┘
```

**关键约束：**
- `admin/` 和 `miniapp/` 两个模块只能依赖 `common/`，互相不可调用
- 前端通过 Vite proxy 转发 `/api` 到后端 `8080` 端口

---

## 2. 后端技术栈

| 组件 | 版本 | 用途 |
|------|------|------|
| Java | 21 | 运行环境 |
| Spring Boot | 3.4.1 | 核心框架 |
| MyBatis-Plus | 3.5.16 | ORM + 分页 |
| MySQL | 8.0 | 关系数据库 |
| Redis | 7.x | 缓存 + Session |
| Hutool | 5.8.32 | 工具库 |
| Knife4j | 4.5.0 | API 文档（Swagger） |
| Lombok | 1.18.38 | 代码简化 |
| Ali OSS | 3.18.1 | 对象存储（可选） |

### Maven 依赖（pom.xml 骨架）

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.4.1</version>
</parent>

<properties>
    <java.version>21</java.version>
    <mybatis-plus.version>3.5.16</mybatis-plus.version>
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
    <dependency>
        <groupId>com.baomidou</groupId>
        <artifactId>mybatis-plus-jsqlparser</artifactId>
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

    <!-- Knife4j (API 文档) -->
    <dependency>
        <groupId>com.github.xiaoymin</groupId>
        <artifactId>knife4j-openapi3-jakarta-spring-boot-starter</artifactId>
        <version>${knife4j.version}</version>
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
```

---

## 3. 后端项目结构

```
backend/src/main/java/com/<project>/
├── <Project>Application.java          # Spring Boot 启动类
├── common/                             # 公共模块（基础设施）
│   ├── annotation/                     # 自定义注解（如 @RequirePermission）
│   ├── config/                         # 配置类（Jackson, MyBatis-Plus, Redis, OSS）
│   ├── constant/                       # 常量（Token 前缀等）
│   ├── dao/                            # DAO 接口（数据访问层）
│   │   └── impl/                       # DAO 实现（注入 Mapper，封装查询逻辑）
│   ├── dto/                            # 通用 DTO（分页请求等）
│   ├── entity/                         # 数据库实体（继承 BaseEntity）
│   ├── enums/                          # 枚举（状态码、业务枚举）
│   ├── exception/                      # 异常类 + 全局异常处理器
│   ├── interceptor/                    # 拦截器（Token 校验、权限校验）
│   ├── mapper/                         # MyBatis Mapper（继承 BaseMapper）
│   ├── result/                         # 统一返回体 R<T>
│   ├── service/                        # 公共 Service（可选）
│   │   └── impl/
│   └── util/                           # 工具类（脱敏、OSS 等）
├── admin/                              # 管理后台模块
│   ├── controller/                     # 控制器
│   ├── service/                        # Service 接口
│   │   └── impl/                       # Service 实现
│   └── dto/                            # 管理后台专用 DTO
│       ├── request/                    # 请求参数
│       └── response/                   # 返回 VO
└── miniapp/                            # 小程序模块（结构同 admin）
    ├── controller/
    ├── service/
    │   └── impl/
    └── dto/
        ├── request/
        └── response/
```

---

## 4. 后端六层架构

### 4.1 调用链路（自上而下、逐层依赖）

```
Controller   →  接收 HTTP 请求、参数校验、调用 Service、返回 R
    │
    ▼
Service      →  业务逻辑接口（定义方法签名）
    │
    ▼
ServiceImpl  →  业务逻辑实现、调用 DAO、事务管理
    │
    ▼
DAO          →  数据访问接口（定义查询方法）
    │
    ▼
DAOImpl      →  数据访问实现、组装 LambdaQueryWrapper、调用 MyBatis Mapper
    │
    ▼
Mapper       →  MyBatis-Plus BaseMapper（数据库映射，只定义不实现）
```

### 4.2 关键约束

> - **Controller 不能跳过 Service 直接调 DAO**
> - **ServiceImpl 不能跳过 DAO 直接调 MyBatis Mapper**
> - **只有 DAOImpl 可以注入和调用 MyBatis Mapper**
> - **admin/ 和 miniapp/ 只能依赖 common/，互相不可调用**

### 4.3 各层代码模板

#### Controller

```java
/**
 * 角色管理控制器
 */
@RestController
@RequestMapping("/admin/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    /** 分页查询 */
    @GetMapping
    @RequirePermission("system:role:list")
    public R<Page<RoleVO>> list(RolePageReq req) {
        return R.ok(roleService.list(req));
    }

    /** 创建 */
    @PostMapping
    @RequirePermission("system:role:create")
    public R<Long> create(@Valid @RequestBody RoleCreateReq req) {
        return R.ok(roleService.create(req));
    }
}
```

#### Service 接口

```java
/**
 * 角色管理服务接口
 */
public interface RoleService {
    /** 分页查询角色列表 */
    Page<RoleVO> list(RolePageReq req);
    /** 创建角色 */
    Long create(RoleCreateReq req);
}
```

#### ServiceImpl

```java
/**
 * 角色管理服务实现
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleDao roleDao;  // 只注入 DAO，不注入 Mapper

    @Override
    public Page<RoleVO> list(RolePageReq req) {
        LambdaQueryWrapper<SysRole> wrapper = new LambdaQueryWrapper<SysRole>()
                .like(StrUtil.isNotBlank(req.getKeyword()), SysRole::getRoleName, req.getKeyword())
                .orderByAsc(SysRole::getRoleSort);
        Page<SysRole> page = roleDao.selectPage(
                new Page<>(req.getPage(), req.getSize()), wrapper);
        // 转换为 VO 返回
        Page<RoleVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toVO).toList());
        return result;
    }
}
```

#### DAO 接口

```java
/**
 * 角色数据访问层接口
 */
public interface RoleDao {
    /** 分页查询 */
    Page<SysRole> selectPage(Page<SysRole> page, LambdaQueryWrapper<SysRole> wrapper);
    /** 按 ID 查询 */
    SysRole selectById(Long id);
    /** 按编码查询 */
    SysRole selectByCode(String code);
    /** 插入 */
    void insert(SysRole role);
    /** 更新 */
    void updateById(SysRole role);
    /** 删除 */
    void deleteById(Long id);
}
```

#### DAOImpl

```java
/**
 * 角色数据访问层实现
 */
@Repository
@RequiredArgsConstructor
public class RoleDaoImpl implements RoleDao {

    private final SysRoleMapper sysRoleMapper;  // 只有 DAOImpl 注入 Mapper

    @Override
    public Page<SysRole> selectPage(Page<SysRole> page, LambdaQueryWrapper<SysRole> wrapper) {
        return sysRoleMapper.selectPage(page, wrapper);
    }

    @Override
    public SysRole selectByCode(String code) {
        return sysRoleMapper.selectOne(new LambdaQueryWrapper<SysRole>()
                .eq(SysRole::getRoleCode, code));
    }
}
```

#### MyBatis Mapper

```java
/**
 * 系统角色 Mapper（数据库映射接口）
 */
@Mapper
public interface SysRoleMapper extends BaseMapper<SysRole> {
    // 简单 CRUD 由 MyBatis-Plus BaseMapper 自动提供
    // 复杂查询可在此定义 XML 映射方法
}
```

#### DTO 分层

```java
// common/dto/PageReq.java — 分页请求基类
@Data
public class PageReq {
    private int page = 1;
    private int size = 20;
    public int getSize() { return Math.min(size, 100); }  // 防刷
}

// admin/dto/request/RolePageReq.java — 业务分页请求
@Data
@EqualsAndHashCode(callSuper = true)
public class RolePageReq extends PageReq {
    private String keyword;
    private String status;
}

// admin/dto/request/RoleCreateReq.java — 创建请求
@Data
public class RoleCreateReq {
    @NotBlank(message = "角色名称不能为空")
    private String roleName;
    @NotBlank(message = "角色编码不能为空")
    private String roleCode;
    private Integer roleSort;
}

// admin/dto/response/RoleVO.java — 列表返回
@Data
public class RoleVO {
    private Long id;
    private String roleName;
    private String roleCode;
    private LocalDateTime createTime;
}
```

---

## 5. 后端基础设施

### 5.1 统一返回体 `R<T>`

```java
/**
 * 统一返回体，所有 Controller 返回此对象
 */
@Data
public class R<T> {
    private int code;
    private String msg;
    private T data;

    public static <T> R<T> ok(T data) { ... }
    public static <T> R<T> ok() { return ok(null); }
    public static <T> R<T> fail(ResultCodeEnum code) { ... }
    public static <T> R<T> fail(int code, String msg) { ... }
    public static <T> R<T> fail(String msg) { ... }
}
```

**Controller 必须返回具体类型，禁止 `R<?>` 通配符：**

```java
// ✅ 正确
R<LoginVO> login(...)
R<Page<UserVO>> page(...)
R<Void> delete(...)

// ❌ 禁止
R<?> login(...)
```

### 5.2 错误码枚举 `ResultCodeEnum`

```java
@Getter
public enum ResultCodeEnum {
    SUCCESS(200, "success"),
    UNAUTHORIZED(401, "未登录或登录已过期"),
    FORBIDDEN(403, "无权限"),
    NOT_FOUND(404, "资源不存在"),
    PARAM_ERROR(4001, "参数错误"),
    BUSINESS_ERROR(5001, "业务异常"),
    SYSTEM_ERROR(5000, "系统异常");
    // ...
}
```

### 5.3 实体基类 `BaseEntity`

```java
/**
 * 实体基类，所有数据库实体继承此类
 */
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
    private Integer deleted;  // 0=正常, 1=已删除
}
```

### 5.4 异常体系

```java
/**
 * 业务异常，由 GlobalExceptionHandler 统一捕获
 */
@Getter
public class BusinessException extends RuntimeException {
    private final int code;

    public BusinessException(ResultCodeEnum code) { ... }
    public BusinessException(int code, String msg) { ... }
    public BusinessException(String msg) { ... }  // code 默认 BUSINESS_ERROR
}
```

```java
/**
 * 全局异常处理器
 * - BusinessException → 返回业务错误码和 msg
 * - MethodArgumentNotValidException → 返回参数校验失败详情
 * - Exception → 生成 requestId，记录完整堆栈，返回系统异常
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public R<Void> handleBusinessException(BusinessException e) {
        log.warn("business error: {}", e.getMessage());
        return R.fail(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public R<Void> handleMethodArgumentNotValid(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return R.fail(ResultCodeEnum.PARAM_ERROR.getCode(), message);
    }

    @ExceptionHandler(Exception.class)
    public R<Void> handleException(Exception e) {
        String requestId = IdUtil.simpleUUID();
        log.error("system error, requestId: {}", requestId, e);
        return R.fail(ResultCodeEnum.SYSTEM_ERROR.getCode(),
                "系统异常，请联系管理员，请求ID: " + requestId);
    }
}
```

> **禁止在各层 try-catch**，统一抛 `BusinessException` 由全局处理器处理。

### 5.5 鉴权体系

#### Token 存储规范

| 端 | Redis Key 前缀 | 请求头 |
|----|---------------|--------|
| 管理后台 | `admin:token:` | `X-Auth-Token` |
| 小程序 | `miniapp:token:` | `X-Auth-Token` |

#### TokenInterceptor（登录校验）

```java
/**
 * 登录拦截器
 * 1. 取 token → 2. 判断前缀 → 3. 查 Redis → 4. 写入 ThreadLocal
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TokenInterceptor implements HandlerInterceptor {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {
        // 1. 获取 token
        String token = request.getHeader("X-Auth-Token");
        if (StrUtil.isBlank(token)) {
            response.setStatus(401);
            response.getOutputStream().write("{\"code\":401,\"msg\":\"未登录\"}".getBytes());
            return false;
        }
        // 2. 根据 URI 前缀选 Redis key
        String prefix = request.getRequestURI().startsWith("/admin/")
                ? "admin:token:" : "miniapp:token:";
        // 3. 从 Redis 读取用户上下文
        String json = redisTemplate.opsForValue().get(prefix + token);
        if (json == null) {
            response.setStatus(401);
            response.getOutputStream().write("{\"code\":401,\"msg\":\"登录已过期\"}".getBytes());
            return false;
        }
        // 4. 写入 ThreadLocal
        UserContext context = objectMapper.readValue(json, UserContext.class);
        UserContextHolder.set(context);
        return true;
    }

    @Override
    public void afterCompletion(...) {
        UserContextHolder.clear();  // 防止内存泄漏
    }
}
```

#### PermissionInterceptor（权限校验）

```java
/**
 * 权限拦截器，在 TokenInterceptor 之后执行
 * 读取 @RequirePermission 注解，校验用户是否拥有所需权限
 */
@Slf4j
@Component
public class PermissionInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod hm)) return true;
        // 读取注解
        RequirePermission annotation = hm.getMethodAnnotation(RequirePermission.class);
        if (annotation == null) return true;  // 无注解 → 放行
        // 校验权限
        UserContext ctx = UserContextHolder.get();
        if (ctx == null || !ctx.getPermissions().contains(annotation.value())) {
            response.setStatus(403);
            response.getOutputStream().write("{\"code\":403,\"msg\":\"无权限\"}".getBytes());
            return false;
        }
        return true;
    }
}
```

#### @RequirePermission 注解

```java
/**
 * 权限校验注解，值格式为 module:entity:action，如 system:user:list
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequirePermission {
    String value();
}
```

#### UserContext + ThreadLocal

```java
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserContext {
    private Long id;
    private String nickname;
    private List<String> roles;
    private List<String> permissions;  // 如 system:user:list
}

public class UserContextHolder {
    private static final ThreadLocal<UserContext> CONTEXT = new ThreadLocal<>();

    public static void set(UserContext context) { CONTEXT.set(context); }
    public static UserContext get() { return CONTEXT.get(); }
    public static void clear() { CONTEXT.remove(); }
}
```

#### 拦截器注册

```java
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final TokenInterceptor tokenInterceptor;
    private final PermissionInterceptor permissionInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 登录拦截器：拦截 admin 和 miniapp，放行登录接口
        registry.addInterceptor(tokenInterceptor)
                .addPathPatterns("/admin/**", "/miniapp/**")
                .excludePathPatterns("/admin/login", "/miniapp/auth/**");

        // 权限拦截器：仅拦截 admin，放行登录/退出/路由
        registry.addInterceptor(permissionInterceptor)
                .addPathPatterns("/admin/**")
                .excludePathPatterns("/admin/login", "/admin/logout", "/admin/routers");
    }
}
```

#### 密码加密

```java
// 使用 Hutool SecureUtil.bcrypt()
String hashed = SecureUtil.bcrypt(rawPassword);
boolean match = SecureUtil.bcryptCheck(rawPassword, hashedPassword);
```

---

## 6. 后端配置

### 6.1 application.yml（主配置）

```yaml
server:
  port: 8080

spring:
  application:
    name: <project-name>
  profiles:
    active: dev
  jackson:
    date-format: yyyy-MM-dd HH:mm:ss
    time-zone: GMT+8
    default-property-inclusion: non_null  # null 字段不返回
```

### 6.2 application-dev.yml（开发环境）

```yaml
spring:
  datasource:
    url: jdbc:mysql://<host>:3306/<db>?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai
    username: <username>
    password: <password>
    driver-class-name: com.mysql.cj.jdbc.Driver
  data:
    redis:
      host: <redis-host>
      port: 6379
      database: 1
      password: <password>

mybatis-plus:
  configuration:
    map-underscore-to-camel-case: true          # 下划线转驼峰
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl  # 开发环境 SQL 日志
  global-config:
    db-config:
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0

knife4j:
  enable: true  # 开发环境开启 API 文档

logging:
  level:
    com.<project>: DEBUG
```

### 6.3 Jackson 时间序列化配置

```java
/**
 * 时间字段统一输出为字符串：LocalDateTime → "yyyy-MM-dd HH:mm:ss"
 */
@Configuration
public class JacksonConfig {

    private static final String DATE_TIME_PATTERN = "yyyy-MM-dd HH:mm:ss";
    private static final String DATE_PATTERN = "yyyy-MM-dd";
    private static final String TIME_PATTERN = "HH:mm:ss";

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jackson2ObjectMapperBuilderCustomizer() {
        return builder -> {
            JavaTimeModule module = new JavaTimeModule();
            module.addSerializer(new LocalDateTimeSerializer(
                    DateTimeFormatter.ofPattern(DATE_TIME_PATTERN)));
            module.addSerializer(new LocalDateSerializer(
                    DateTimeFormatter.ofPattern(DATE_PATTERN)));
            module.addSerializer(new LocalTimeSerializer(
                    DateTimeFormatter.ofPattern(TIME_PATTERN)));
            builder.modules(module);
        };
    }
}
```

### 6.4 MyBatis-Plus 分页 + 自动填充配置

```java
/** MyBatis-Plus 分页插件 */
@Configuration
public class MybatisPlusConfig {
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }
}

/** 字段自动填充（createTime, updateTime, createdBy, updatedBy） */
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
```

### 6.5 Redis 序列化配置

```java
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

---

## 7. 数据库规范

### 7.1 表字段约束

**每张表必须包含以下字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `BIGINT AUTO_INCREMENT PRIMARY KEY` | 自增主键 |
| `create_time` | `DATETIME NOT NULL` | 创建时间（自动填充） |
| `update_time` | `DATETIME NOT NULL` | 更新时间（自动填充） |
| `created_by` | `BIGINT` | 创建人 ID（自动填充） |
| `updated_by` | `BIGINT` | 更新人 ID（自动填充） |
| `deleted` | `TINYINT DEFAULT 0` | 逻辑删除标记 |

### 7.2 全局规范

- **字符集**：`utf8mb4`，引擎：`InnoDB`
- **逻辑删除**：使用 `@TableLogic`，禁止物理删除
- **日期类型**：统一使用 `LocalDateTime`，禁用 `java.util.Date`
- **枚举字段**：实体中对应字段注释用 `@see` 关联枚举类

```java
/** 状态 @see CommonStatusEnum */
private String status;
```

### 7.3 实体模板

```java
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_user")
public class SysUser extends BaseEntity {
    /** 用户名 */
    private String username;
    /** 密码（BCrypt 加密） */
    private String password;
    /** 昵称 */
    private String nickname;
    /** 状态 @see CommonStatusEnum */
    private String status;
}
```

---

## 8. 前端技术栈

| 组件 | 版本 | 用途 |
|------|------|------|
| React | 18.3 | UI 框架 |
| TypeScript | 5.6 | 类型系统 |
| Vite | 6.0 | 构建工具 |
| React Router | 6.28 | 路由 |
| Axios | 1.7 | HTTP 客户端 |
| Zustand | 5.0 | 状态管理 |
| Tailwind CSS | 3.4 | 样式框架 |
| shadcn/ui (Radix) | — | UI 组件库 |
| Lucide React | 0.460 | 图标库 |
| Playwright | 1.60 | E2E 测试 |

### package.json 骨架

```json
{
  "name": "<project>-admin",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@radix-ui/react-avatar": "^1.1",
    "@radix-ui/react-dialog": "^1.1",
    "@radix-ui/react-dropdown-menu": "^2.1",
    "@radix-ui/react-select": "^2.2",
    "@radix-ui/react-slot": "^1.1",
    "axios": "^1.7",
    "class-variance-authority": "^0.7",
    "clsx": "^2.1",
    "lucide-react": "^0.460",
    "react": "^18.3",
    "react-dom": "^18.3",
    "react-router-dom": "^6.28",
    "tailwind-merge": "^2.6",
    "zustand": "^5.0"
  },
  "devDependencies": {
    "typescript": "~5.6",
    "vite": "^6.0",
    "@vitejs/plugin-react": "^4.3",
    "tailwindcss": "3.4",
    "tailwindcss-animate": "^1.0",
    "postcss": "^8.5",
    "autoprefixer": "^10.4",
    "@types/react": "^18.3",
    "@types/react-dom": "^18.3",
    "@playwright/test": "^1.60"
  }
}
```

---

## 9. 前端项目结构

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── playwright.config.ts
└── src/
    ├── main.tsx                       # 入口
    ├── App.tsx                        # 根组件
    ├── api/                           # API 请求模块
    │   ├── request.ts                 # Axios 实例 + 拦截器
    │   ├── auth.ts                    # 认证相关 API
    │   └── <module>.ts                # 按后端模块拆分
    ├── components/                    # 组件
    │   ├── ui/                        # shadcn/ui 基础组件
    │   │   ├── index.ts               # 统一导出
    │   │   ├── button.tsx
    │   │   ├── dialog.tsx
    │   │   ├── table.tsx
    │   │   ├── pagination.tsx
    │   │   ├── input.tsx
    │   │   ├── select.tsx
    │   │   ├── badge.tsx
    │   │   ├── card.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   ├── avatar.tsx
    │   │   └── toast.tsx
    │   └── layout/                    # 布局组件
    │       ├── AdminLayout.tsx         # 管理后台布局骨架
    │       ├── Header.tsx              # 顶部栏
    │       └── Sidebar.tsx             # 侧边栏
    ├── pages/                          # 页面（按模块分目录）
    │   ├── login/
    │   │   └── LoginPage.tsx
    │   ├── dashboard/
    │   │   └── DashboardPage.tsx
    │   └── <module>/
    │       └── <Module>Page.tsx
    ├── hooks/                          # 自定义 Hooks
    │   ├── usePermission.ts            # 权限校验 Hook
    │   └── useTable.ts                 # 分页表格 Hook（可选）
    ├── stores/                         # Zustand 状态管理
    │   ├── authStore.ts                # 认证状态
    │   └── menuStore.ts                # 菜单状态
    ├── router/                         # 路由
    │   ├── index.tsx                   # 路由表定义
    │   └── guard.tsx                   # 路由守卫
    ├── types/                          # TypeScript 类型
    │   └── <module>.ts                 # 按模块拆分，与后端 VO/Req 对齐
    ├── utils/                          # 工具函数
    │   ├── cn.ts                       # Tailwind class 合并（clsx + tailwind-merge）
    │   └── mask.ts                     # 脱敏工具函数
    └── lib/                            # 第三方库封装
        └── utils.ts                    # shadcn/ui 所需的 cn() 工具
```

---

## 10. 前端基础设施

### 10.1 Axios 封装

```typescript
// api/request.ts
import axios from 'axios';

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器：自动带 token
request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['X-Auth-Token'] = token;
  }
  return config;
});

// 响应拦截器：统一错误处理
request.interceptors.response.use(
  (res) => {
    if (res.data.code !== 200) {
      throw new Error(res.data.msg || '请求失败');
    }
    return res.data;  // 自动解包，调用方直接拿 data
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    if (err.response?.status === 403) {
      // toast 提示无权限
    }
    return Promise.reject(err);
  }
);

export default request;
```

### 10.2 API 模块模板

```typescript
// api/role.ts
import request from './request';
import type { RoleVO, RolePageReq, RoleCreateReq } from '@/types/role';

/** 分页查询角色列表 */
export function getRolePage(params: RolePageReq) {
  return request.get<never, { data: { records: RoleVO[]; total: number } }>('/admin/roles', { params });
}

/** 创建角色 */
export function createRole(data: RoleCreateReq) {
  return request.post<never, { data: number }>('/admin/roles', data);
}

/** 删除角色 */
export function deleteRole(id: number) {
  return request.delete(`/admin/roles/${id}`);
}
```

> **页面组件禁止直接 `import axios` 或调 `request`**，必须走 `api/` 封装。

### 10.3 路由配置

```tsx
// router/index.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './guard';
import { AdminLayout } from '@/components/layout/AdminLayout';
import LoginPage from '@/pages/login/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';

export default function AppRouter() {
  return (
    <Routes>
      {/* 登录页（无需鉴权） */}
      <Route path="/login" element={<LoginPage />} />

      {/* 管理后台（需登录） */}
      <Route path="/" element={<AuthGuard><AdminLayout /></AuthGuard>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        {/* ...更多页面路由 */}
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
```

### 10.4 路由守卫

```tsx
// router/guard.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

/** 未登录跳转到 /login */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
```

### 10.5 Zustand 状态管理（auth 示例）

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import request from '@/api/request';

interface AuthState {
  token: string | null;
  user: { nickname: string; avatar?: string; permissions: string[] } | null;
  login: (account: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (account, password) => {
        const res = await request.post('/admin/login', { account, password });
        set({ token: res.data.token, user: res.data });
        localStorage.setItem('token', res.data.token);
      },
      logout: () => {
        set({ token: null, user: null });
        localStorage.removeItem('token');
        request.post('/admin/logout').catch(() => {});
      },
    }),
    { name: 'auth' }  // 自动持久化到 localStorage
  )
);
```

### 10.6 权限 Hook

```typescript
// hooks/usePermission.ts
import { useAuthStore } from '@/stores/authStore';

export function usePermission() {
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);

  const hasPermission = (perm: string) => permissions.includes(perm);
  const hasAnyPermission = (...perms: string[]) => perms.some((p) => permissions.includes(p));
  const hasAllPermissions = (...perms: string[]) => perms.every((p) => permissions.includes(p));

  return { hasPermission, hasAnyPermission, hasAllPermissions };
}
```

### 10.7 页面模板

```tsx
// pages/<module>/<Module>Page.tsx
/**
 * 模块管理页面
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { usePermission } from '@/hooks/usePermission';

export default function ModulePage() {
  // 1. Hooks 声明
  const [keyword, setKeyword] = useState('');
  const { hasPermission } = usePermission();

  // 2. 事件处理
  const handleSearch = () => { /* ... */ };

  // 3. 枚举映射表（英文 code → 中文展示）
  const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' | 'secondary' }> = {
    ENABLED: { label: '启用', variant: 'success' },
    DISABLED: { label: '禁用', variant: 'secondary' },
  };

  // 4. 渲染
  return (
    <div className="p-6">
      {/* 搜索栏 */}
      <div className="flex gap-4 mb-4">
        <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="请输入关键词" />
        <Button onClick={handleSearch}>搜索</Button>
        {hasPermission('module:create') && <Button>新增</Button>}
      </div>

      {/* 表格 */}
      <Table data={[]} columns={[]} />

      {/* 分页 */}
      {/* <Pagination current={page} total={total} onChange={setPage} /> */}
    </div>
  );
}
```

### 10.8 布局组件

```tsx
// components/layout/AdminLayout.tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      <main className="pl-sidebar pt-header">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

### 10.9 样式规范

- **统一使用 Tailwind CSS class**，禁止内联 `style={}`
- **复用 class 使用 `cn()` 工具函数**（clsx + tailwind-merge）
- **主题色使用 CSS 变量**：`bg-primary`、`text-primary-foreground`

```tsx
import { cn } from '@/utils/cn';

<button className={cn("px-4 py-2 rounded", isActive && "bg-primary text-primary-foreground")}>
  按钮
</button>
```

### 10.10 类型定义规范

```typescript
// types/role.ts — 与后端 VO/Req 对齐
export interface RoleVO {
  id: number;
  roleName: string;
  roleCode: string;
  status: string;
  createTime: string;  // 后端已序列化为字符串
}

export interface RolePageReq {
  page: number;
  size: number;
  keyword?: string;
  status?: string;
}
```

### 10.11 禁止事项速查

| 禁止 | 正确做法 |
|------|---------|
| 页面内直接 `import axios` | 走 `api/` 封装的函数 |
| JSX 中写复杂业务逻辑 | 提取到 hooks 或 utils |
| 内联 `style={{}}` | 使用 Tailwind CSS class |
| 组件文件 export 多个组件 | 一个文件一个组件 |
| API 函数无类型标注 | 参数/返回值必须标注类型 |
| 枚举值直接展示英文 code | 定义映射表转为中文展示 |
| 页面组件写大量状态逻辑 | 提取到自定义 Hook |

---

## 11. 工程化配置

### 11.1 Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),  // /api/xxx → /xxx
      },
    },
  },
});
```

### 11.2 TypeScript 配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### 11.3 Tailwind CSS 配置（shadcn/ui 风格）

```typescript
// tailwind.config.ts
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### 11.4 后端 Maven 构建配置

```xml
<build>
    <plugins>
        <!-- Java 版本强制执行 -->
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-enforcer-plugin</artifactId>
            <version>3.5.0</version>
            <executions>
                <execution>
                    <id>enforce-java</id>
                    <goals><goal>enforce</goal></goals>
                    <configuration>
                        <rules>
                            <requireJavaVersion>
                                <version>[21,23)</version>
                            </requireJavaVersion>
                        </rules>
                    </configuration>
                </execution>
            </executions>
        </plugin>
        <!-- Spring Boot 打包 -->
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>
    </plugins>
</build>
```

---

## 附录：命名规范速查

| 类型 | 规则 | 示例 |
|------|------|------|
| Controller | `XxxController` | `UserController` |
| Service 接口 | `XxxService` | `UserService` |
| Service 实现 | `XxxServiceImpl` | `UserServiceImpl` |
| DAO 接口 | `XxxDao` | `UserDao` |
| DAO 实现 | `XxxDaoImpl` | `UserDaoImpl` |
| MyBatis Mapper | `XxxMapper` | `SysUserMapper` |
| 实体类（Entity） | 表名转大驼峰 | `sys_user` → `SysUser` |
| 请求 DTO | `XxxReq` | `UserPageReq` |
| 返回 VO | `XxxVO` | `UserVO` |
| 枚举类 | `XxxEnum` | `CommonStatusEnum` |
| 前端页面文件 | PascalCase | `UserManagement.tsx` |
| 前端页面目录 | kebab-case | `user-mgr/` |
| 前端 Hook | `useXxx.ts` | `useAuth.ts` |
| 前端 Store | `xxxStore.ts` | `authStore.ts` |

---

> **本文档保持技术框架纯净，不包含任何业务逻辑。**
> 可作为新项目启动时的脚手架参考，按需裁剪。
