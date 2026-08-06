package com.spacetime.common.dao;

import com.spacetime.common.dao.impl.IdealFilterSnapshotDaoImpl;
import com.spacetime.common.dao.impl.IdealSnapshotCandidateDaoImpl;
import com.spacetime.common.dao.impl.RecommendPreferenceDaoImpl;
import com.spacetime.common.dao.impl.RecommendViewLogDaoImpl;
import com.spacetime.common.mapper.IdealFilterSnapshotMapper;
import com.spacetime.common.mapper.IdealSnapshotCandidateMapper;
import com.spacetime.common.mapper.RecommendPreferenceMapper;
import com.spacetime.common.mapper.RecommendViewLogMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.stereotype.Repository;

import static org.assertj.core.api.Assertions.assertThat;

/** PRD-08 六层数据访问架构契约。 */
@DisplayName("PRD-08 数据访问六层架构")
class Prd08RecommendIdealDaoArchitectureTest {

    @Test
    @DisplayName("四个 DAO 实现应为 Repository 并只持有对应 Mapper")
    void daoImplementationsShouldOwnTheirMapper() {
        assertDao(RecommendPreferenceDaoImpl.class, RecommendPreferenceDao.class, RecommendPreferenceMapper.class);
        assertDao(IdealFilterSnapshotDaoImpl.class, IdealFilterSnapshotDao.class, IdealFilterSnapshotMapper.class);
        assertDao(IdealSnapshotCandidateDaoImpl.class, IdealSnapshotCandidateDao.class, IdealSnapshotCandidateMapper.class);
        assertDao(RecommendViewLogDaoImpl.class, RecommendViewLogDao.class, RecommendViewLogMapper.class);
    }

    private void assertDao(Class<?> implementation, Class<?> contract, Class<?> mapper) {
        assertThat(contract.isAssignableFrom(implementation)).isTrue();
        assertThat(implementation.getAnnotation(Repository.class)).isNotNull();
        assertThat(implementation.getDeclaredFields())
                .extracting(java.lang.reflect.Field::getType)
                .containsExactly(mapper);
    }
}
