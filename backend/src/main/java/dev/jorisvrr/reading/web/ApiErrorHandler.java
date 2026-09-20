package dev.jorisvrr.reading.web;

import dev.jorisvrr.reading.identity.DuplicateAccountException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * One coherent error shape for the whole API: RFC 9457 {@code application/problem+json}.
 *
 * <p>Controllers never return ad-hoc error strings. Every failure arrives here and leaves
 * with a {@code type}, a status and — for validation — field-level detail the frontend
 * can attach to the right input.
 */
@RestControllerAdvice
public class ApiErrorHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiErrorHandler.class);
    private static final String TYPE_BASE = "https://goodreads-redesign.dev/problems/";

    /** Bean-validation failures. Carries per-field messages. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail onValidationFailure(MethodArgumentNotValidException ex) {
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "validation-failed",
                "Validation failed", "Some fields need attention.");
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> errors.putIfAbsent(e.getField(), e.getDefaultMessage()));
        problem.setProperty("errors", errors);
        return problem;
    }

    /** Signup conflicted with an existing account. */
    @ExceptionHandler(DuplicateAccountException.class)
    ProblemDetail onDuplicateAccount(DuplicateAccountException ex) {
        ProblemDetail problem = problem(HttpStatus.CONFLICT, "account-exists",
                "Account already exists", ex.getMessage());
        problem.setProperty("errors", Map.of(ex.getField(), ex.getMessage()));
        return problem;
    }

    /**
     * Any authentication failure. The message is identical whether the account does not
     * exist or the password was wrong — revealing the difference would let anyone test
     * which email addresses are registered.
     */
    @ExceptionHandler(AuthenticationException.class)
    ProblemDetail onAuthenticationFailure(AuthenticationException ex) {
        // Logged without the submitted email, which would reconstruct the same
        // enumeration risk in the log file.
        log.info("authentication failed: {}", ex.getClass().getSimpleName());
        return problem(HttpStatus.UNAUTHORIZED, "invalid-credentials",
                "Not authenticated", "Email or password is incorrect.");
    }

    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail onAccessDenied(AccessDeniedException ex) {
        return problem(HttpStatus.FORBIDDEN, "access-denied",
                "Access denied", "You do not have access to this resource.");
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    ProblemDetail onNotFound(NoHandlerFoundException ex) {
        return problem(HttpStatus.NOT_FOUND, "not-found",
                "Not found", "That resource does not exist.");
    }

    /** Last resort. The cause is logged; the client is told nothing about internals. */
    @ExceptionHandler(Exception.class)
    ProblemDetail onUnexpectedFailure(Exception ex) {
        log.error("unhandled exception", ex);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "server-error",
                "Something went wrong", "An unexpected error occurred. Please try again.");
    }

    private ProblemDetail problem(HttpStatus status, String type, String title, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(URI.create(TYPE_BASE + type));
        problem.setTitle(title);
        return problem;
    }
}
