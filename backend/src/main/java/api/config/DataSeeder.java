package api.config;

import api.company.Company;
import api.company.CompanyRepository;
import api.user.Role;
import api.user.User;
import api.user.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DataSeeder implements CommandLineRunner {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(CompanyRepository companyRepository,
                      UserRepository userRepository,
                      PasswordEncoder passwordEncoder) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (companyRepository.count() > 0) {
            return;
        }

        Company company = new Company();
        company.setName("Empresa Demo S.L.");
        company.setTaxId("B12345678");
        companyRepository.save(company);

        userRepository.save(buildUser(company, "admin@demo.com", "Admin1234!",
                "Ana Jefa", Role.ADMIN, "Gerente"));
        userRepository.save(buildUser(company, "empleado@demo.com", "Empleado1234!",
                "Luis Empleado", Role.EMPLOYEE, "Dependiente"));
    }

    private User buildUser(Company company, String email, String rawPassword,
                           String fullName, Role role, String jobTitle) {
        User user = new User();
        user.setCompany(company);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName(fullName);
        user.setRole(role);
        user.setJobTitle(jobTitle);
        user.setHiredAt(LocalDate.now());
        return user;
    }
}