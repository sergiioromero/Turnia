package api.timeentry;

import api.user.User;
import api.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Service
public class TimeEntryService {

    private static final ZoneId ZONE = ZoneId.of("Europe/Madrid");

    private final TimeEntryRepository timeEntryRepository;
    private final UserRepository userRepository;

    public TimeEntryService(TimeEntryRepository timeEntryRepository,
                            UserRepository userRepository) {
        this.timeEntryRepository = timeEntryRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public TimeEntryResponse clock(Long userId, ClockRequest request) {
        if (request.source() == EntrySource.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El origen ADMIN no es válido para fichar");
        }

        User user = findActiveUser(userId);
        EntryType last = lastType(userId);

        List<EntryType> allowed = allowedNext(last);
        if (!allowed.contains(request.type())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Acción no permitida ahora. Acciones válidas: " + allowed);
        }

        TimeEntry entry = new TimeEntry();
        entry.setUser(user);
        entry.setType(request.type());
        entry.setSource(request.source());
        entry.setOccurredAt(Instant.now());   // siempre la hora del servidor
        return TimeEntryResponse.from(timeEntryRepository.save(entry));
    }

    @Transactional(readOnly = true)
    public List<TimeEntryResponse> history(Long userId, LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : LocalDate.now(ZONE);
        LocalDate end = to != null ? to : start;
        if (end.isBefore(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "'to' no puede ser anterior a 'from'");
        }

        Instant fromInstant = start.atStartOfDay(ZONE).toInstant();
        Instant toInstant = end.atTime(LocalTime.MAX).atZone(ZONE).toInstant();

        return timeEntryRepository
                .findByUserIdAndDeletedFalseAndOccurredAtBetweenOrderByOccurredAtAsc(
                        userId, fromInstant, toInstant)
                .stream()
                .map(TimeEntryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public StatusResponse status(Long userId) {
        Optional<TimeEntry> lastEntry = timeEntryRepository
                .findFirstByUserIdAndDeletedFalseOrderByOccurredAtDesc(userId);
        EntryType last = lastEntry.map(TimeEntry::getType).orElse(null);

        String state;
        if (last == null || last == EntryType.CLOCK_OUT) {
            state = "OUT";
        } else if (last == EntryType.BREAK_START) {
            state = "ON_BREAK";
        } else {
            state = "WORKING";
        }

        return new StatusResponse(
                state,
                allowedNext(last),
                lastEntry.map(TimeEntry::getOccurredAt).orElse(null));
    }

    private User findActiveUser(Long userId) {
        return userRepository.findById(userId)
                .filter(User::isActive)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Usuario no válido"));
    }

    private EntryType lastType(Long userId) {
        return timeEntryRepository
                .findFirstByUserIdAndDeletedFalseOrderByOccurredAtDesc(userId)
                .map(TimeEntry::getType)
                .orElse(null);
    }

    static List<EntryType> allowedNext(EntryType last) {
        if (last == null) {
            return List.of(EntryType.CLOCK_IN);
        }
        return switch (last) {
            case CLOCK_OUT -> List.of(EntryType.CLOCK_IN);
            case CLOCK_IN -> List.of(EntryType.BREAK_START, EntryType.CLOCK_OUT);
            case BREAK_START -> List.of(EntryType.BREAK_END);
            case BREAK_END -> List.of(EntryType.BREAK_START, EntryType.CLOCK_OUT);
        };
    }
}