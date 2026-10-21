package api.admin;

import api.timeentry.EntrySource;
import api.timeentry.EntryType;
import api.timeentry.TimeEntry;

import java.time.Instant;

public record AdminTimeEntryResponse(
        Long id,
        Long userId,
        String userName,
        EntryType type,
        Instant occurredAt,
        EntrySource source) {

    public static AdminTimeEntryResponse from(TimeEntry e) {
        return new AdminTimeEntryResponse(
                e.getId(), e.getUser().getId(), e.getUser().getFullName(),
                e.getType(), e.getOccurredAt(), e.getSource());
    }
}