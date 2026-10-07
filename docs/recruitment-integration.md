# Recruitment assessment integration

HRCRM administrators can generate and copy candidate-specific assessment links
from Round 1 on the Interviews board. Candidates and Shortlisted candidates
provide assessment viewing. Email delivery is deferred.

## Workflow

1. Select **Test link** beside a candidate in **Round 1** on the Interviews board.
2. HRCRM automatically authorizes assessment access using your current session.
3. Choose a CRM candidate with a valid email, then select **Generate test link**.
4. Copy the returned personal URL. New HRCRM invitations also appear as
   **Open test** under **Round 1** in the candidate's **My interviews** page,
   including after a reload. The backend retains the validation hash and an
   encrypted token bound to the CRM reference and intended email. The admin
   copy panel still keeps its issued URL in memory while switching pages.
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

### Candidate shortlist source

The **Shortlisted** list and every assessment candidate selector share
`fetchShortlistSource()` and the same filtered query cache. Each page requests:

```json
{
  "action": "fetch",
  "module": "hrc_candidates",
  "filters": {
    "employee": 0,
    "hrc_stages_id_c_name": "Shortlisted"
  },
  "page": 1,
  "per_page": 20
}
```

The selector loads its shortlist directly instead of receiving the unfiltered
Interviews directory or a single Candidates page. It follows the filtered
server pagination and rejects responses containing employees, another stage,
or missing eligibility fields. Loading, empty, failure and retry states apply
to the selector itself. A Round 1 initial profile must be present in the
filtered pool before it can be selected for link generation. Direct read-only
assessment viewing still follows an existing profile that has moved beyond
the shortlist, without adding that profile to the dropdown options.

Sync the updated CRM `smart_gateway.php`, or apply
[smart-gateway-shortlist.patch](smart-gateway-shortlist.patch). The displayed
`hrc_stages_id_c_name` is derived from a related stage and was previously
ignored by the generic vardef filter. The gateway now matches the candidate's
existing `hrc_stages_id_c` against an undeleted stage with that name, using bean
metadata for custom-field storage. The predicate applies to both row retrieval
and total counts. A missing field or non-string stage-name filter returns 422
rather than falling through to an unfiltered result.

Verification covers 15 focused frontend tests, PHP syntax, the actual fetch
handler against an isolated SQLite fixture (both standard/custom storage,
pagination/counts, excluded employees/stages and quoted filter values), and
static selector rendering for eligibility, default selection and failure states.
Targeted lint and the production build pass; the build retains its large-chunk warning.

### Assessment connection

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
- Migration `011_hrcrm_invitation_link_storage.sql`, applied after migration 010.
- A dedicated `HRCRM_INVITATION_ENCRYPTION_KEY` on the recruitment server:
  a randomly generated 32-byte key encoded as Base64. Keep it stable, out of
  frontend environment variables, and separate from JWT signing keys.
- The HRCRM access token's signed `email` claim must contain the authenticated
  user's verified email. Candidate reads fail closed if it is missing or invalid.
  Apply the backend's `docs/hrcrm-auth-email.patch` to the PHP issuer: `me()`
  passes the verified login identity into `makeCrmToken()`, which signs its email.
- The HRCRM origin in `CORS_ALLOWED_ORIGINS`. HRCRM should be served over HTTPS.
- `CANDIDATE_APP_URL` pointing at the deployed candidate application, so links
  do not accidentally target localhost.

The migration and backend code are supplied locally; deployment and production
schema changes are separate release steps.

## API contract

| Request | Usage |
| --- | --- |
| `POST /integrations/hrcrm/session` | Exchange the signed HRCRM session token for a limited assessment token |
| `GET /integrations/hrcrm/invitations?external_reference={crmId}` | Candidate invitation history |
| `POST /integrations/hrcrm/invitations` | `candidate_email`, `candidate_first_name`, `candidate_last_name`, `external_reference` |
| `GET /integrations/hrcrm/candidates?search={email}&page_size=100&page={page}` | Exact email matching when there is no accepted bound invitation |
| `GET /integrations/hrcrm/candidates/{id}` | Candidate status, round scores, and integrity details |
| `GET /integrations/hrcrm/my-invitation?external_reference={crmId}` | Candidate's own invitation, authenticated directly with their signed HRCRM access token |

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

## Candidate Round 1 test link

The candidate page fetches its own invitation through `my-invitation`, using
the CRM token directly rather than an administrator assessment session. The
backend verifies the token signature, issuer, audience, type, expiry, subject,
and signed email, then selects only the invitation matching that email and the
CRM reference. A browser-supplied email or role cannot authorize access.
Responses use `Cache-Control: no-store` and omit hashes, ciphertext, recruiter
notes, and administrator details.

Only a pending, unexpired invitation produces **Open test**. Used, withdrawn,
and expired invitations have explanatory states. A missing invitation shows
that HR has not created the test link yet. Test-link loading errors have their
own retry control and leave interview details available. The normal Refresh
button refreshes both sections, and invitation status is rechecked while the
page is active. Times retain the display without a timezone suffix.

Existing invitations stored only as hashes cannot be recovered. HR must use
the existing confirmed replacement action for those links after migration 011
and the server key are configured. This revokes the old unused URL; candidates
then see the new one. The candidate page never creates or replaces an invitation.
Rotating or losing the encryption key prevents recovery of existing encrypted
links, so preserve it in the server's secret management and backups.

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

## Round 1 candidate link verification, 6 October 2026

The candidate UI, private read endpoint, encrypted invitation storage, and
migration 011 are implemented locally. All 30 focused HRCRM tests and all
72 recruitment backend tests pass. Targeted frontend lint, backend syntax
checks, static component rendering for link states, and the HRCRM production
build pass. The build retains its large-chunk warning. Deployment requires the
server configuration and migration above; existing hash-only links require an
explicit replacement. The deployed authentication issuer's signed email claim
still needs verification against its actual configuration.

The supplied authentication issuer was inspected and corrected on 6 October:
the login response had an email, while its CRM access token omitted that claim.
`AuthController.php` now signs the email from the verified login identity. Sync
that file to the auth server before retrying the test link. A manual retry
obtains a fresh token from the existing login after this specific error.
Missing-email errors now describe an access setup problem instead of asking
the candidate to sign in again; automatic replay, interval polling, and
window-focus refetch are suppressed for that error.

The issuer's PHP lint and isolated real-method smoke check pass, along with
33 focused frontend tests, 72 backend tests, and targeted frontend lint.
