import { Briefcase, Info, MapPin, UserRound } from "lucide-react";

// Profile fields shown on the employee sheet and profile page: [title, icon, [[key, label, input type]]].
export const groups = [
  [
    "Personal & contact",
    UserRound,
    [
      ["first_name", "First name"],
      ["last_name", "Last name"],
      ["email1", "Email", "email"],
      ["phone_mobile", "Mobile phone", "tel"],
      ["phone_work", "Work phone", "tel"],
    ],
  ],
  [
    "Employment",
    Briefcase,
    [
      ["current_designation", "Designation"],
      ["title", "Title"],
      ["department", "Department"],
      ["joining_date", "Joining date", "date"],
    ],
  ],
  [
    "Location",
    MapPin,
    [
      ["primary_address_street", "Street"],
      ["primary_address_city", "City"],
      ["primary_address_state", "State"],
      ["primary_address_postalcode", "Postal code"],
      ["primary_address_country", "Country"],
    ],
  ],
  [
    "Additional information",
    Info,
    [
      ["linkedin_url", "LinkedIn URL", "url"],
      ["description", "Notes", "textarea"],
    ],
  ],
];
