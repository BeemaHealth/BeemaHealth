import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import { Field, inputCls } from "@/components/quiz/quiz-primitives";
import {
  createStaffExperiment,
  createStaffExperimentVariant,
  fetchStaffExperimentResults,
  fetchStaffExperiments,
  patchStaffExperiment,
  type ExperimentSchema,
} from "@/lib/api/client";
import { FlaskConical } from "lucide-react";

export const Route = createFileRoute("/staff/experiments")({
  component: StaffExperimentsPage,
});

function StaffExperimentsPage() {
  const [experiments, setExperiments] = useState<ExperimentSchema[]>([]);
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [results, setResults] = useState<unknown[]>([]);
  const [variantKey, setVariantKey] = useState("treatment");
  const [versionId, setVersionId] = useState("");
  const [weight, setWeight] = useState("50");

  async function reload() {
    const data = await fetchStaffExperiments();
    setExperiments(data);
  }

  useEffect(() => {
    void reload().catch(() => setExperiments([]));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void fetchStaffExperimentResults(selectedId)
      .then((r) => setResults(r.variants))
      .catch(() => setResults([]));
  }, [selectedId]);

  async function handleCreate() {
    if (!name.trim()) return;
    await createStaffExperiment({
      name: name.trim(),
      questionnaire_slug: "qualify",
      status: "draft",
    });
    setName("");
    await reload();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">A/B experiments</h1>
        <p className="text-sm text-muted-foreground">
          Compare questionnaire versions by traffic split.
        </p>
      </div>

      <AccountSectionCard
        tone="orders"
        title="Create experiment"
        icon={FlaskConical}
      >
        <div className="flex flex-wrap gap-2">
          <input
            className={inputCls}
            placeholder="Experiment name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button size="sm" onClick={() => void handleCreate()}>
            Create
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Assign variants after creating — link each variant to a questionnaire
          version ID.
        </p>
      </AccountSectionCard>

      <div className="space-y-4">
        {experiments.map((exp) => (
          <AccountSectionCard
            key={exp.id}
            tone="contact"
            title={exp.name}
            description={`${exp.questionnaire_slug || "qualify"} · ${exp.status}`}
          >
            <div className="flex flex-wrap gap-2">
              {exp.status !== "running" ? (
                <Button
                  size="sm"
                  onClick={() =>
                    void patchStaffExperiment(exp.id, {
                      status: "running",
                    }).then(reload)
                  }
                >
                  Start
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void patchStaffExperiment(exp.id, {
                      status: "stopped",
                    }).then(reload)
                  }
                >
                  Stop
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSelectedId(exp.id)}
              >
                View results
              </Button>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {exp.variants.map((v) => (
                <li key={v.id}>
                  {v.variant_key}: {v.version_label} ({v.weight_percent}%)
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <input
                className={inputCls}
                placeholder="variant_key"
                value={variantKey}
                onChange={(e) => setVariantKey(e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="questionnaire_version UUID"
                value={versionId}
                onChange={(e) => setVersionId(e.target.value)}
              />
              <input
                className={inputCls}
                placeholder="weight %"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() =>
                  void createStaffExperimentVariant(exp.id, {
                    variant_key: variantKey,
                    questionnaire_version: versionId,
                    weight_percent: Number(weight) || 50,
                  }).then(reload)
                }
              >
                Add variant
              </Button>
            </div>
          </AccountSectionCard>
        ))}
      </div>

      {selectedId && results.length > 0 ? (
        <AccountSectionCard tone="consent" title="Experiment results">
          <pre className="overflow-x-auto text-xs text-muted-foreground">
            {JSON.stringify(results, null, 2)}
          </pre>
        </AccountSectionCard>
      ) : null}
    </div>
  );
}
