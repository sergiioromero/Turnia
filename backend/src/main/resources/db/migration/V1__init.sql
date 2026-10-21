CREATE TABLE companies (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    tax_id      VARCHAR(20),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    company_id    BIGINT NOT NULL REFERENCES companies(id),
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(150) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('ADMIN', 'EMPLOYEE')),
    active        BOOLEAN NOT NULL DEFAULT TRUE,   -- "dar de baja" = active = false
    phone         VARCHAR(30),
    job_title     VARCHAR(100),
    hired_at      DATE,
    terminated_at DATE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_company ON users(company_id);

CREATE TABLE time_entries (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    type        VARCHAR(20) NOT NULL
                CHECK (type IN ('CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT')),
    occurred_at TIMESTAMPTZ NOT NULL,
    source      VARCHAR(10) NOT NULL CHECK (source IN ('MOBILE', 'WEB', 'ADMIN')),
    deleted     BOOLEAN NOT NULL DEFAULT FALSE,   -- borrado lógico, nunca físico
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entries_user_time ON time_entries(user_id, occurred_at DESC);

-- Auditoría: cada modificación de un jefe deja rastro
CREATE TABLE time_entry_audit (
    id            BIGSERIAL PRIMARY KEY,
    time_entry_id BIGINT NOT NULL REFERENCES time_entries(id),
    changed_by    BIGINT NOT NULL REFERENCES users(id),
    action        VARCHAR(10) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    old_value     JSONB,
    new_value     JSONB,
    reason        VARCHAR(500) NOT NULL,   -- obligatorio: el jefe debe justificar el cambio
    changed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);