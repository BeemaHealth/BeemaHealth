import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section } from "@/components/site/primitives";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Aretide" },
      { name: "description", content: "How Aretide collects, uses, and protects your health information." },
    ],
    links: [{ rel: "canonical", href: "/legal/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <MarketingLayout>
      <Section>
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Sample policy for demonstration. Replace with reviewed legal copy before launch.</p>
          <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
            <p>Aretide is committed to protecting your health information. We use encryption in transit and at rest, role-based access controls, and audit logs for clinical and administrative actions. We do not expose your health data in application logs.</p>
            <p>We collect information you provide during intake, account creation, and ongoing care — including contact details, medical history, documents you upload, and progress data you log. We use this information to provide care coordination, support, and the services you request.</p>
            <p>We do not send your protected health information to third-party AI services unless there is a signed business associate agreement and an approved, compliant architecture. Where AI is used, a human reviews and approves anything clinical or compliance-sensitive before it is sent.</p>
            <p>You can request access to or deletion of your data, and manage your communication preferences in the app. For privacy questions, contact our support team.</p>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}
