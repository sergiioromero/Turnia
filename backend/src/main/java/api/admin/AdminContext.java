package api.admin;

import api.user.Role;
import api.user.User;
import api.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AdminContext {

    private final UserRepository userRepository;

    public AdminContext(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** Carga al jefe desde la BD y comprueba que sigue activo y es ADMIN. */
    public User currentAdmin(Jwt jwt) {
        Long id = Long.valueOf(jwt.getSubject());
        return userRepository.findById(id)
                .filter(User::isActive)
                .filter(u -> u.getRole() == Role.ADMIN)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN, "Acceso restringido a administradores activos"));
    }
}