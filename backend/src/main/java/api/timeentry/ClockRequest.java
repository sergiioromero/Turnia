package api.timeentry;

import jakarta.validation.constraints.NotNull;

public record ClockRequest(
        @NotNull EntryType type,
        @NotNull EntrySource source) {
}