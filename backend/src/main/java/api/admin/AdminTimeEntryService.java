package api.admin;

import api.timeentry.*;
import api.user.User;
import api.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class AdminTimeEntryService {

    private static final ZoneId ZONE = ZoneId.of("Europe/Madrid");

    private final TimeEntryRepository timeEntryRepository;
    private final TimeEntryAuditRepository auditRepository;
    private final UserRepository userRepository;
    private final AdminContext adminContext;

    public AdminTimeEntryService(TimeEntryRepository timeEntryRepository,
                                 TimeEntryAuditRepository auditRepository,
                                 UserRepository userRepository,
                                 AdminContext adminContext) {
        this.timeEntryRepository = timeEntryRepository;
        this.auditRepository = auditRepository;
        this.userRepository = userRepository;
        this.adminContext = adminContext;
    }

    @Transactional(readOnly = true)
    public List<AdminTimeEntryResponse> list(Jwt jwt, Long userId, LocalDate from, LocalDate to) {
        User admin = adminContext.currentAdmin(jwt);

        LocalDate start = from != null ? from : LocalDate.now(ZONE);
        LocalDate end = to != null ? to : start;
        if (end.isBefore(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "'to' no puede ser anterior a 'from'");
        }

        Instant fromInstant = start.atStartOfDay(ZONE).toInstant();
        Instant toInstant = end.atTime(LocalTime.MAX).atZone(ZONE).toInstant();

        return timeEntryRepository
                .findByCompanyAndRange(admin.getCompany().getId(), fromInstant, toInstant)
                .stream()
                .filter(e -> userId == null || e.getUser().getId().equals(userId))
                .map(AdminTimeEntryResponse::from)
                .toList();
    }

    @Transactional
    public AdminTimeEntryResponse create(Jwt jwt, AdminCreateEntryRequest request) {
        User admin = adminContext.currentAdmin(jwt);
        checkNotFuture(request.occurredAt());

        User target = userRepository
                .findByIdAndCompanyId(request.userId(), admin.getCompany().getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        TimeEntry entry = new TimeEntry();
        entry.setUser(target);
        entry.setType(request.type());
        entry.setOccurredAt(request.occurredAt());
        entry.setSource(EntrySource.ADMIN);
        timeEntryRepository.save(entry);

        saveAudit(entry, admin, AuditAction.CREATE, null, snapshot(entry), request.reason());
        return AdminTimeEntryResponse.from(entry);
    }

    @Transactional
    public AdminTimeEntryResponse update(Jwt jwt, Long id, AdminUpdateEntryRequest request) {
        User admin = adminContext.currentAdmin(jwt);
        checkNotFuture(request.occurredAt());
        TimeEntry entry = findActiveEntry(id, admin);

        String before = snapshot(entry);
        entry.setType(request.type());
        entry.setOccurredAt(request.occurredAt());

        saveAudit(entry, admin, AuditAction.UPDATE, before, snapshot(entry), request.reason());
        return AdminTimeEntryResponse.from(entry);
    }

    @Transactional
    public void delete(Jwt jwt, Long id, ReasonRequest request) {
        User admin = adminContext.currentAdmin(jwt);
        TimeEntry entry = findActiveEntry(id, admin);

        String before = snapshot(entry);
        entry.setDeleted(true);

        saveAudit(entry, admin, AuditAction.DELETE, before, snapshot(entry), request.reason());
    }

    @Transactional(readOnly = true)
    public List<AuditResponse> audit(Jwt jwt, Long id) {
        User admin = adminContext.currentAdmin(jwt);
        // Aquí se permite ver el historial aunque el fichaje esté borrado
        timeEntryRepository.findByIdAndUserCompanyId(id, admin.getCompany().getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Fichaje no encontrado"));

        return auditRepository.findByTimeEntryIdOrderByChangedAtDesc(id)
                .stream().map(AuditResponse::from).toList();
    }

    // ---------- helpers ----------

    private TimeEntry findActiveEntry(Long id, User admin) {
        return timeEntryRepository.findByIdAndUserCompanyId(id, admin.getCompany().getId())
                .filter(e -> !e.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Fichaje no encontrado"));
    }

    private void checkNotFuture(Instant occurredAt) {
        if (occurredAt.isAfter(Instant.now().plusSeconds(60))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No se pueden registrar fichajes en el futuro");
        }
    }

    private void saveAudit(TimeEntry entry, User admin, AuditAction action,
                           String oldValue, String newValue, String reason) {
        TimeEntryAudit audit = new TimeEntryAudit();
        audit.setTimeEntry(entry);
        audit.setChangedBy(admin);
        audit.setAction(action);
        audit.setOldValue(oldValue);
        audit.setNewValue(newValue);
        audit.setReason(reason.trim());
        auditRepository.save(audit);
    }

    // Todos los valores son enums, fechas y booleanos: no necesitan escapado
    private String snapshot(TimeEntry e) {
        return "{\"type\":\"" + e.getType()
                + "\",\"occurredAt\":\"" + e.getOccurredAt()
                + "\",\"deleted\":" + e.isDeleted() + "}";
    }
}