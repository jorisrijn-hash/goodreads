package dev.jorisvrr.reading.library;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface LibraryItemRepository extends JpaRepository<LibraryItem, Long> {

    /**
     * Always scoped by user. Every lookup takes the authenticated reader's id, so one
     * reader can never reach another's library by guessing an identifier.
     */
    Optional<LibraryItem> findByUserIdAndBookId(Long userId, Long bookId);

    /**
     * The same lookup, holding the row until the transaction ends. Recording progress
     * reads the current position, decides what to write and updates both the row and the
     * history; two tabs doing that at once must not interleave.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM LibraryItem i WHERE i.userId = :userId AND i.bookId = :bookId")
    Optional<LibraryItem> findForUpdate(Long userId, Long bookId);

    List<LibraryItem> findByUserIdAndBookIdIn(Long userId, List<Long> bookIds);

    /** The reader's whole library, most recently touched first. */
    List<LibraryItem> findByUserIdOrderByUpdatedAtDesc(Long userId);

    List<LibraryItem> findByUserIdAndStatusOrderByUpdatedAtDesc(Long userId, ReadingStatus status);

    @Query("SELECT i.status, count(i) FROM LibraryItem i WHERE i.userId = :userId GROUP BY i.status")
    List<Object[]> countByStatus(Long userId);
}
