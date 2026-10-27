// "What's new" tours. When a page or feature ships, add an entry here: the first time a user
// opens a matching page they see its steps once, and never again after that.
//
// - id: unique and never reused; changing it shows the tour again to everyone.
// - path: the pages it appears on.
// - audience: "everyone", "staff" (not candidates) or "admin".
// - steps[].target: optional `data-tour` value of an element to spotlight.
// - steps[].adminOnly: shown only to admins.

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
