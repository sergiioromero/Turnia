package api.report;

import java.util.List;

public record MonthlyReportResponse(
        String month,
        List<EmployeeReport> employees) {
}