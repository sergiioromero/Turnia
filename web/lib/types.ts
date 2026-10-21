export type EntryType = "CLOCK_IN" | "BREAK_START" | "BREAK_END" | "CLOCK_OUT";
export type EntrySource = "MOBILE" | "WEB" | "ADMIN";
export type RoleName = "ADMIN" | "EMPLOYEE";

export type AdminEntry = {
  id: number;
  userId: number;
  userName: string;
  type: EntryType;
  occurredAt: string;
  source: EntrySource;
};

export type AuditRow = {
  id: number;
  timeEntryId: number;
  changedById: number;
  changedByName: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  oldValue: string | null;
  newValue: string | null;
  reason: string;
  changedAt: string;
};

export type UserRow = {
  id: number;
  email: string;
  fullName: string;
  role: RoleName;
  active: boolean;
  phone: string | null;
  jobTitle: string | null;
  hiredAt: string | null;
  terminatedAt: string | null;
};

export type DayReport = {
  date: string;
  workedMinutes: number;
  firstIn: string | null;
  lastOut: string | null;
  incomplete: boolean;
};

export type EmployeeReport = {
  userId: number;
  fullName: string;
  active: boolean;
  workedMinutes: number;
  daysWorked: number;
  incompleteDays: number;
  days: DayReport[];
};

export type MonthlyReportResponse = {
  month: string;
  employees: EmployeeReport[];
};

export const TYPE_LABEL: Record<EntryType, string> = {
  CLOCK_IN: "Entrada",
  BREAK_START: "Inicio de pausa",
  BREAK_END: "Fin de pausa",
  CLOCK_OUT: "Salida",
};

export const SOURCE_LABEL: Record<EntrySource, string> = {
  MOBILE: "App",
  WEB: "Web",
  ADMIN: "Jefe",
};

export const ROLE_LABEL: Record<RoleName, string> = {
  ADMIN: "Administrador",
  EMPLOYEE: "Empleado",
};
