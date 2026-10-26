# Product

## Register

product

## What HRCRM is

HRCRM AI (hrcrm.ai) is one platform that combines **HRMS + CRM + AI** to run the whole employee lifecycle: hire, onboard, manage, pay, develop, and exit. This repository is the web app (`app.hrcrm.ai`). The marketing site (hrcrm.ai) is a separate project.

Tagline: *"The Future of Human Resources — Powered by AI."*

## Users

Three kinds of people use the app. What each one sees depends on their account status (`state.user.userInfo.status`):

| User | Who they are | What they do in the app |
|---|---|---|
| **HR admins** (`admin`) | HR and recruitment staff who use the app all day | Manage candidates, interviews, shortlists, job postings, employees, salaries, increments, leave approvals, attendance, employee exit, system alerts, and the configurable CRM layouts |
| **Employees** (`employee`) | Staff using self-service | View their profile, apply for leave and track it, request increments, see their own attendance |
| **Candidates** (`candidate` → `Joining Confirmed`) | Job seekers and new hires | Complete onboarding (resume upload or manual entry, documents, education, experience), track their applications and interviews from the candidate dashboard |

Admin-only pages are enforced in `src/utils/pageAccess.js`. Non-admins never see admin destinations in navigation.

Screens: desktop is the main workspace for admins. Candidates and employees often use phones, so every flow has to work at mobile width.

## Product purpose

Replace scattered spreadsheets, inboxes, and separate HR tools with one workspace. Recruiters, HR, and employees each see exactly what they need, and AI handles the repetitive work.

Success means:
- An admin can find any candidate or employee record and act on it without losing their place.
- A candidate can finish onboarding in one sitting without help.
- An employee can apply for leave or check attendance in a few taps.
- Admins can reshape tables, detail views, create forms, and the sidebar themselves, without a developer.

## Modules

The platform covers 16 modules: Recruitment, Onboarding, Attendance, Leave Management, Payroll, Performance, Learning, Engagement, Tasks, Expenses, Compliance, Reports, AI Analytics, Workflow, Documents, and Exit.

Built in this app today:
- Recruitment: candidates, shortlisting, interviews, assessments, job postings and applications
- Candidate onboarding and dashboard
- Employees and salaries
- Attendance
- Leave: apply, approvals, applications
- Increments: requests and management, including question-based flows
- Employee exit
- System alerts
- Limit management
- Dynamic CRM entities (`/entity/:entity/...`) with configurable layouts under Settings

## Brand personality

**Intelligent, modern, and trustworthy.** HRCRM should feel like a capable AI colleague. It is confident and forward-looking, but never flashy at the cost of getting work done.

- *Intelligent*: AI help appears where it saves effort, such as resume parsing, document scanning and matching, analytics, and agentic workflows.
- *Modern*: a clean, calm interface with the brand's dark green and lime accents.
- *Trustworthy*: HR data is sensitive (salaries, IDs, documents). The UI has to feel careful, predictable, and private.
- *Human*: the copy is warm and plain. For example: "Your next opportunity, your team, your campus."

## Voice and copy

- Address users as "you". Write short, direct sentences.
- Candidate-facing copy is encouraging ("Ready to get started", "For your next career move").
- Admin-facing copy is concise and task-focused: label actions with verbs such as "Approve", "Shortlist", "Schedule interview".
- Don't use HR jargon or internal module names (`hrc_employees`) in visible UI.
- Error messages say what happened and what to do next.

## Anti-references

- Generic, cluttered legacy HRMS screens: dense grey tables, tiny controls, hidden actions.
- Broad visual redesigns that disrupt established admin workflows or information density.
- Hidden primary actions, unfamiliar navigation patterns, decoration that slows down repeated work.
- AI features that act without making clear what they did, or that users can't review.
- Showing sensitive data (salary, government IDs) more than the task needs.

## Design principles

- Keep high-value actions discoverable at every supported breakpoint.
- Match established component and interaction patterns before introducing new ones (see `DESIGN.md`).
- Keep the user's context when they open filters, side panels, or supporting workflows.
- Let users review AI output (parsed resumes, scanned documents) before it is saved.
- Make responsive behavior structural and predictable.
- Limit changes to the smallest surface needed to solve the user problem.

## Accessibility and inclusion

Keep semantic controls, visible labels, keyboard interaction, focus behavior, and comfortable touch targets (at least 44px for primary actions). Don't rely on color alone to communicate an action or state. Respect `prefers-reduced-motion`. Many candidates use the app on phones over slow connections, so keep onboarding light and tolerant of interruptions.
