import React from "react";
import {
  Braces, Calendar, CalendarClock, CheckSquare, CircleHelp, CircleDot, Clock,
  File, FileText, Hash, Image, Link, List, ListChecks,
  LockKeyhole, Mail, MoreHorizontal, Percent, Phone, Tags, Text, Type, UserRound, Wallet,
} from "lucide-react";

const FIELD_TYPES = {
  text: [Type, "Text"],
  varchar: [Type, "Text"],
  string: [Type, "Text"],
  textarea: [Text, "Long text"],
  long_text: [Text, "Long text"],
  html: [FileText, "Rich text"],
  email: [Mail, "Email"],
  url: [Link, "URL"],
  link: [Link, "Link"],
  currency: [Wallet, "Currency"],
  money: [Wallet, "Currency"],
  percent: [Percent, "Percentage"],
  number: [Hash, "Number"],
  integer: [Hash, "Integer"],
  int: [Hash, "Integer"],
  decimal: [Hash, "Decimal"],
  float: [Hash, "Decimal"],
  date: [Calendar, "Date"],
  datetime: [CalendarClock, "Date and time"],
  datetimecombo: [CalendarClock, "Date and time"],
  time: [Clock, "Time"],
  bool: [CheckSquare, "Boolean"],
  boolean: [CheckSquare, "Boolean"],
  checkbox: [CheckSquare, "Checkbox"],
  enum: [List, "Dropdown"],
  select: [List, "Dropdown"],
  dropdown: [List, "Dropdown"],
  multienum: [ListChecks, "Multiple choice"],
  multiselect: [ListChecks, "Multiple choice"],
  multi_select: [ListChecks, "Multiple choice"],
  relate: [UserRound, "Related record"],
  relation: [UserRound, "Related record"],
  lookup: [UserRound, "Related record"],
  user: [UserRound, "User"],
  owner: [UserRound, "Owner"],
  phone: [Phone, "Phone"],
  image: [Image, "Image"],
  avatar: [Image, "Avatar"],
  file: [File, "File"],
  attachment: [File, "Attachment"],
  password: [LockKeyhole, "Password"],
  tags: [Tags, "Tags"],
  json: [Braces, "JSON"],
  status: [CircleDot, "Status"],
  badge: [Tags, "Badge"],
  action: [MoreHorizontal, "Action"],
  actions: [MoreHorizontal, "Actions"],
};

export default function FieldTypeIcon({ type }) {
  const key = typeof type === "string" ? type.trim().toLowerCase() : "";
  const [Icon, label] = Object.hasOwn(FIELD_TYPES, key)
    ? FIELD_TYPES[key] : [CircleHelp, key || "Unknown"];

  return (
    <span role="img" aria-label={`${label} field`} title={`${label} field`}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}
