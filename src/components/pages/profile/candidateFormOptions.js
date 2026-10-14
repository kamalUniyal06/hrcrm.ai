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

export const genderOptions = ["Male", "Female", "Other", "Prefer not to say"];
