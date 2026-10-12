# Scheduled Management Commands

Every production deployment must run these commands on their specified cadence to keep the system operational.

## Every Minute

**`process_pending_events`** - Process received and retryable inbound webhook events.
```bash
python manage.py process_pending_events --limit 100
```
What it does: Ingests Beluga (doctor network), LifeFile (pharmacy), and Stripe webhooks; processes state transitions, creates treatments, applies prescriptions, updates orders, and records events. If it stops: treatments may get stuck pending state transitions, prescriptions are delayed, and shipments are not tracked.

**`deliver_pending_messages`** - Deliver queued patient and staff messages with exponential backoff.
```bash
python manage.py deliver_pending_messages
```
What it does: Retries failed outbound messages to the doctor network. If it stops: staff and patient messages are stuck in queue; doctor communication is blocked.

## Every 10 Minutes

**`send_abandoned_checkout_emails`** - Send abandoned checkout drip emails (1, 3, 24, 48, 72, 168, 336 hours).
```bash
python manage.py send_abandoned_checkout_emails
```
What it does: Sends email reminders at scheduled intervals to patients who started but did not complete checkout. If it stops: abandoned checkout recovery sequence is interrupted and lost revenue increases.

## Daily (Midnight UTC or preferred time)

**`run_renewals`** - Charge due subscription renewals and mark completed terms.
```bash
python manage.py run_renewals
```
What it does: Invokes Stripe to charge customers on their renewal dates (monthly, 3-month, 6-month, 12-month subscriptions); marks billing periods that are done. Safe to run repeatedly - each period charges once. If it stops: subscription revenue is not collected and patients are not notified.

**`release_batches`** - Release shipment batches due to ship.
```bash
python manage.py release_batches
```
What it does: Marks ShipmentBatches as ready to submit to the pharmacy when the treatment is active/prescribed and all prerequisite check-ins are complete. If it stops: ordered medications are not shipped and patients do not receive medication.

## Nightly (Optional; typically 02:00 UTC)

**`reconcile_visits`** - Fetch open visits from the doctor network and repair missed webhooks.
```bash
python manage.py reconcile_visits --limit 200
```
What it does: Queries Beluga for visits that are still open (not yet concluded) and syncs state if a webhook was missed or lost. Updates visit status, applies prescriptions, and marks treatments as submitted. If it stops: missed webhook events are not recovered and treatments can get orphaned in incorrect states.

## Setup / Manual

**`load_definitions`** - Load catalog, routing organizations, and routing rules from YAML (idempotent).
```bash
python manage.py load_definitions
```
Loads products, variants, plans, pricing, and routing rules from `backend/definitions/catalog/*.yaml`.

**`load_questionnaires`** - Load questionnaire definitions and layouts from JSON (idempotent).
```bash
python manage.py load_questionnaires
```
Publishes questionnaire versions from `backend/definitions/questionnaires/*.json` and layouts from `backend/definitions/layouts/*.json`.

## Optional / Reporting

**`audit_prune_check`** - Report how many audit events exceed the retention window (6 years, read-only, never deletes).
```bash
python manage.py audit_prune_check
```
What it does: Counts audit logs older than the retention policy for compliance reporting. Does not delete anything.

## Suggested Cron Schedule

```
# Process webhooks and messages every minute
* * * * * cd /path/to/backend && python manage.py process_pending_events
* * * * * cd /path/to/backend && python manage.py deliver_pending_messages

# Abandoned checkout emails every 10 minutes
*/10 * * * * cd /path/to/backend && python manage.py send_abandoned_checkout_emails

# Renewals and shipments daily
0 0 * * * cd /path/to/backend && python manage.py run_renewals
0 0 * * * cd /path/to/backend && python manage.py release_batches

# Reconcile visits nightly
0 2 * * * cd /path/to/backend && python manage.py reconcile_visits

# Audit retention check weekly
0 3 * * 0 cd /path/to/backend && python manage.py audit_prune_check
```

Add these entries to your production cron scheduler (Kubernetes CronJob, AWS EventBridge, Heroku Scheduler, etc.). Each command is idempotent and can be rerun safely if it fails.
