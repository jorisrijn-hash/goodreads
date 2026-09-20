package dev.jorisvrr.reading.identity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    /** Case-insensitive, matching the {@code lower(username)} unique index. */
    @Query("SELECT u FROM User u WHERE lower(u.username) = lower(:username)")
    Optional<User> findByUsernameIgnoreCase(String username);

    boolean existsByEmail(String email);

    @Query("SELECT count(u) > 0 FROM User u WHERE lower(u.username) = lower(:username)")
    boolean existsByUsernameIgnoreCase(String username);

    Optional<User> findByDemoIsTrue();
}
