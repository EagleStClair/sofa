import { createFileRoute } from "@tanstack/react-router";

import { DiscoverSection } from "@/components/explore/discover-section";
import { RouteError } from "@/components/route-error";

export const Route = createFileRoute("/_app/explore")({
  head: () => ({ meta: [{ title: "Explore — Sofa" }] }),
  errorComponent: RouteError,
  component: ExplorePage,
});

function ExplorePage() {
  return (
    <div className="space-y-6">
      <DiscoverSection />
    </div>
  );
}