import {
  BriefcaseBusiness, Building2, CalendarDays, FileText, Github, Globe,
  GraduationCap, Hash, Linkedin, Mail, MapPin, Phone, Sparkles, UserRound,
} from "lucide-react";

export const fieldIcons = {
  first_name: UserRound, last_name: UserRound, email1: Mail, phone_mobile: Phone,
  dob: CalendarDays, gender: UserRound, current_designation: BriefcaseBusiness,
  primary_address_street: MapPin, primary_address_city: Building2,
  primary_address_state: MapPin, primary_address_postalcode: Hash,
  primary_address_country: Globe, description: FileText,
  linkedin_url: Linkedin, github_url: Github,
  version: Hash, total_years_total_months: CalendarDays,
  company_name: Building2, company_location: MapPin,
  joining_date: CalendarDays, leaving_date: CalendarDays,
  qualification: GraduationCap, institution: Building2, university: GraduationCap,
  school: Building2, board: GraduationCap, specialization: Sparkles,
  percentage: Hash, from_time: CalendarDays, to_time: CalendarDays, status: GraduationCap,
};

export const genderOptions = ["Male", "Female", "Other"];

export const relatedFieldLabels = {
  skills: {
    name: "Skill",
    version: "Version",
    total_years_total_months: "Experience duration",
  },
  experiences: {
    name: "Job title",
    company_name: "Company",
    company_location: "Location",
    joining_date: "Start date",
    leaving_date: "End date",
    description: "Responsibilities and achievements",
  },
  education: {
    name: "Education title",
    qualification: "Degree / qualification",
    institution: "Institution",
    university: "University",
    school: "School / college",
    board: "Board",
    specialization: "Field of study / specialization",
    percentage: "Percentage / grade",
    from_time: "Start year / date",
    to_time: "End year / date",
    status: "Completion status",
    description: "Academic achievements and details",
  },
};
