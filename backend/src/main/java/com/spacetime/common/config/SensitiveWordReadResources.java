package com.spacetime.common.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import com.spacetime.common.sensitiveword.persistence.SensitiveWordReadMapper;
import org.apache.ibatis.mapping.Environment;
import org.apache.ibatis.session.*;
import org.apache.ibatis.transaction.jdbc.JdbcTransactionFactory;

/** 封装专用连接池及工厂，避免第二个 DataSource/SqlSessionFactory bean 干扰 Boot 主库装配。 */
public final class SensitiveWordReadResources implements AutoCloseable {
    /** 专用池最多占用两个主库连接。 */
    private final HikariDataSource pool;
    /** 不使用 SpringManagedTransaction，不复用业务事务和缓存。 */
    private final SqlSessionFactory factory;

    /** 复用主库连接配置，启动时不要求数据库在线，不打印凭证。 */
    public SensitiveWordReadResources(String url,String username,String password,String driver) {
        HikariConfig config=new HikariConfig();
        config.setPoolName("sensitive-word-reader");config.setJdbcUrl(url);
        config.setUsername(username);config.setPassword(password);
        if(driver!=null&&!driver.isBlank())config.setDriverClassName(driver);
        config.setMaximumPoolSize(2);config.setMinimumIdle(0);
        config.setConnectionTimeout(500);config.setValidationTimeout(250);config.setInitializationFailTimeout(-1);
        config.addDataSourceProperty("connectTimeout","1000");config.addDataSourceProperty("socketTimeout","2000");
        pool=new HikariDataSource(config);
        Configuration configuration=new Configuration(new Environment("sensitive-word-reader",new JdbcTransactionFactory(),pool));
        configuration.setMapUnderscoreToCamelCase(true);configuration.setCacheEnabled(false);
        configuration.setLocalCacheScope(LocalCacheScope.STATEMENT);configuration.addMapper(SensitiveWordReadMapper.class);
        factory=new SqlSessionFactoryBuilder().build(configuration);
    }

    /** 每次独立 autoCommit 会话，由调用方立即关闭。 */
    public SqlSession openSession(){return factory.openSession(true);}

    /** 容器关闭时释放专用池。 */
    @Override public void close(){pool.close();}
}
