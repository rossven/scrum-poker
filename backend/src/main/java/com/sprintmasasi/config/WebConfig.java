package com.sprintmasasi.config;

import java.time.Duration;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AppProperties props;

    public WebConfig(AppProperties props) {
        this.props = props;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        var origins = props.allowedOriginList();
        if (!origins.isEmpty()) {
            registry.addMapping("/api/**").allowedOrigins(origins.toArray(String[]::new)).allowedMethods("GET", "POST");
        }
    }

    /** Vite çıktısı /assets/ altında içerik özetli adlarla gelir; bir yıl önbellekte kalabilir. */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/assets/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
    }

    // SPA sayfaları (/, /yeni, /r/KOD) web.SiteController'dan sunulur.
}
