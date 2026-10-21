package api.admin;

import api.user.User;

import java.time.LocalDate;

public record UserResponse(
        Long id,
        String email,
        String fullName,
        String role,
        boolean active,
        String phone,
        String jobTitle,
        LocalDate hiredAt,
        LocalDate terminatedAt) {

    public static UserResponse from(User u) {
        return new UserResponse(
                u.getId(), u.getEmail(), u.getFullName(), u.getRole().name(),
                u.isActive(), u.getPhone(), u.getJobTitle(),
                u.getHiredAt(), u.getTerminatedAt());
    }
}