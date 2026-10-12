import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { HealthRecordsStrip } from "@/components/portal/HealthRecordsStrip";
import { usePortalUser } from "@/components/portal/PortalUserContext";
import { QuickActions } from "@/components/portal/QuickActions";
import { RequiredActionBanner } from "@/components/portal/RequiredActionBanner";
import { TreatmentCard } from "@/components/portal/TreatmentCard";
import { UpcomingDates } from "@/components/portal/UpcomingDates";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { displayFirstName } from "@/lib/api/portal/auth";
import {
  destinationFor,
  fetchHome,
  greetingFor,
  HOME_QUERY_KEY,
  PORTAL_PATHS,
  type QuickActionKind,
} from "@/lib/api/portal/home";

export const Route = createFileRoute("/portal/")({
  component: PortalHome,
});

function HomeSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading your home">
      <Skeleton className="h-9 w-64 rounded-xl" />
      <div className="flex gap-3">
        <Skeleton className="h-12 w-44 rounded-full" />
        <Skeleton className="h-12 w-44 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>
      <Skeleton className="h-44 rounded-3xl" />
    </div>
  );
}

function PortalHome() {
  const user = usePortalUser();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: HOME_QUERY_KEY,
    queryFn: fetchHome,
    staleTime: 30_000,
    retry: 1,
  });
  const greeting = useMemo(
    () => greetingFor(new Date(), displayFirstName(user)),
    [user],
  );
  const go = (to: string) => void navigate({ to: to as "/" });
  const goKind = (kind: QuickActionKind) => go(destinationFor(kind));

  if (isLoading) return <HomeSkeleton />;

  if (isError || !data) {
    return (
      <div
        role="alert"
        className="mx-auto mt-10 max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-soft"
      >
        <h2 className="font-display text-xl font-semibold">
          We could not load your home
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Please try again.
        </p>
        <Button
          className="mt-6"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className="size-4" aria-hidden="true" />{" "}
          {isFetching ? "Retrying..." : "Try again"}
        </Button>
      </div>
    );
  }

  const visibleTreatments = data.treatments.filter((t) => t.tab !== "past");
  return (
    <div className="space-y-10">
      <p className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {greeting}
      </p>

      <RequiredActionBanner
        items={data.action_items}
        onAction={(item) => goKind(item.kind)}
      />

      <QuickActions
        actions={data.quick_actions}
        onAction={(a) => goKind(a.kind)}
      />

      <UpcomingDates
        upcoming={data.upcoming}
        timeZone={user.timezone || undefined}
      />

      <section aria-labelledby="treatments-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="treatments-heading"
            className="font-display text-lg font-semibold"
          >
            My treatments
          </h2>
          {visibleTreatments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => go(PORTAL_PATHS.treatments)}
            >
              View all
            </Button>
          )}
        </div>
        {visibleTreatments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
            <p className="font-display text-lg font-semibold">
              No treatments yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Once you start a program, it will show up here with its status and
              next steps.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {visibleTreatments.map((t, i) => (
              <TreatmentCard
                key={t.id}
                treatment={t}
                items={data.action_items}
                index={i}
                onOpen={() => go(`${PORTAL_PATHS.treatments}`)}
              />
            ))}
          </ul>
        )}
      </section>

      <HealthRecordsStrip
        records={data.health_records}
        onOpen={() => go(PORTAL_PATHS.shots)}
      />
    </div>
  );
}
