package com.spacetime.common.dao;

import com.spacetime.common.dao.impl.AppRelationLikeDaoImpl;
import com.spacetime.common.dao.impl.AppRelationLikeInboxStateDaoImpl;
import com.spacetime.common.dao.impl.AppRelationMatchDaoImpl;
import com.spacetime.common.dao.impl.AppRelationMatchPopupDaoImpl;
import com.spacetime.common.dao.impl.AppRelationMatchSourceDaoImpl;
import com.spacetime.common.dao.impl.AppRelationVisitCursorDaoImpl;
import com.spacetime.common.dao.impl.AppRelationVisitDaoImpl;
import com.spacetime.common.dao.impl.AppRelationVisitEventDaoImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.stereotype.Repository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** 关系反馈 DAO 六层架构契约测试。 */
@DisplayName("关系反馈DAO架构")
class RelationDaoArchitectureTest {

    @Test
    @DisplayName("每张关系表应有DAO接口和Repository实现")
    void everyRelationTableShouldHaveDaoAndRepositoryImplementation() {
        List<Class<?>> daos = List.of(
                AppRelationLikeDao.class,
                AppRelationLikeInboxStateDao.class,
                AppRelationVisitDao.class,
                AppRelationVisitEventDao.class,
                AppRelationVisitCursorDao.class,
                AppRelationMatchDao.class,
                AppRelationMatchSourceDao.class,
                AppRelationMatchPopupDao.class);
        List<Class<?>> implementations = List.of(
                AppRelationLikeDaoImpl.class,
                AppRelationLikeInboxStateDaoImpl.class,
                AppRelationVisitDaoImpl.class,
                AppRelationVisitEventDaoImpl.class,
                AppRelationVisitCursorDaoImpl.class,
                AppRelationMatchDaoImpl.class,
                AppRelationMatchSourceDaoImpl.class,
                AppRelationMatchPopupDaoImpl.class);

        assertThat(daos).allMatch(Class::isInterface);
        assertThat(daos).allMatch(RelationCrudDao.class::isAssignableFrom);
        assertThat(implementations).allMatch(type -> type.isAnnotationPresent(Repository.class));
    }

    @Test
    @DisplayName("并发关键DAO应暴露数据库行锁查询")
    void concurrencyDaosShouldExposeForUpdateQueries() throws NoSuchMethodException {
        assertThat(AppRelationVisitCursorDao.class.getMethod("selectPairForUpdate", Long.class, Long.class)).isNotNull();
        assertThat(AppRelationMatchDao.class.getMethod("selectActivePairForUpdate", Long.class, Long.class)).isNotNull();
        assertThat(AppRelationMatchDao.class.getMethod("selectByIdForUpdate", Long.class)).isNotNull();
        assertThat(AppRelationMatchSourceDao.class.getMethod("selectByIdForUpdate", Long.class)).isNotNull();
    }
}
