package api.report;

import java.util.List;

public record EmployeeReport(
        Long userId,
        String fullName,
        boolean active,
        long workedMinutes,
        int daysWorked,
        int incompleteDays,
        List<DayReport> days) {
}