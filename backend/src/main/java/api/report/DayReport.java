package api.report;

import java.time.Instant;
import java.time.LocalDate;

public record DayReport(
        LocalDate date,
        long workedMinutes,
        Instant firstIn,
        Instant lastOut,
        boolean incomplete) {
}