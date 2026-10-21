package api.auth;

public record LoginResponse(
        String token,
        Long userId,
        String fullName,
        String role) {
}