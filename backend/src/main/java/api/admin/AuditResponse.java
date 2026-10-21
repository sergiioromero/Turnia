package api.admin;

import api.timeentry.AuditAction;
import api.timeentry.TimeEntryAudit;

import java.time.Instant;

public record AuditResponse(
        Long id,
        Long timeEntryId,
        Long changedById,
        String changedByName,
        AuditAction action,
        String oldValue,
        String newValue,
        String reason,
        Instant changedAt) {

    public static AuditResponse from(TimeEntryAudit a) {
        return new AuditResponse(
                a.getId(), a.getTimeEntry().getId(),
                a.getChangedBy().getId(), a.getChangedBy().getFullName(),
                a.getAction(), a.getOldValue(), a.getNewValue(),
                a.getReason(), a.getChangedAt());
    }
}