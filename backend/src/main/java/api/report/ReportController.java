package api.report;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/admin/reports")
public class ReportController {

    private static final ZoneId ZONE = ZoneId.of("Europe/Madrid");
    private static final DateTimeFormatter HOUR = DateTimeFormatter.ofPattern("HH:mm").withZone(ZONE);

    private final ReportService service;

    public ReportController(ReportService service) {
        this.service = service;
    }

    @GetMapping("/monthly")
    public MonthlyReportResponse monthly(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return service.monthly(jwt, month);
    }

    @GetMapping("/monthly.csv")
    public ResponseEntity<byte[]> monthlyCsv(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        MonthlyReportResponse report = service.monthly(jwt, month);

        StringBuilder csv = new StringBuilder("\uFEFF");   // BOM para Excel
        csv.append("Empleado;Fecha;Entrada;Salida;Horas;Jornada incompleta\n");
        for (EmployeeReport emp : report.employees()) {
            for (DayReport d : emp.days()) {
                csv.append(quote(emp.fullName())).append(';')
                   .append(d.date()).append(';')
                   .append(formatHour(d.firstIn())).append(';')
                   .append(formatHour(d.lastOut())).append(';')
                   .append(formatMinutes(d.workedMinutes())).append(';')
                   .append(d.incomplete() ? "SI" : "NO").append('\n');
            }
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"fichajes-" + report.month() + ".csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    private static String quote(String s) {
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }

    private static String formatHour(Instant i) {
        return i == null ? "" : HOUR.format(i);
    }

    private static String formatMinutes(long minutes) {
        return String.format("%d:%02d", minutes / 60, minutes % 60);
    }
}