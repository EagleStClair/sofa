import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useCallback } from "react";
import { z } from "zod";

import { DiscoverSection } from "@/components/explore/discover-section";
import { RouteError } from "@/components/route-error";

const discoverSearchSchema = z.object({
  type: z.enum(["movie", "tv"]).optional().catch(undefined),
  genreId: z.number().optional().catch(undefined),
  yearMin: z.number().optional().catch(undefined),
  yearMax: z.number().optional().catch(undefined),
  ratingMin: z.number().optional().catch(undefined),
  sortBy: z.string().optional().catch(undefined),
  language: z.string().optional().catch(undefined),
  platformIds: z.array(z.string()).optional().catch(undefined),
  hideSeen: z.boolean().optional().catch(undefined),
});

export type DiscoverSearch = z.infer<typeof discoverSearchSchema>;

export const Route = createFileRoute("/_app/explore")({
  validateSearch: zodValidator(discoverSearchSchema),
  head: () => ({ meta: [{ title: "Explore — Sofa" }] }),
  errorComponent: RouteError,
  component: ExplorePage,
});

function ExplorePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const updateSearch = useCallback(
    (updates: Partial<DiscoverSearch>) => {
      void navigate({
        search: (prev) => {
          const next = { ...prev, ...updates };
          for (const [key, value] of Object.entries(next)) {
            if (value === undefined || (Array.isArray(value) && value.length === 0)) {
              delete (next as Record<string, unknown>)[key];
            }
          }
          return next;
        },
        replace: true,
      });
    },
    [navigate],
  );

  return (
    <div className="space-y-6">
      <DiscoverSection search={search} onSearchChange={updateSearch} />
    </div>
  );
}