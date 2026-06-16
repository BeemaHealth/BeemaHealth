import { createFileRoute } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section } from "@/components/site/primitives";

export const Route = createFileRoute("/legal/telehealth-consent")({
  head: () => ({
    meta: [
      { title: "Telehealth Consent — Aretide" },
      { name: "description", content: "Understand and consent to telehealth care with Aretide's licensed clinicians." },
    ],
    links: [{ rel: "canonical", href: "/legal/telehealth-consent" }],
  }),
  component: ConsentPage,
});

function ConsentPage() {
  return (
    <MarketingLayout>
      <Section>
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">Telehealth Consent</h1>
          <p className="mt-3 text-sm text-muted-foreground">Sample consent for demonstration. Replace with reviewed legal copy before launch.</p>
          <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
            <p>Telehealth involves the use of secure electronic communications to enable clinicians to evaluate and care for you remotely. By using Aretide, you consent to receiving care via telehealth from licensed clinicians.</p>
            <p>You understand that a clinician will independently evaluate whether treatment is appropriate, that no prescription is guaranteed, and that you may be asked follow-up questions or to provide additional information such as labs.</p>
            <p>You acknowledge the potential benefits and limitations of telehealth, including that some conditions may require in-person care. You consent to secure messaging and to receiving communications about your care, billing, and refills.</p>
            <p>If you are experiencing a medical emergency, call 911. Telehealth is not a substitute for emergency care.</p>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}
