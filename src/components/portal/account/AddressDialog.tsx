import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  createAddress,
  updateAddress,
  type Address,
  type AddressInput,
} from "@/lib/api/portal/account";
import { ApiError } from "@/lib/api/portal/client";
import { InlineError } from "../PortalStates";
import { errorMessage } from "../portal-errors";
import {
  emptyAddress,
  normalizeAddress,
  validateAddress,
  type AddressErrors,
} from "./account-model";
import { accountKeys } from "../query-keys";

export function AddressDialog({
  address,
  onClose,
}: {
  address: Address | "new";
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const existing = address === "new" ? null : address;
  const [values, setValues] = useState<AddressInput>(
    existing
      ? {
          kind: existing.kind,
          line1: existing.line1,
          line2: existing.line2,
          city: existing.city,
          state: existing.state,
          zip_code: existing.zip_code,
          is_default: existing.is_default,
        }
      : emptyAddress(),
  );
  const [errors, setErrors] = useState<AddressErrors>({});

  const save = useMutation({
    mutationFn: (v: AddressInput) =>
      existing ? updateAddress(existing.id, v) : createAddress(v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: accountKeys.addresses });
      onClose();
    },
    onError: (e) => {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) {
        setErrors(
          Object.fromEntries(
            Object.entries(e.fieldErrors).map(([k, v]) => [k, v[0]]),
          ) as AddressErrors,
        );
      }
    },
  });

  const set = <K extends keyof AddressInput>(k: K, v: AddressInput[K]) =>
    setValues({ ...values, [k]: v });

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const found = validateAddress(values);
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate(normalizeAddress(values));
  }

  const field = (
    id: string,
    label: string,
    key: keyof AddressErrors & keyof AddressInput,
    auto: string,
    extra?: string,
  ) => (
    <div className={`grid gap-1.5 ${extra ?? ""}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        autoComplete={auto}
        value={String(values[key])}
        onChange={(e) => set(key, e.target.value as never)}
        aria-invalid={!!errors[key]}
      />
      <InlineError message={errors[key]} />
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit address" : "Add address"}</DialogTitle>
          <DialogDescription>
            We ship treatment to your default shipping address.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4">
          {field("addr-line1", "Street address", "line1", "address-line1")}
          {field(
            "addr-line2",
            "Apartment, suite (optional)",
            "line2",
            "address-line2",
          )}
          <div className="grid gap-4 sm:grid-cols-6">
            {field(
              "addr-city",
              "City",
              "city",
              "address-level2",
              "sm:col-span-3",
            )}
            {field(
              "addr-state",
              "State",
              "state",
              "address-level1",
              "sm:col-span-1",
            )}
            {field(
              "addr-zip",
              "ZIP code",
              "zip_code",
              "postal-code",
              "sm:col-span-2",
            )}
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="addr-kind" className="text-sm font-medium">
              Type
            </label>
            <select
              id="addr-kind"
              value={values.kind}
              onChange={(e) =>
                set("kind", e.target.value as AddressInput["kind"])
              }
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="shipping">Shipping</option>
              <option value="billing">Billing</option>
              <option value="home">Home</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.is_default}
              onChange={(e) => set("is_default", e.target.checked)}
              className="size-4 accent-primary"
            />
            Make this my default address
          </label>
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
              {save.isPending ? "Saving" : "Save address"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
