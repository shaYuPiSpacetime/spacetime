package com.spacetime.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionOperations;

/** 为消息两阶段编排提供显式事务边界。 */
@Configuration
public class MessageTransactionConfiguration {
    @Bean
    public TransactionOperations messageTransactionOperations(
            PlatformTransactionManager transactionManager) {
        return new TransactionTemplate(transactionManager);
    }
}
