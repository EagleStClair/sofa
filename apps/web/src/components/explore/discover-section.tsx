import { useLingui } from "@lingui/react/macro";
import { IconLoader, IconSearch } from "@tabler/icons-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { FeedSection } from "@/components/dashboard/feed-section";
import { TitleGrid } from "@/components/dashboard/title-grid";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { orpc } from "@/lib/orpc/client";
import type { DiscoverSearch } from "@/routes/_app/explore";

const DECADE_PRESETS = [
  { label: "2020s", min: 2020, max: 2029 },
  { label: "2010s", min: 2010, max: 2019 },
  { label: "2000s", min: 2000, max: 2009 },
  { label: "1990s", min: 1990, max: 1999 },
  { label: "1980s", min: 1980, max: 1989 },
  { label: "1970s", min: 1970, max: 1979 },
  { label: "Pre-1970", min: 1900, max: 1969 },
] as const;

const RATING_PRESETS = [
  { label: "7+", value: 7 },
  { label: "6+", value: 6 },
  { label: "5+", value: 5 },
] as const;

const SORT_OPTIONS = [
  { value: "popularity.desc", labelKey: "Most popular" },
  { value: "vote_average.desc", labelKey: "Highest rated" },
  { value: "primary_release_date.desc", labelKey: "Newest" },
  { value: "primary_release_date.asc", labelKey: "Oldest" },
] as const;

const LANGUAGE_OPTIONS = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "hi", name: "Hindi" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
] as const;

type DiscoverSortBy =
  | "popularity.desc"
  | "vote_average.desc"
  | "primary_release_date.desc"
  | "primary_release_date.asc";

interface DiscoverSectionProps {
  search: DiscoverSearch;
  onSearchChange: (updates: Partial<DiscoverSearch>) => void;
}

export function DiscoverSection({ search, onSearchChange }: DiscoverSectionProps) {
  const { t } = useLingui();

  const type = search.type ?? "movie";
  const genreId = search.genreId;
  const yearMin = search.yearMin;
  const yearMax = search.yearMax;
  const ratingMin = search.ratingMin;
  const sortBy = search.sortBy as DiscoverSortBy | undefined;
  const language = search.language;
  const platformIds = search.platformIds ?? [];
  const hideSeen = search.hideSeen ?? true;
  const [usingMyServices, setUsingMyServices] = useState(false);

  const { data: genreData } = useQuery(orpc.discover.genres.queryOptions({ input: { type } }));
  const { data: providerData } = useQuery(orpc.discover.platforms.queryOptions());
  const { data: myPlatforms } = useQuery(orpc.account.platforms.queryOptions());

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useInfiniteQuery(
    orpc.discover.browse.infiniteOptions({
      input: (pageParam: number) => ({
        type,
        genreId,
        yearMin,
        yearMax,
        ratingMin,
        sortBy,
        language,
        platformIds,
        page: pageParam,
      }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      maxPages: 10,
    }),
  );

  const sentinelRef = useInfiniteScroll({
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  });

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data?.pages]);

  const userStatuses = useMemo(
    () => Object.assign({}, ...(data?.pages.map((p) => p.userStatuses) ?? [])),
    [data?.pages],
  );
  const visibleItems = useMemo(
    () => (hideSeen ? items.filter((item) => userStatuses[item.id] !== "completed") : items),
    [items, userStatuses, hideSeen],
  );

  const genres = genreData?.genres ?? [];
  const providers = providerData?.platforms ?? [];

  const sortLabels: Record<string, string> = {
    "popularity.desc": t`Most popular`,
    "vote_average.desc": t`Highest rated`,
    "primary_release_date.desc": t`Newest`,
    "primary_release_date.asc": t`Oldest`,
  };

  const languageNames: Record<string, string> = {
    en: t`English`,
    es: t`Spanish`,
    fr: t`French`,
    de: t`German`,
    ja: t`Japanese`,
    ko: t`Korean`,
    zh: t`Chinese`,
    hi: t`Hindi`,
    it: t`Italian`,
    pt: t`Portuguese`,
  };

  function handleDecadeChange(value: string | null) {
    if (!value) {
      onSearchChange({ yearMin: undefined, yearMax: undefined });
      return;
    }
    const preset = DECADE_PRESETS.find((d) => String(d.min) === value);
    if (preset) {
      onSearchChange({ yearMin: preset.min, yearMax: preset.max });
    }
  }

  function handleRatingChange(value: string | null) {
    onSearchChange({ ratingMin: value ? Number(value) : undefined });
  }

  function handleSortChange(value: string | null) {
    onSearchChange({ sortBy: (value || undefined) as DiscoverSortBy | undefined });
  }

  function handleLanguageChange(value: string | null) {
    onSearchChange({ language: value || undefined });
  }

  function handleGenreChange(value: string | null) {
    onSearchChange({ genreId: value ? Number(value) : undefined });
  }

  return (
    <FeedSection title={t`Discover`} icon={<IconSearch className="text-primary size-5" />}>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          value={[type]}
          onValueChange={(values) => {
            const next = values.find((v) => v !== type);
            if (next === "movie" || next === "tv") {
              onSearchChange({ type: next, genreId: undefined, platformIds: undefined });
            }
          }}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="movie">{t`Movie`}</ToggleGroupItem>
          <ToggleGroupItem value="tv">{t`TV`}</ToggleGroupItem>
        </ToggleGroup>

        <div className="bg-border/30 mx-0.5 hidden h-5 w-px sm:block" />

        <Select
          value={genreId != null ? String(genreId) : ""}
          onValueChange={handleGenreChange}
          modal={false}
          aria-label={t`Genre`}
        >
          <SelectTrigger
            size="sm"
            data-active={genreId != null ? "" : undefined}
            className="data-[active]:border-primary/40 data-[active]:text-foreground"
          >
            <SelectValue>
              {(value: string | null) => {
                if (!value) return t`Genre`;
                const genre = genres.find((g) => String(g.id) === value);
                return genre?.name ?? t`Genre`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="p-1">
            <SelectItem value="">{t`All genres`}</SelectItem>
            {genres.map((genre) => (
              <SelectItem key={genre.id} value={String(genre.id)}>
                {genre.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={yearMin != null ? String(yearMin) : ""}
          onValueChange={handleDecadeChange}
          modal={false}
          aria-label={t`Decade`}
        >
          <SelectTrigger
            size="sm"
            data-active={yearMin != null ? "" : undefined}
            className="data-[active]:border-primary/40 data-[active]:text-foreground"
          >
            <SelectValue>
              {(value: string | null) => {
                if (!value) return t`Year`;
                const preset = DECADE_PRESETS.find((d) => String(d.min) === value);
                if (preset?.min === 1900) return t`Pre-1970`;
                return preset?.label ?? t`Year`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="p-1">
            <SelectItem value="">{t`Any year`}</SelectItem>
            {DECADE_PRESETS.map((d) => (
              <SelectItem key={d.min} value={String(d.min)}>
                {d.min === 1900 ? t`Pre-1970` : d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={ratingMin != null ? String(ratingMin) : ""}
          onValueChange={handleRatingChange}
          modal={false}
          aria-label={t`Rating`}
        >
          <SelectTrigger
            size="sm"
            data-active={ratingMin != null ? "" : undefined}
            className="data-[active]:border-primary/40 data-[active]:text-foreground"
          >
            <SelectValue>
              {(value: string | null) => {
                if (!value) return t`Rating`;
                return `${value}+`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="p-1">
            <SelectItem value="">{t`Any rating`}</SelectItem>
            {RATING_PRESETS.map((r) => (
              <SelectItem key={r.value} value={String(r.value)}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sortBy ?? ""}
          onValueChange={handleSortChange}
          modal={false}
          aria-label={t`Sort`}
        >
          <SelectTrigger
            size="sm"
            data-active={sortBy ? "" : undefined}
            className="data-[active]:border-primary/40 data-[active]:text-foreground"
          >
            <SelectValue>
              {(value: string | null) => {
                if (!value) return t`Sort`;
                return sortLabels[value] ?? t`Sort`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="p-1">
            <SelectItem value="">{t`Default`}</SelectItem>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {sortLabels[s.value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={language ?? ""}
          onValueChange={handleLanguageChange}
          modal={false}
          aria-label={t`Language`}
        >
          <SelectTrigger
            size="sm"
            data-active={language ? "" : undefined}
            className="data-[active]:border-primary/40 data-[active]:text-foreground"
          >
            <SelectValue>
              {(value: string | null) => {
                if (!value) return t`Language`;
                return languageNames[value] ?? t`Language`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="p-1">
            <SelectItem value="">{t`Any language`}</SelectItem>
            {LANGUAGE_OPTIONS.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {languageNames[lang.code]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                data-active={platformIds.length > 0 ? "" : undefined}
                className="data-[active]:border-primary/40 data-[active]:text-foreground"
              />
            }
          >
            {platformIds.length > 0 ? t`Providers (${platformIds.length})` : t`Providers`}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {providers
              .filter((p) => p.tmdbProviderIds.length > 0)
              .map((p) => (
                <DropdownMenuCheckboxItem
                  key={p.id}
                  checked={platformIds.includes(p.id)}
                  closeOnClick={false}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...platformIds, p.id]
                      : platformIds.filter((id) => id !== p.id);
                    onSearchChange({ platformIds: next.length ? next : undefined });
                    setUsingMyServices(false);
                  }}
                >
                  {p.name}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={usingMyServices ? "default" : "outline"}
          size="sm"
          onClick={() => {
            const mine = myPlatforms?.platformIds ?? [];
            onSearchChange({ platformIds: mine.length ? mine : undefined });
            setUsingMyServices(true);
          }}
        >
          {t`My services`}
        </Button>

        <Button
          variant={hideSeen ? "default" : "outline"}
          size="sm"
          onClick={() => onSearchChange({ hideSeen: hideSeen ? false : undefined })}
        >
          {t`Hide seen`}
        </Button>
      </div>

      {isPending ? (
        <div className="flex items-center justify-center py-12">
          <IconLoader className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {t`No titles found. Try adjusting your filters.`}
        </p>
      ) : (
        <>
          <TitleGrid items={visibleItems} />
          <div ref={sentinelRef} />
          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-4">
              <IconLoader className="text-muted-foreground size-5 animate-spin" />
            </div>
          )}
        </>
      )}
    </FeedSection>
  );
}