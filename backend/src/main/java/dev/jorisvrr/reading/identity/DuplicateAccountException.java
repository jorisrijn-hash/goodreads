package dev.jorisvrr.reading.identity;

/** Signup conflicted with an existing account. Maps to HTTP 409. */
public class DuplicateAccountException extends RuntimeException {

    private final String field;

    public DuplicateAccountException(String field, String message) {
        super(message);
        this.field = field;
    }

    /** "email" or "username", so the frontend can attach the error to the right input. */
    public String getField() {
        return field;
    }
}
