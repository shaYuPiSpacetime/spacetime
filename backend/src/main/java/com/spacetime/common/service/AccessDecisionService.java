package com.spacetime.common.service;

import com.spacetime.common.dto.AccessDecision;
import com.spacetime.common.entity.AppUser;
import com.spacetime.common.entity.AppUserVerification;

public interface AccessDecisionService {
    AccessDecision decide(AppUser user, AppUserVerification verification);
}
