import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import { patchAuthMe, syncEligibility } from "@/lib/api/client";
import { US_STATE_ENTRIES } from "@/lib/us-states";
import type { EligibilityResponses, User } from "@/lib/types/mvp";
import { toast } from "sonner";

export function EligibilityAccountEditor({
  user,
  eligibility,
  bmi,
  onSaved,
}: {
  user: User;
  eligibility: EligibilityResponses | null;
  bmi: number | null;
  onSaved: (user: User, eligibility: EligibilityResponses | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone ?? "",
    dob: user.dob ?? eligibility?.dob ?? "",
    state: user.state ?? eligibility?.state ?? "",
    height_ft: eligibility?.height_ft?.toString() ?? "",
    height_in: eligibility?.height_in?.toString() ?? "",
    weight_lbs: eligibility?.weight_lbs?.toString() ?? "",
    goal_weight_lbs: eligibility?.goal_weight_lbs?.toString() ?? "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone ?? "",
      dob: user.dob ?? eligibility?.dob ?? "",
      state: user.state ?? eligibility?.state ?? "",
      height_ft: eligibility?.height_ft?.toString() ?? "",
      height_in: eligibility?.height_in?.toString() ?? "",
      weight_lbs: eligibility?.weight_lbs?.toString() ?? "",
      goal_weight_lbs: eligibility?.goal_weight_lbs?.toString() ?? "",
    });
  }, [open, user, eligibility]);

  const rows = [
    ["Name", `${user.first_name} ${user.last_name}`.trim() || "—"],
    ["Email", user.email],
    ["Phone", user.phone || "—"],
    ["Date of birth", user.dob || eligibility?.dob || "—"],
    ["State", user.state || eligibility?.state || "—"],
    [
      "Height",
      eligibility?.height_ft != null
        ? `${eligibility.height_ft}' ${eligibility.height_in ?? 0}"`
        : "—",
    ],
    [
      "Weight",
      eligibility?.weight_lbs != null ? `${eligibility.weight_lbs} lb` : "—",
    ],
    [
      "Goal weight",
      eligibility?.goal_weight_lbs != null
        ? `${eligibility.goal_weight_lbs} lb`
        : "—",
    ],
    ["BMI", bmi != null ? String(bmi) : "—"],
  ];

  async function handleSave() {
    setSaving(true);
    try {
      const session = await patchAuthMe({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        dob: form.dob || undefined,
        state: form.state,
      });
      const updatedEligibility = await syncEligibility({
        height_ft: form.height_ft ? Number(form.height_ft) : null,
        height_in: form.height_in ? Number(form.height_in) : null,
        weight_lbs: form.weight_lbs ? Number(form.weight_lbs) : null,
        goal_weight_lbs: form.goal_weight_lbs
          ? Number(form.goal_weight_lbs)
          : null,
      });
      onSaved(session.user, updatedEligibility ?? eligibility);
      toast.success("Account information updated.");
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground">
            Already on file from your account & eligibility check
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl"
            onClick={() => setOpen(true)}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        </div>
        <dl className="mt-2 grid gap-1 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit account & eligibility info</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required>
              <input
                className={inputCls}
                value={form.first_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, first_name: e.target.value }))
                }
              />
            </Field>
            <Field label="Last name" required>
              <input
                className={inputCls}
                value={form.last_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, last_name: e.target.value }))
                }
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </Field>
            <Field label="Phone" required>
              <input
                type="tel"
                className={inputCls}
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </Field>
            <Field label="Date of birth">
              <input
                type="date"
                className={inputCls}
                value={form.dob}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dob: e.target.value }))
                }
              />
            </Field>
            <Field label="State">
              <select
                className={inputCls}
                value={form.state}
                onChange={(e) =>
                  setForm((f) => ({ ...f, state: e.target.value }))
                }
              >
                <option value="">Select state</option>
                {US_STATE_ENTRIES.map(([abbr, name]) => (
                  <option key={abbr} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Height (ft)">
              <input
                type="number"
                min={3}
                max={8}
                className={inputCls}
                value={form.height_ft}
                onChange={(e) =>
                  setForm((f) => ({ ...f, height_ft: e.target.value }))
                }
              />
            </Field>
            <Field label="Height (in)">
              <input
                type="number"
                min={0}
                max={11}
                className={inputCls}
                value={form.height_in}
                onChange={(e) =>
                  setForm((f) => ({ ...f, height_in: e.target.value }))
                }
              />
            </Field>
            <Field label="Weight (lb)">
              <input
                type="number"
                min={50}
                max={700}
                step={0.1}
                className={inputCls}
                value={form.weight_lbs}
                onChange={(e) =>
                  setForm((f) => ({ ...f, weight_lbs: e.target.value }))
                }
              />
            </Field>
            <Field label="Goal weight (lb)">
              <input
                type="number"
                min={50}
                max={700}
                step={0.1}
                className={inputCls}
                value={form.goal_weight_lbs}
                onChange={(e) =>
                  setForm((f) => ({ ...f, goal_weight_lbs: e.target.value }))
                }
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
