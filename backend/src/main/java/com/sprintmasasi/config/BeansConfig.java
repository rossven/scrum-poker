package com.sprintmasasi.config;

import java.security.SecureRandom;
import java.time.Clock;
import java.util.random.RandomGenerator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class BeansConfig {

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    /** "Kim alacak?" oyunlarının rastgele kaynağı: kazananı yalnızca sunucu, kriptografik rastgelelikle çeker. */
    @Bean
    RandomGenerator gameRandom() {
        return new SecureRandom();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }
}
