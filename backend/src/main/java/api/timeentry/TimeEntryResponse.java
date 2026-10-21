package api.timeentry;

import java.time.Instant;

public record TimeEntryResponse(
        Long id,
        EntryType type,
        Instant occurredAt,
        EntrySource source) {

    public static TimeEntryResponse from(TimeEntry e) {
        return new TimeEntryResponse(e.getId(), e.getType(), e.getOccurredAt(), e.getSource());
    }
}