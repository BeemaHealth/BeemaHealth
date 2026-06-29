import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import {
  createStaffLandingPage,
  deleteStaffLandingPage,
  fetchStaffLandingPages,
  updateStaffLandingPage,
  type LandingPageItem,
} from "@/lib/api/client";
import { landingPageDisplayUrl, landingPageUrl } from "@/lib/site-url";
import { Check, Copy, Link2 } from "lucide-react";

export const Route = createFileRoute("/staff/landing-pages")({
  component: StaffLandingPagesPage,
});

type FormState = {
  name: string;
  slug: string;
  headline: string;
  subheadline: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  redirect_to_home: boolean;
  active: boolean;
};

const EMPTY: FormState = {
  name: "",
  slug: "",
  headline: "",
  subheadline: "",
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_content: "",
  redirect_to_home: false,
  active: true,
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function CopyLinkButton({
  url,
  label = "Copy link",
}: {
  url: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments where Clipboard API is unavailable.
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => void handleCopy()}
      aria-label={copied ? "Link copied" : label}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function LandingPageForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: FormState;
  onSave: (f: FormState) => void;
  onCancel?: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);

  function set(field: keyof FormState, value: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "name" && typeof value === "string" && !prev.slug) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  const adUrl = form.slug ? landingPageUrl(form.slug) : "";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-3"
    >
      <Field label="Internal name" required>
        <input
          className={inputCls}
          value={form.name}
          maxLength={128}
          placeholder="e.g. Facebook — Semaglutide Jan"
          required
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>
      <Field label="Slug (part of the ad URL)" required>
        <input
          className={inputCls}
          value={form.slug}
          maxLength={64}
          pattern="[a-z0-9][a-z0-9\-_]*"
          title="Lowercase letters, numbers, hyphens"
          placeholder="e.g. fb-sema-jan"
          required
          onChange={(e) => set("slug", e.target.value.toLowerCase())}
        />
        {adUrl && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Ad URL: <span className="font-mono">{adUrl}</span>
            </p>
            <CopyLinkButton url={adUrl} label="Copy" />
          </div>
        )}
      </Field>
      <Field label="Page headline (shown to visitor)">
        <input
          className={inputCls}
          value={form.headline}
          maxLength={256}
          placeholder="e.g. Lose weight with real clinical support"
          onChange={(e) => set("headline", e.target.value)}
        />
      </Field>
      <Field label="Page subheadline">
        <input
          className={inputCls}
          value={form.subheadline}
          maxLength={512}
          placeholder="e.g. GLP-1 medications with licensed providers, shipped to your door."
          onChange={(e) => set("subheadline", e.target.value)}
        />
      </Field>

      <div className="rounded-lg border border-border p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          UTM attribution (auto-applied to sessions from this link)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="utm_source">
            <input
              className={inputCls}
              value={form.utm_source}
              maxLength={128}
              placeholder="facebook"
              onChange={(e) => set("utm_source", e.target.value)}
            />
          </Field>
          <Field label="utm_medium">
            <input
              className={inputCls}
              value={form.utm_medium}
              maxLength={128}
              placeholder="cpa"
              onChange={(e) => set("utm_medium", e.target.value)}
            />
          </Field>
          <Field label="utm_campaign">
            <input
              className={inputCls}
              value={form.utm_campaign}
              maxLength={128}
              placeholder="semaglutide_jan_2026"
              onChange={(e) => set("utm_campaign", e.target.value)}
            />
          </Field>
          <Field label="utm_content">
            <input
              className={inputCls}
              value={form.utm_content}
              maxLength={128}
              placeholder="carousel_v2"
              onChange={(e) => set("utm_content", e.target.value)}
            />
          </Field>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.redirect_to_home}
          onChange={(e) => set("redirect_to_home", e.target.checked)}
        />
        Redirect to home page (captures UTMs then sends visitor to{" "}
        <span className="font-mono">/</span>)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set("active", e.target.checked)}
        />
        Active (page loads for visitors)
      </label>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function StaffLandingPagesPage() {
  const [pages, setPages] = useState<LandingPageItem[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function reload() {
    const data = await fetchStaffLandingPages();
    setPages(data);
  }

  useEffect(() => {
    void reload().catch(() => setPages([]));
  }, []);

  async function handleCreate(form: FormState) {
    setSaving(true);
    setError("");
    try {
      await createStaffLandingPage(form);
      setShowNew(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, form: FormState) {
    setSaving(true);
    setError("");
    try {
      await updateStaffLandingPage(id, form);
      setEditingId(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteStaffLandingPage(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Landing pages</h1>
          <p className="text-sm text-muted-foreground">
            Create trackable URLs for ads. Each page captures UTMs and
            attributes sessions to the ad that sent them.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} disabled={showNew}>
          New landing page
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {showNew && (
        <AccountSectionCard
          tone="contact"
          title="New landing page"
          icon={Link2}
        >
          <LandingPageForm
            initial={EMPTY}
            onSave={handleCreate}
            onCancel={() => setShowNew(false)}
            saving={saving}
          />
        </AccountSectionCard>
      )}

      {pages.length === 0 && !showNew && (
        <p className="text-sm text-muted-foreground">No landing pages yet.</p>
      )}

      <div className="space-y-4">
        {pages.map((p) => (
          <AccountSectionCard
            key={p.id}
            tone={p.active ? "consent" : "contact"}
            title={p.name}
            icon={Link2}
            description={[
              landingPageDisplayUrl(p.slug),
              p.utm_source && `src: ${p.utm_source}`,
              p.utm_campaign && `campaign: ${p.utm_campaign}`,
              !p.active && "Inactive",
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            {editingId === p.id ? (
              <LandingPageForm
                initial={{
                  name: p.name,
                  slug: p.slug,
                  headline: p.headline,
                  subheadline: p.subheadline,
                  utm_source: p.utm_source,
                  utm_medium: p.utm_medium,
                  utm_campaign: p.utm_campaign,
                  utm_content: p.utm_content,
                  redirect_to_home: p.redirect_to_home,
                  active: p.active,
                }}
                onSave={(form) => void handleUpdate(p.id, form)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                <CopyLinkButton url={landingPageUrl(p.slug)} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingId(p.id)}
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <a
                    href={`/lp/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Preview
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => void handleDelete(p.id, p.name)}
                >
                  Delete
                </Button>
              </div>
            )}
          </AccountSectionCard>
        ))}
      </div>
    </div>
  );
}
