import { BookOpen, Users, FileText, Briefcase, DollarSign, MessageSquare, BarChart3, Settings, UserPlus, LucideIcon } from 'lucide-react';

export interface MenuItemConfig {
  path: string;
  label: string;
  role?: string;
  icon?: LucideIcon;
}

export interface MenuSectionConfig {
  title: string;
  icon: LucideIcon;
  items: MenuItemConfig[];
}

export const menuSections: MenuSectionConfig[] = [
  {
    title: 'Academic',
    icon: BookOpen,
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: BookOpen },
      // { path: '/admissions', label: 'Admissions', icon: FileText },
      { path: '/new-enrollment', label: 'Admissions', icon: UserPlus },
      { path: '/classes', label: 'Classroom Management', icon: Users },
      { path: '/timetable', label: 'School Timetable', icon: BookOpen },
      { path: '/syllabus', label: 'Curriculum', icon: BookOpen },
      { path: '/attendance', label: 'Attendance Management', icon: FileText },
      { path: '/id-card-generator', label: 'ID Card Generator', icon: FileText },
    ]
  },
  {
    title: 'Student',
    icon: Users,
    items: [
      { path: '/students', label: 'Student Records', icon: Users },
      { path: '/houses', label: 'Student Houses (House System)', icon: Briefcase },
      { path: '/student-progress', label: 'Student Performance Reports', icon: BarChart3 },
      { path: '/transport', label: 'Transport Management', icon: Briefcase },
      { path: '/library', label: 'Library', icon: BookOpen },
      { path: '/live-class', label: 'Live Classes', icon: BookOpen },
      { path: '/student-app-tasks', label: 'Assignments & Tasks', icon: FileText }
    ]
  },
  {
    title: 'EXAM',
    icon: FileText,
    items: [
      { path: '/exams', label: 'Exams', icon: FileText },
    ]
  },
  {
    title: 'HR',
    icon: Users,
    items: [
      { path: '/employees', label: 'Employee Management', icon: Users },
      { path: '/staff-attendance', label: 'Staff Attendance & Campus Map', icon: Users },
      { path: '/role-based-access', label: 'Role Based Access', icon: Briefcase },
      { path: '/inventory', label: 'Inventory Management', icon: Briefcase }
    ]
  },
  {
    title: 'Finance Management',
    icon: DollarSign,
    items: [
      { path: '/fees', label: 'Student Fee Management', icon: DollarSign },
      { path: '/salary', label: 'Manage Staff Salaries', icon: DollarSign },
      { path: '/fee-salary-manager', label: 'Fee & Salary Manager', icon: DollarSign },
      { path: '/accounts', label: 'Accounts', icon: DollarSign },
      { path: '/shop', label: 'School Shop', icon: Briefcase }
    ]
  },
  {
    title: 'Communication',
    icon: MessageSquare,
    items: [
      { path: '/announcements', label: 'Notice Board', icon: MessageSquare },
      { path: '/important-dates', label: 'Important Dates', icon: FileText },
      { path: '/whatsapp-sms-integration', label: 'Communication Broadcast', icon: Settings }
    ]
  },
  {
    title: 'Reports',
    icon: BarChart3,
    items: [
      { path: '/reports', label: 'Reports', icon: BarChart3 }
    ]
  },
  {
    title: 'Settings',
    icon: Settings,
    items: [
      { path: '/settings', label: 'School Settings', icon: Settings }
    ]
  }
];
