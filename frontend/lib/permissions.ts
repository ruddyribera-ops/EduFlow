import { UserRole } from "@/types";

export type NavItem = {
  label: string;
  href: string;
  icon?: string;
  roles: UserRole[];
  badge?: string;
};

export const NAV_ITEMS: NavItem[] = [
  // HOME
  { label: "Dashboard", href: "/", icon: "home", roles: ["admin", "director", "coordinator", "receptionist", "teacher", "counselor", "guardian"] },

  // DAILY OPERATIONS
  { label: "Attendance", href: "/attendance", icon: "check", roles: ["admin", "director", "coordinator", "receptionist", "teacher", "counselor"] },
  { label: "Incidents", href: "/incidents", icon: "alert", roles: ["admin", "director", "coordinator", "receptionist", "teacher", "counselor"] },
  { label: "Reception Desk", href: "/reception", icon: "phone", roles: ["admin", "director", "receptionist"] },

  // ACADEMICS
  { label: "My Classes", href: "/my-classes", icon: "book", roles: ["admin", "director", "coordinator", "teacher", "counselor"] },
  { label: "Gradebook", href: "/gradebook", icon: "grid", roles: ["admin", "director", "coordinator", "teacher"] },
  { label: "Sections", href: "/sections", icon: "layers", roles: ["admin", "director", "coordinator"] },
  { label: "Subjects", href: "/subjects", icon: "book-open", roles: ["admin", "director", "coordinator"] },

  // PEOPLE
  { label: "Students", href: "/students", icon: "user", roles: ["admin", "director", "coordinator", "receptionist", "teacher", "counselor"] },
  { label: "Guardians", href: "/guardians", icon: "users", roles: ["admin", "director", "receptionist"] },
  { label: "Staff", href: "/staff", icon: "briefcase", roles: ["admin", "director"] },

  // ENROLLMENT
  { label: "Admissions", href: "/admissions", icon: "inbox", roles: ["admin", "director", "receptionist"] },
  { label: "Risk Alerts", href: "/risk-alerts", icon: "alert-triangle", roles: ["admin", "director", "coordinator"] },

  // COMMUNICATION
  { label: "Broadcast", href: "/broadcast", icon: "mail", roles: ["admin", "director", "receptionist"] },
  { label: "Messages", href: "/messages", icon: "message-circle", roles: ["admin", "director", "coordinator", "receptionist", "teacher"] },

  // SCHOOL
  { label: "Calendar", href: "/calendar", icon: "calendar", roles: ["admin", "director", "coordinator", "receptionist", "teacher", "counselor"] },
  { label: "Schedule", href: "/schedule", icon: "clock", roles: ["admin", "director", "coordinator", "receptionist", "teacher", "counselor"] },

  // ADMIN
  { label: "Users", href: "/users", icon: "settings", roles: ["admin", "director"] },
  { label: "Reports", href: "/reports", icon: "bar-chart", roles: ["admin", "director", "coordinator"] },
  { label: "Settings", href: "/settings", icon: "tool", roles: ["admin", "director"] },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function canMarkAttendance(role: UserRole): boolean {
  return ["admin", "director", "coordinator", "receptionist", "teacher"].includes(role);
}

export function canEnterGrades(role: UserRole): boolean {
  return ["admin", "director", "coordinator", "teacher"].includes(role);
}

export function canViewIncidents(role: UserRole): boolean {
  return ["admin", "director", "coordinator", "receptionist", "teacher", "counselor"].includes(role);
}

export function canManageUsers(role: UserRole): boolean {
  return ["admin", "director"].includes(role);
}

export function canManageStudents(role: UserRole): boolean {
  return ["admin", "director", "coordinator", "receptionist"].includes(role);
}

export function canAccessReceptionDesk(role: UserRole): boolean {
  return ["admin", "director", "receptionist"].includes(role);
}

export function canViewReports(role: UserRole): boolean {
  return ["admin", "director", "coordinator"].includes(role);
}

export function isHighPrivilege(role: UserRole): boolean {
  return ["admin", "director", "coordinator"].includes(role);
}

export function canEditSection(role: UserRole): boolean {
  return ["admin", "director", "coordinator"].includes(role);
}

export function roleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: "Administrator",
    director: "Director",
    coordinator: "Coordinator",
    receptionist: "Receptionist",
    teacher: "Teacher",
    counselor: "Counselor",
    guardian: "Guardian",
  };
  return labels[role] ?? role;
}

export function roleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: "red",
    director: "purple",
    coordinator: "blue",
    receptionist: "green",
    teacher: "amber",
    counselor: "cyan",
    guardian: "gray",
  };
  return colors[role] ?? "gray";
}