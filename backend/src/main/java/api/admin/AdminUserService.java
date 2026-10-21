package api.admin;

import api.user.Role;
import api.user.User;
import api.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminContext adminContext;

    public AdminUserService(UserRepository userRepository,
                            PasswordEncoder passwordEncoder,
                            AdminContext adminContext) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminContext = adminContext;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> list(Jwt jwt) {
        User admin = adminContext.currentAdmin(jwt);
        return userRepository.findByCompanyIdOrderByFullNameAsc(admin.getCompany().getId())
                .stream().map(UserResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse get(Jwt jwt, Long id) {
        User admin = adminContext.currentAdmin(jwt);
        return UserResponse.from(findInCompany(id, admin));
    }

    @Transactional
    public UserResponse create(Jwt jwt, CreateUserRequest request) {
        User admin = adminContext.currentAdmin(jwt);

        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un usuario con ese email");
        }

        User user = new User();
        user.setCompany(admin.getCompany());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setRole(request.role());
        user.setPhone(request.phone());
        user.setJobTitle(request.jobTitle());
        user.setHiredAt(request.hiredAt() != null ? request.hiredAt() : LocalDate.now());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse update(Jwt jwt, Long id, UpdateUserRequest request) {
        User admin = adminContext.currentAdmin(jwt);
        User user = findInCompany(id, admin);

        if (user.getId().equals(admin.getId()) && request.role() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "No puedes quitarte a ti mismo el rol de administrador");
        }

        user.setFullName(request.fullName().trim());
        user.setRole(request.role());
        user.setPhone(request.phone());
        user.setJobTitle(request.jobTitle());
        if (request.hiredAt() != null) {
            user.setHiredAt(request.hiredAt());
        }
        return UserResponse.from(user);   // al ser una entidad gestionada, se guarda al cerrar la transacción
    }

    @Transactional
    public UserResponse deactivate(Jwt jwt, Long id) {
        User admin = adminContext.currentAdmin(jwt);
        User user = findInCompany(id, admin);

        if (user.getId().equals(admin.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No puedes darte de baja a ti mismo");
        }

        user.setActive(false);
        user.setTerminatedAt(LocalDate.now());
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse activate(Jwt jwt, Long id) {
        User admin = adminContext.currentAdmin(jwt);
        User user = findInCompany(id, admin);

        user.setActive(true);
        user.setTerminatedAt(null);
        return UserResponse.from(user);
    }

    private User findInCompany(Long id, User admin) {
        return userRepository.findByIdAndCompanyId(id, admin.getCompany().getId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuario no encontrado"));
    }
}