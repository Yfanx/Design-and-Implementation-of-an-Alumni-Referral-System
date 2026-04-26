package cn.iocoder.yudao.module.referral.config;

import cn.iocoder.yudao.module.referral.security.AppApiAuthInterceptor;
import jakarta.annotation.Resource;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AppWebMvcConfig implements WebMvcConfigurer {

    @Resource
    private AppApiAuthInterceptor appApiAuthInterceptor;
    @Resource
    private ReferralFileProperties referralFileProperties;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(appApiAuthInterceptor)
                .addPathPatterns("/referral/**")
                .excludePathPatterns("/auth/**");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String publicPrefix = referralFileProperties.normalizePublicPrefix() + "**";
        String location = referralFileProperties.resolveUploadRoot().toUri().toString();
        registry.addResourceHandler(publicPrefix)
                .addResourceLocations(location);
    }
}
