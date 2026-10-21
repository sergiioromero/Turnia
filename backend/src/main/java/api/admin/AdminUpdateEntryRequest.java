package api.admin;

import api.timeentry.EntryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record AdminUpdateEntryRequest(
        @NotNull EntryType type,
        @NotNull Instant occurredAt,
        @NotBlank @Size(min = 5, max = 500) String reason) {
}