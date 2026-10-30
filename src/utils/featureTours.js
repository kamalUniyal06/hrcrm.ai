// "What's new" tours. When a page or feature ships, add an entry here: the first time a user
// opens a matching page they see its steps once, and never again after that.
//
// - id: unique and never reused; changing it shows the tour again to everyone.
// - path: the pages it appears on.
// - audience: "everyone", "staff" (not candidates) or "admin".
// - steps[].target: optional `data-tour` value of an element to spotlight.
// - steps[].adminOnly: shown only to admins.

// Off: no tour opens, and none is marked as seen, so each still shows once when this is turned back on.
export const TOURS_ENABLED = false;

export const FEATURE_TOURS = [
  {
    id: "policies-footer-2026-10",
    path: /^\/$/,
    audience: "staff",
    steps: [
      {
        target: "footer-policies",
        title: "New: Terms & policies",
        body: "The company's terms of use and HR policies, such as leave, attendance and code of conduct, are now in one place. Open them any time from this link in the footer.",
      },
    ],
  },
  {
    id: "hr-self-service-2026-10",
    path: /^\/$/,
    audience: "staff",
    steps: [
      {
        target: "notification-bell",
        title: "New: Notifications",
        body: "Notices from HR and updates on your bookings arrive here. A red dot means something important is unread.",
      },
    ],
  },
  {
    id: "org-views-2026-10",
    path: /^\/org\/(?:chart|reporting|roles)\/?$/,
    audience: "admin",
    steps: [
      {
        title: "See how the company fits together",
        body: "The org chart shows branches, departments and teams. Reporting lines show who reports to whom, and the role ladder lists every role by seniority.",
      },
    ],
  },
  {
    id: "hr-appointments-2026-10",
    path: /^\/hr-appointments\/?$/,
    audience: "staff",
    steps: [
      {
        target: "book-hr",
        title: "Book time with HR",
        body: "Pick a topic, how you want to meet and a free time. You can cancel or move a booking later from My appointments.",
      },
    ],
  },
  {
    id: "leave-balance-2026-10",
    path: /^\/my-leaves\/?$/,
    audience: "staff",
    steps: [
      {
        target: "leave-balance",
        title: "Your leave balance",
        body: "See how much planned and sick leave you have left before you apply. If a request goes over your balance, the form tells you how many days will be unpaid.",
      },
    ],
  },
  {
    id: "policies-2026-10",
    path: /^\/policies\/?$/,
    audience: "everyone",
    steps: [
      {
        title: "Welcome to Terms & policies",
        body: "Everything that applies to you at work, written in plain language. Each policy shows when it takes effect and which version you are reading.",
      },
      {
        target: "policy-nav",
        title: "Browse or search",
        body: "Policies are grouped by topic. Search by name, or pick one from the list.",
      },
      {
        target: "policy-meta",
        title: "Always the current version",
        body: "When a policy changes, its version number and effective date change too, so you can tell what is new.",
      },
      {
        target: "policy-admin-actions",
        adminOnly: true,
        title: "Write and update policies",
        body: "Create a policy, keep it as a draft until it's ready, then publish it. Drafts are visible only to admins.",
      },
    ],
  },
  {
    id: "job-status-2026-10",
    path: /^\/job-posting\/?$/,
    audience: "admin",
    steps: [
      {
        target: "job-status-bars",
        title: "Active and inactive jobs",
        body: "See how many postings are open and how many are paused. Click a card to show only those postings; click it again to show all.",
      },
      {
        title: "Pause a posting instead of deleting it",
        body: "Open any posting and use Mark inactive to pause it, or Mark active to reopen it. Postings are no longer deleted, so their history stays intact.",
      },
    ],
  },
  {
    id: "my-team-2026-10",
    path: /^\/team\/?$/,
    audience: "staff",
    steps: [
      {
        target: "team-people",
        title: "New: My team",
        body: "Everyone you look after, in one list. Open a person to see their career timeline and leave balance, and add events such as awards or training.",
      },
      {
        target: "team-tabs",
        title: "Team leave balances",
        body: "See how much leave each person has left before you approve a request. To send your team a notice, use Compose on the Notifications page.",
      },
    ],
  },
  {
    id: "employee-profile-2026-10",
    path: /^\/employees\/[^/]+\/?$/,
    audience: "admin",
    steps: [
      {
        target: "employee-header",
        title: "The new employee profile",
        body: "Each employee now has a full profile page with contact actions, key numbers and an Edit button, instead of a side panel.",
      },
      {
        target: "employee-tabs",
        title: "Everything in one place",
        body: "Switch between personal details, employment, the attendance calendar, leave requests and a timeline of the employee's time with the company.",
      },
    ],
  },
  {
    id: "team-pay-promote-2026-10",
    path: /^\/team\/?$/,
    audience: "staff",
    steps: [
      {
        target: "team-people",
        title: "New: Pay and promotions",
        body: "If your role includes salary access, open a person to see their salary, revise it, or promote them to a new designation, role or manager in one step.",
      },
    ],
  },
  {
    id: "team-groups-2026-10",
    path: /^\/team\/?$/,
    audience: "staff",
    steps: [
      {
        target: "team-people",
        title: "New: your teams, one card each",
        body: "Each team you lead or belong to has its own card with its name, department, team lead and members, plus a note saying whether you lead it or are a member.",
      },
    ],
  },
  {
    id: "leave-codes-apply-2026-10",
    path: /^\/my-leaves\/?$/,
    audience: "staff",
    steps: [
      {
        target: "leave-code",
        title: "New: leave codes",
        body: "To apply for leave you now need a one-time code from your team lead or manager. Ask for one from the form; when it arrives in your notifications, pick it here and submit.",
      },
    ],
  },
  {
    id: "leave-codes-team-2026-10",
    path: /^\/team\/?$/,
    audience: "staff",
    steps: [
      {
        target: "team-tabs",
        title: "New: give leave codes",
        body: "People who report to you need a one-time code from you before they can apply for leave. Their requests appear under Leave codes, where you give or refuse a code, or give one without being asked.",
      },
    ],
  },
  {
    id: "org-admin-tools-2026-10",
    path: /^\/org\/(?:chart|reporting|roles)\/?$/,
    audience: "admin",
    steps: [
      {
        title: "Change where people sit",
        body: "Select anyone on the org chart or in reporting lines, then Change place to set who they report to, their designation, team and department.",
      },
    ],
  },
  {
    id: "quotation-alerts-home-2026-10",
    path: /^\/$/,
    audience: "admin",
    steps: [
      {
        target: "quotation-alerts",
        title: "New: Quotation alerts",
        body: "Costs for work done around the office, like electrical or plumbing jobs, now show here until they are paid. Open one to see its invoice.",
      },
    ],
  },
  {
    id: "org-arrange-2026-10",
    path: /^\/org\/chart\/?$/,
    audience: "admin",
    steps: [
      {
        target: "org-arrange",
        title: "New: arrange the organisation",
        body: "Switch to Arrange to drag people between teams and departments, drag a team to another department, pick team leads and department heads, and create or rename teams and departments.",
      },
    ],
  },
  {
    id: "general-alerts-home-2026-10",
    path: /^\/$/,
    audience: "admin",
    steps: [
      {
        title: "New: alerts for things that need you today",
        body: "Your home page now flags employees who haven't checked in by 11:00 AM and aren't on leave, leave requests waiting two or more days, and quotations unpaid for over a week. Hide one with ✕ and it stays hidden until tomorrow.",
      },
    ],
  },
  {
    id: "employee-move-2026-10",
    path: /^\/employees\/[^/]+\/?$/,
    audience: "admin",
    steps: [
      {
        target: "employee-move",
        title: "Change place",
        body: "Change place moves this person to another manager, team or department without logging a promotion.",
      },
    ],
  },
  {
    id: "run-payroll-2026-10",
    path: /^\/salaries\/?$/,
    audience: "admin",
    steps: [
      {
        target: "run-payroll",
        title: "New: run payroll here",
        body: "Pick a month and see every payslip before anything is saved: pay is prorated for joins and exits, and unpaid leave is taken off. Saved payslips stay pending until you mark them paid from the list.",
      },
    ],
  },
  {
    id: "hr-desk-hours-2026-10",
    path: /^\/hr-appointments\/?$/,
    audience: "staff",
    steps: [
      {
        target: "hr-tabs",
        title: "For HR: your desk and your hours",
        body: "If you take HR bookings, As HR lists the ones booked with you, where you can confirm, move, close or cancel them and keep notes. My hours sets when people can book you and blocks out time off.",
      },
    ],
  },
  {
    id: "department-dashboard-2026-10",
    path: /^\/department\/?$/,
    audience: "staff",
    steps: [
      {
        target: "department-summary",
        title: "New: your department at a glance",
        body: "See how many people and teams your department has, who leads each team, and who isn't in a team yet. Open anyone to see their profile, timeline and leave.",
      },
      {
        target: "department-tabs",
        title: "People, leave and pay",
        body: "Switch tabs to list everyone in the department, check their leave balances, or, if your role includes salary access, see the department's monthly pay and yearly cost.",
      },
    ],
  },
  {
    id: "employee-salary-promote-2026-10",
    path: /^\/employees\/[^/]+\/?$/,
    audience: "admin",
    steps: [
      {
        target: "employee-tabs",
        title: "Salary and promotions",
        body: "If your role includes salary access, the Salary tab shows this person's pay, history and payslips, and lets you revise it. Promote, at the top, changes their designation, role or manager and logs one Promotion on their timeline.",
      },
    ],
  },
  {
    id: "employee-real-timeline-2026-10",
    path: /^\/employees\/[^/]+\/?$/,
    audience: "admin",
    steps: [
      {
        target: "employee-tabs",
        title: "The timeline is now real",
        body: "The Timeline tab shows what actually happened: joining, promotions, team and manager changes and salary revisions. You can add awards, training or notes. The Leave tab now shows the leave balance too.",
      },
    ],
  },
  {
    id: "quotations-2026-10",
    path: /^\/quotations\/?$/,
    audience: "admin",
    steps: [
      {
        target: "quotation-new",
        title: "Record a quotation",
        body: "Add the work, the worker's name, contact and agency, the amount and whether it has been paid. An invoice is generated as soon as you save.",
      },
      {
        target: "quotation-period",
        title: "Pick a period",
        body: "Look at one month, the last three months, this year or any dates you choose. The totals and the list follow the period.",
      },
      {
        target: "quotation-totals",
        title: "Know what is outstanding",
        body: "See the total billed, what has been paid and what is still due. To add a payment, edit the quotation and mark it paid. Open any quotation to print or save its invoice as a PDF.",
      },
      {
        title: "Acknowledge each other's quotations",
        body: "When another admin raises a quotation, it shows on your home page until you acknowledge it. The Acknowledged by column shows which admins have seen each one.",
      },
    ],
  },
];

const AUDIENCES = {
  everyone: () => true,
  staff: ({ isCandidate }) => !isCandidate,
  admin: ({ isAdmin }) => isAdmin,
};

/** The first tour on this page the viewer hasn't seen, with only the steps they may see. */
export function tourForPage(pathname, viewer = {}, seen = new Set(), tours = FEATURE_TOURS) {
  const path = String(pathname || "").split(/[?#]/)[0];
  for (const tour of tours) {
    if (seen.has(tour.id) || !tour.path.test(path) || !(AUDIENCES[tour.audience] || AUDIENCES.admin)(viewer)) continue;
    const steps = tour.steps.filter((step) => !step.adminOnly || viewer.isAdmin);
    if (steps.length) return { ...tour, steps };
  }
  return null;
}

export const tourStorageKey = (userId) => `feature-tours:${userId}`;

export function readSeenTours(storage, userId) {
  try {
    const ids = JSON.parse(storage.getItem(tourStorageKey(userId)) || "[]");
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

export function rememberTourSeen(storage, userId, id) {
  const seen = readSeenTours(storage, userId);
  seen.add(id);
  storage.setItem(tourStorageKey(userId), JSON.stringify([...seen]));
}
