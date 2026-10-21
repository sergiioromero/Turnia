package api.timeentry;

import java.time.Instant;
import java.util.List;

public record StatusResponse(
        String state,                    // OUT, WORKING, ON_BREAK
        List<EntryType> allowedActions,
        Instant lastEntryAt) {
}