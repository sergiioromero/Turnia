package api.admin;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/time-entries")
public class AdminTimeEntryController {

    private final AdminTimeEntryService service;

    public AdminTimeEntryController(AdminTimeEntryService service) {
        this.service = service;
    }

    @GetMapping
    public List<AdminTimeEntryResponse> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.list(jwt, userId, from, to);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminTimeEntryResponse create(@AuthenticationPrincipal Jwt jwt,
                                         @Valid @RequestBody AdminCreateEntryRequest request) {
        return service.create(jwt, request);
    }

    @PutMapping("/{id}")
    public AdminTimeEntryResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                                         @Valid @RequestBody AdminUpdateEntryRequest request) {
        return service.update(jwt, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                       @Valid @RequestBody ReasonRequest request) {
        service.delete(jwt, id, request);
    }

    @GetMapping("/{id}/audit")
    public List<AuditResponse> audit(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return service.audit(jwt, id);
    }
}