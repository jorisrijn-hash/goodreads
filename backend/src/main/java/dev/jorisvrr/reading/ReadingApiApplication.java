package dev.jorisvrr.reading;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

/**
 * Reading-life API.
 *
 * <p>{@link UserDetailsServiceAutoConfiguration} is excluded so Spring Security does
 * not create a default in-memory user with a generated password. Real authentication
 * against {@code app_user} arrives in Checkpoint C.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class ReadingApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(ReadingApiApplication.class, args);
	}

}
