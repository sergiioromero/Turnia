package api.admin;

import api.user.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateUserRequest(
        @NotBlank @Size(max = 150) String fullName,
        @NotNull Role role,
        @Size(max = 30) String phone,
        @Size(max = 100) String jobTitle,
        LocalDate hiredAt) {
}