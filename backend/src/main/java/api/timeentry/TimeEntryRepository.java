package api.timeentry;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface TimeEntryRepository extends JpaRepository<TimeEntry, Long> {

    // Último fichaje válido de un usuario: sirve para validar la secuencia (no salir sin haber entrado)
    Optional<TimeEntry> findFirstByUserIdAndDeletedFalseOrderByOccurredAtDesc(Long userId);

    // Historial de un empleado en un rango de fechas
    List<TimeEntry> findByUserIdAndDeletedFalseAndOccurredAtBetweenOrderByOccurredAtAsc(
            Long userId, Instant from, Instant to);

    // Vista del jefe: fichajes de toda su empresa en un rango
    @Query("""
            select t from TimeEntry t
            where t.user.company.id = :companyId
              and t.deleted = false
              and t.occurredAt between :from and :to
            order by t.occurredAt desc
            """)
    List<TimeEntry> findByCompanyAndRange(@Param("companyId") Long companyId,
                                          @Param("from") Instant from,
                                          @Param("to") Instant to);

    Optional<TimeEntry> findByIdAndUserCompanyId(Long id, Long companyId);
}