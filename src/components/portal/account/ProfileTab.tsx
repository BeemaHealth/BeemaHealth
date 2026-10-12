import { accountKeys } from "../query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getMe, getProfile, updateMe, type Me } from "@/lib/api/portal/account";
import { ApiError } from "@/lib/api/portal/client";
import { PortalLink } from "../PortalLink";
import { ErrorState, InlineError, LoadingBlock } from "../PortalStates";
import { errorMessage } from "../portal-errors";
import { formatDate } from "../portal-format";
import { formatPhone, validateName, validatePhone } from "./account-model";

function initials(me: Me): string {
  return (
    `${me.first_name.charAt(0)}${me.last_name.charAt(0)}`.toUpperCase() ||
    me.email.charAt(0).toUpperCase()
  );
}

function EditProfileDialog({ me, onClose }: { me: Me; onClose: () => void }) {
  const qc = useQueryClient();
  const [first, setFirst] = useState(me.first_name);
  const [last, setLast] = useState(me.last_name);
  const [phone, setPhone] = useState(me.phone ? formatPhone(me.phone) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: () =>
      updateMe({
        first_name: first.trim(),
        last_name: last.trim(),
        phone: phone.trim(),
      }),
    onSuccess: (updated) => {
      qc.setQueryData(accountKeys.me, updated);
      void qc.invalidateQueries({ queryKey: ["portal", "me"] });
      onClose();
    },
    onError: (e) => {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) {
        setErrors(
          Object.fromEntries(
            Object.entries(e.fieldErrors).map(([k, v]) => [k, v[0]]),
          ),
        );
      }
    },
  });

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const found: Record<string, string> = {};
    const f = validateName(first, "First name");
    const l = validateName(last, "Last name");
    const p = validatePhone(phone);
    if (f) found.first_name = f;
    if (l) found.last_name = l;
    if (p) found.phone = p;
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit information</DialogTitle>
          <DialogDescription>
            Update your name and phone number. To change your email, message
            support.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label htmlFor="pf-first" className="text-sm font-medium">
                First name
              </label>
              <Input
                id="pf-first"
                autoComplete="given-name"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                aria-invalid={!!errors.first_name}
              />
              <InlineError message={errors.first_name} />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="pf-last" className="text-sm font-medium">
                Last name
              </label>
              <Input
                id="pf-last"
                autoComplete="family-name"
                value={last}
                onChange={(e) => setLast(e.target.value)}
                aria-invalid={!!errors.last_name}
              />
              <InlineError message={errors.last_name} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="pf-phone" className="text-sm font-medium">
              Phone
            </label>
            <Input
              id="pf-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!errors.phone}
            />
            <InlineError message={errors.phone} />
          </div>
          {save.isError && Object.keys(errors).length === 0 && (
            <InlineError message={errorMessage(save.error)} />
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={save.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProfileTab() {
  const me = useQuery({ queryKey: accountKeys.me, queryFn: getMe });
  const profile = useQuery({
    queryKey: accountKeys.profile,
    queryFn: getProfile,
  });
  const [editing, setEditing] = useState(false);

  if (me.isPending) return <LoadingBlock rows={1} label="Loading profile" />;
  if (me.isError)
    return <ErrorState error={me.error} onRetry={() => void me.refetch()} />;
  const u = me.data;
  const name = `${u.first_name} ${u.last_name}`.trim() || "Your name";

  return (
    <div className="grid gap-4">
      <section
        aria-labelledby="profile-heading"
        className="rounded-3xl border border-border bg-card p-5 shadow-soft"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span
            aria-hidden="true"
            className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-2xl font-semibold"
          >
            {initials(u)}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="profile-heading"
              className="font-display text-xl font-semibold"
            >
              {name}
            </h2>
            <dl className="mt-1 grid gap-0.5 text-sm text-muted-foreground">
              <div className="flex gap-1.5">
                <dt>Date of birth:</dt>
                <dd className="text-foreground">
                  {profile.isSuccess
                    ? formatDate(profile.data.date_of_birth, "Not set")
                    : profile.isError
                      ? "Unavailable"
                      : "Loading"}
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="size-3.5" aria-hidden="true" />
                <dt className="sr-only">Email</dt>
                <dd className="break-all text-foreground">{u.email}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="size-3.5" aria-hidden="true" />
                <dt className="sr-only">Phone</dt>
                <dd className="text-foreground">
                  {u.phone ? formatPhone(u.phone) : "Not set"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={() => setEditing(true)}>
            Edit information
          </Button>
          <Button type="button" variant="outline" asChild>
            <PortalLink to="/portal/chat">Change email via support</PortalLink>
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="help-heading"
        className="rounded-3xl border border-border bg-card p-5 shadow-soft"
      >
        <h2 id="help-heading" className="font-display text-lg font-semibold">
          Help and support
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Get answers by reaching out to our care team, or share your feedback
          to help us improve.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          asChild
        >
          <PortalLink to="/portal/chat">Message the care team</PortalLink>
        </Button>
      </section>

      {editing && (
        <EditProfileDialog me={u} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}
