import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section } from "@/components/site/primitives";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Aretide" },
      { name: "description", content: "The terms that govern your use of Aretide's telehealth platform." },
    ],
    links: [{ rel: "canonical", href: "/legal/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <MarketingLayout>
      <Section>
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">Terms of Service</h1>
          <p className="mt-3 text-sm text-muted-foreground">Sample terms for demonstration. Replace with reviewed legal copy before launch.</p>
          <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
            <p>Aretide is a technology platform that connects patients with independently licensed clinicians. Aretide does not practice medicine and does not guarantee that any patient will receive a prescription. All clinical decisions are made independently by licensed providers.</p>
            <p>Membership and medication are billed separately. We disclose charges before they occur and provide receipts for billing changes. You may pause or cancel your membership at any time through self-serve tools in the app.</p>
            <p>Medication availability, pricing, insurance coverage, and prior-authorization outcomes are determined by third parties and are not guaranteed by Aretide. Aretide does not claim its services are equivalent to any specific branded medication.</p>
            <p>If you are experiencing a medical emergency, call 911. This platform does not provide emergency care.</p>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}
