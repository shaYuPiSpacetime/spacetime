package com.spacetime.common.provider.impl;

import com.aliyun.dytnsapi20200217.Client;
import com.aliyun.tea.TeaException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AliyunRealNameVerificationProviderTest {
    @Test
    void invalidIdentityParameterShouldBeRejectedImmediately() throws Exception {
        Client client = mock(Client.class);
        TeaException exception = new TeaException();
        exception.setCode("InvalidParameter");
        exception.setMessage("身份证号不合法");
        when(client.certNoTwoElementVerification(any())).thenThrow(exception);

        RealNameVerificationProperties properties = new RealNameVerificationProperties();
        AliyunRealNameVerificationProvider provider =
                new AliyunRealNameVerificationProvider(client, new ObjectMapper(), properties);

        var result = provider.check("黄康", "362526199309111250");

        assertThat(result.getSafe()).isFalse();
        assertThat(result.getRejectReason()).contains("身份证号不合法");
    }
}
