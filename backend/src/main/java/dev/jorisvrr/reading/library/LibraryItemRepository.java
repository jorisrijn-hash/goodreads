package dev.jorisvrr.reading.library;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface LibraryItemRepository extends JpaRepository<LibraryItem, Long> {

    /**
     * Always scoped by user. Every lookup takes the authenticated reader's id, so one
     * reader can never reach another's library by guessing an identifier.
     */
    Optional<LibraryItem> findByUserIdAndBookId(Long userId, Long bookId);

    List<LibraryItem> findByUserIdAndBookIdIn(Long userId, List<Long> bookIds);

    /** The reader's whole library, most recently touched first. */
    List<LibraryItem> findByUserIdOrderByUpdatedAtDesc(Long userId);

    List<LibraryItem> findByUserIdAndStatusOrderByUpdatedAtDesc(Long userId, ReadingStatus status);

    @Query("SELECT i.status, count(i) FROM LibraryItem i WHERE i.userId = :userId GROUP BY i.status")
    List<Object[]> countByStatus(Long userId);
}
