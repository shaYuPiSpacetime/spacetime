package com.spacetime.common.service;

/** 在当前事务成功提交后执行非关键派生动作。 */
public interface AfterCommitExecutor {
    void execute(Runnable action);
}
