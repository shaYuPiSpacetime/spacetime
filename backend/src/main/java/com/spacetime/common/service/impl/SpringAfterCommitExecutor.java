package com.spacetime.common.service.impl;

import com.spacetime.common.service.AfterCommitExecutor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** 使用 Spring 事务同步器隔离上游事实与派生消息。 */
@Component
public class SpringAfterCommitExecutor implements AfterCommitExecutor {
    @Override
    public void execute(Runnable action) {
        if (TransactionSynchronizationManager.isActualTransactionActive()
                && TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
            return;
        }
        action.run();
    }
}
