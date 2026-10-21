package api.admin;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService service;

    public AdminUserController(AdminUserService service) {
        this.service = service;
    }

    @GetMapping
    public List<UserResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return service.list(jwt);
    }

    @GetMapping("/{id}")
    public UserResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return service.get(jwt, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@AuthenticationPrincipal Jwt jwt,
                               @Valid @RequestBody CreateUserRequest request) {
        return service.create(jwt, request);
    }

    @PutMapping("/{id}")
    public UserResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
                               @Valid @RequestBody UpdateUserRequest request) {
        return service.update(jwt, id, request);
    }

    @PatchMapping("/{id}/deactivate")
    public UserResponse deactivate(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return service.deactivate(jwt, id);
    }

    @PatchMapping("/{id}/activate")
    public UserResponse activate(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return service.activate(jwt, id);
    }
}