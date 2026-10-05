# Recruitment assessment integration

HRCRM administrators can generate and copy candidate-specific assessment links
from Round 1 on the Interviews board. Candidates and Shortlisted candidates
provide assessment viewing. Email delivery is deferred.

## Workflow

1. Select **Test link** beside a candidate in **Round 1** on the Interviews board.
2. HRCRM automatically authorizes assessment access using your current session.
3. Choose a CRM candidate with a valid email, then select **Generate test link**.
4. Copy the returned personal URL. The backend stores only its hash, so HRCRM
   cannot retrieve the URL after a page reload. Newly created links remain
   available in memory while switching between HRCRM pages in the same session.
5. Refresh status to view registration, assessment scores, submitted rounds,
   hiring decision, and integrity warnings.

Generating a replacement requires an inline confirmation and revokes the previous
unused invitation. Registered candidates show assessment progress instead of
another invitation; the recruitment app does not yet support retest authorization.
Assessment results do not automatically change CRM interview outcomes.

Only Round 1 interview cards show **Test link** once the candidate directory loads,
regardless of their schedule, round decision, or CRM rejection status. Linked CRM
candidates are selected automatically. Interviews without a matching CRM profile
open the candidate selector with the interview's name and email for context.
An unmatched explicit candidate ID or ambiguous email never selects another
profile automatically. Generating a link still requires a saved CRM candidate
with a valid email and recruitment invitation permission.
The shared assessment panel only generates or replaces links when opened with a
Round 1 interview. Later rounds do not show the control, the general Interviews
generation shortcut is removed, and Candidates and Shortlisted provide
**View assessment** controls instead.

The Interviews view groups the actual CRM round names into a kanban board.
Icon-led cards summarize the pipeline, scheduled interviews, interviews needing
a date, and current rounds. Search, round, and status filters work across the
board. Candidate cards retain scheduling, test links, decisions, and feedback;
passing still requires feedback and creates the next round. Rounds scroll
horizontally on narrower desktop layouts and stack on mobile.

Drag a pending card's handle to another visible round to open feedback with the
destination selected. Save feedback to pass the source round and continue in
the destination; cancel to leave the interview unchanged. Existing pending
destination interviews are reused, including their schedule. Completed
destinations are rejected without changing the source. Completed interviews
and rejected candidates cannot be dragged. Mouse, touch, and keyboard controls
are supported: Space or Enter picks up a handle, arrow keys choose an adjacent
visible round, Space or Enter opens feedback, and Escape cancels the drag.

The interview view, action dialog, and assessment panel use Tailwind utilities
and the existing theme variables in `src/index.css`. Shared Button components
are used for interview controls. No separate interview or recruitment stylesheet
or additional color-token system is required.

## Configuration and prerequisites

Set `VITE_RECRUITMENT_API_URL` in the HRCRM environment to the public API root.
The current default is `https://recruitmentbackend.outrightsystems.org/api`.
Local development can use `http://localhost:3001/api`. HTTPS is required for
non-local endpoints.

The recruitment backend's in-progress HRCRM changes must be deployed, including:

- The scoped `/api/integrations/hrcrm` token-exchange routes.
- HRCRM's RSA public verification key, actual token issuer and audience, a
  signed administrator role claim, and an existing active
  recruitment account ID configured on the recruitment server. See the backend's
  `docs/hrcrm-integration.md` for the exact environment variables.
- The auth backend's `AuthController.php` must sign `role=admin` from the verified
  CRM profile's `status=admin`, and `role=user` for other users. No per-user ID
  allowlist is used. The backend's `docs/hrcrm-auth-token.patch` contains this change.
- Candidate-bound invitation metadata and email enforcement.
- Migration `010_candidate_invitation_context.sql`, applied after migrations 001–009.
- The HRCRM origin in `CORS_ALLOWED_ORIGINS`. HRCRM should be served over HTTPS.
- `CANDIDATE_APP_URL` pointing at the deployed candidate application, so links
  do not accidentally target localhost.

No migration or backend deployment is performed by this frontend change.

## API contract

| Request | Usage |
| --- | --- |
| `POST /integrations/hrcrm/session` | Exchange the signed HRCRM session token for a limited assessment token |
| `GET /integrations/hrcrm/invitations?external_reference={crmId}` | Candidate invitation history |
| `POST /integrations/hrcrm/invitations` | `candidate_email`, `candidate_first_name`, `candidate_last_name`, `external_reference` |
| `GET /integrations/hrcrm/candidates?search={email}&page_size=100&page={page}` | Exact email matching when there is no accepted bound invitation |
| `GET /integrations/hrcrm/candidates/{id}` | Candidate status, round scores, and integrity details |

The invitation response must include `invitation_url` and an `invitation` with
matching `external_reference` and `intended_email`. HRCRM refuses an unbound link.
Accepted invitations' candidate IDs take precedence over email search. Fuzzy
search results never associate a different email with the CRM candidate.

Only authenticated HRCRM admins see integration controls. The recruitment
backend verifies the HRCRM token's RS256 signature, issuer, audience, expiry,
user identity, and administrator authorization before issuing a token valid for
at most five minutes. The configured recruitment account's current role and
active state are checked on every assessment request. All signed HRCRM admins
share that configured recruitment account; the original CRM subject is retained
in audit entries. Owners, admins, and
recruiters may generate links; other roles may view progress.

Both tokens stay in memory. HRCRM refreshes them automatically, without another
login or a shared secret in a Vite environment variable. Cookies are omitted
from recruitment requests. Limited tokens cannot access general admin routes,
question banks, settings, or candidate mutations. Invitation audit entries
include the verified HRCRM actor ID.

## Implementation status and verification, 5 October 2026

The recruitment workspace already contains the backend contract and candidate
registration changes as ongoing, uncommitted work. Those files were preserved.
Its 62 backend tests and 36 focused HRCRM tests pass. The production dashboard responds with HTTP 401
without authentication, confirming reachability and authentication protection.
This does not establish that migration 010 or the latest changes are deployed.
Live link generation requires the server-side integration account and HRCRM
token-verification configuration. Deploy the PHP issuer's signed `role` claim
and refresh HRCRM to obtain a fresh token. New CRM administrators are authorized
automatically; no environment change is needed when adding an administrator.
