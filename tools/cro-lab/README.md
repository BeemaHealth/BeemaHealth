# Beema CRO Lab

The CRO Lab is a local-only dashboard. Start it with `npm run cro` and open
`http://127.0.0.1:8787`. Its live mode reads GA4 property `546707320`; it does
not modify GA4 or the production site.

## GA4 authentication

Both the CRO Lab and Claude Code's user-scoped `analytics-mcp` use the same
Application Default Credentials file:

`~/.config/gcloud/application_default_credentials.json`

That file contains a refreshable, keyless `impersonated_service_account`
configuration targeting:

`beema-cro-analytics@beema-health.iam.gserviceaccount.com`

The source user has `roles/iam.serviceAccountTokenCreator` on that service
account only. The service account has read-only Viewer access to the GA4
property. No service-account JSON key is used, and the organization policy that
blocks key creation remains enabled.

Run the end-to-end health check from the repository root:

```sh
npm run cro:auth-check
```

The check requests a real 30-day `intake_handoff` report and exits nonzero if
authentication or property access fails.

## Recovery

If Google Workspace session controls or an administrator revokes the source
refresh token, recreate the same keyless ADC configuration:

```sh
gcloud auth login --update-adc
gcloud config set project beema-health
gcloud auth application-default login \
  --impersonate-service-account=beema-cro-analytics@beema-health.iam.gserviceaccount.com
```

The browser sign-in is the only interactive step. Do not add an
`analytics.readonly` scope to the source-user login: the impersonated service
account receives the API client's read-only Analytics scope automatically.

The ADC file persists across terminal, application, and computer restarts.
Access tokens are short-lived and refresh automatically. The upstream Google
Workspace refresh token can still require reauthentication because of domain
session policy, account-security events, explicit revocation, or administrator
changes; service-account impersonation cannot bypass those controls.

## Claude Code MCP

`analytics-mcp` is registered at user scope and points
`GOOGLE_APPLICATION_CREDENTIALS` to the shared ADC file above. Check process
registration with:

```sh
claude mcp get analytics-mcp
```

Restarting the MCP process does not require a new login while the upstream
refresh credential remains valid.

## Failure behavior

The live GA4 reader caches successful results for 60 seconds and keeps serving
the last successful in-process result, marked stale, if a later refresh fails.
Authentication, missing-property permission, and general API failures are
reported separately in the dashboard.
