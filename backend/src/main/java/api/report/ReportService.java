package api.report;

import api.admin.AdminContext;
import api.timeentry.TimeEntry;
import api.timeentry.TimeEntryRepository;
import api.user.User;
import api.user.UserRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private static final ZoneId ZONE = ZoneId.of("Europe/Madrid");

    private final TimeEntryRepository timeEntryRepository;
    private final UserRepository userRepository;
    private final AdminContext adminContext;

    public ReportService(TimeEntryRepository timeEntryRepository,
                         UserRepository userRepository,
                         AdminContext adminContext) {
        this.timeEntryRepository = timeEntryRepository;
        this.userRepository = userRepository;
        this.adminContext = adminContext;
    }

    @Transactional(readOnly = true)
    public MonthlyReportResponse monthly(Jwt jwt, YearMonth month) {
        User admin = adminContext.currentAdmin(jwt);
        Long companyId = admin.getCompany().getId();
        YearMonth target = month != null ? month : YearMonth.now(ZONE);

        Instant from = target.atDay(1).atStartOfDay(ZONE).toInstant();
        Instant to = target.atEndOfMonth().atTime(LocalTime.MAX).atZone(ZONE).toInstant();

        // Ordenados de más antiguo a más reciente; groupingBy conserva ese orden dentro de cada lista
        Map<Long, List<TimeEntry>> byUser = timeEntryRepository
                .findByCompanyAndRange(companyId, from, to).stream()
                .sorted(Comparator.comparing(TimeEntry::getOccurredAt))
                .collect(Collectors.groupingBy(e -> e.getUser().getId()));

        List<EmployeeReport> employees = new ArrayList<>();
        for (User u : userRepository.findByCompanyIdOrderByFullNameAsc(companyId)) {
            List<TimeEntry> entries = byUser.getOrDefault(u.getId(), List.of());
            if (!u.isActive() && entries.isEmpty()) {
                continue;   // usuarios dados de baja sin actividad ese mes no aparecen
            }
            employees.add(buildEmployee(u, entries));
        }
        return new MonthlyReportResponse(target.toString(), employees);
    }

    private EmployeeReport buildEmployee(User user, List<TimeEntry> entries) {
        Map<LocalDate, DayAcc> days = new TreeMap<>();
        Instant start = null;
        LocalDate startDay = null;

        for (TimeEntry e : entries) {
            Instant t = e.getOccurredAt();
            LocalDate day = t.atZone(ZONE).toLocalDate();
            DayAcc acc = days.computeIfAbsent(day, d -> new DayAcc());

            switch (e.getType()) {
                case CLOCK_IN -> {
                    if (start != null) {
                        days.get(startDay).incomplete = true;   // entrada sin haber cerrado la anterior
                    }
                    start = t;
                    startDay = day;
                    if (acc.firstIn == null) {
                        acc.firstIn = t;
                    }
                }
                case BREAK_END -> {
                    if (start != null) {
                        acc.incomplete = true;                  // vuelta de pausa sin pausa previa
                    } else {
                        start = t;
                        startDay = day;
                    }
                }
                case BREAK_START, CLOCK_OUT -> {
                    if (start != null) {
                        days.get(startDay).seconds += Duration.between(start, t).getSeconds();
                        start = null;
                        startDay = null;
                    } else {
                        acc.incomplete = true;                  // corte sin entrada previa
                    }
                    if (e.getType() == api.timeentry.EntryType.CLOCK_OUT) {
                        acc.lastOut = t;
                    }
                }
            }
        }
        if (start != null) {
            days.get(startDay).incomplete = true;               // tramo abierto al final del periodo
        }

        List<DayReport> dayReports = days.entrySet().stream()
                .map(en -> new DayReport(en.getKey(), en.getValue().seconds / 60,
                        en.getValue().firstIn, en.getValue().lastOut, en.getValue().incomplete))
                .toList();

        long totalMinutes = dayReports.stream().mapToLong(DayReport::workedMinutes).sum();
        int daysWorked = (int) dayReports.stream().filter(d -> d.workedMinutes() > 0).count();
        int incompleteDays = (int) dayReports.stream().filter(DayReport::incomplete).count();

        return new EmployeeReport(user.getId(), user.getFullName(), user.isActive(),
                totalMinutes, daysWorked, incompleteDays, dayReports);
    }

    private static class DayAcc {
        long seconds;
        Instant firstIn;
        Instant lastOut;
        boolean incomplete;
    }
}