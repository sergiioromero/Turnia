package api.timeentry;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TimeEntryAuditRepository extends JpaRepository<TimeEntryAudit, Long> {

    List<TimeEntryAudit> findByTimeEntryIdOrderByChangedAtDesc(Long timeEntryId);
}