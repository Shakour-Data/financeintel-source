'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Target,
  Signal,
  BookText,
  Code2,
  GraduationCap,
  Lightbulb,
  ExternalLink,
  Tag,
  BookMarked,
  Filter,
  ChevronDown,
  ChevronRight,
  Library,
  Calculator,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  REFERENCE_CATEGORIES,
  DIMENSION_META,
  getAllReferences,
  getReferencesForDimension,
  type ReferenceCategory,
  type Reference,
  type DimensionKey,
  DIMENSION_FORMULAS,
  type FormulaDoc,
} from '@/lib/references';

// ═══════════════════════════════════════════════════════════════
// ICON HELPERS
// ═══════════════════════════════════════════════════════════════

function getTypeIcon(type: Reference['type']) {
  switch (type) {
    case 'book':
      return <BookText className="size-4" />;
    case 'project':
      return <Code2 className="size-4" />;
    case 'methodology':
      return <GraduationCap className="size-4" />;
    case 'concept':
      return <Lightbulb className="size-4" />;
  }
}

function getTypeLabel(type: Reference['type']) {
  switch (type) {
    case 'book':
      return 'Book';
    case 'project':
      return 'Project';
    case 'methodology':
      return 'Methodology';
    case 'concept':
      return 'Concept';
  }
}

function getCategoryStyle(cat: ReferenceCategory) {
  switch (cat) {
    case 'technical-analysis':
      return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20';
    case 'trading-strategies':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
    case 'signal-generation':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
  }
}

// ═══════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ═══════════════════════════════════════════════════════════════
// SUMMARY STAT CARDS
// ═══════════════════════════════════════════════════════════════

function SummaryStats() {
  const allRefs = getAllReferences();
  const bookCount = allRefs.filter((r) => r.type === 'book').length;
  const projectCount = allRefs.filter((r) => r.type === 'project').length;
  const methodologyCount = allRefs.filter(
    (r) => r.type === 'methodology'
  ).length;

  const stats = [
    {
      label: 'Total References',
      labelFa: 'کل مراجع',
      value: allRefs.length,
      icon: <Library className="size-5" />,
      color: 'text-foreground',
      bg: 'bg-primary/10',
    },
    {
      label: 'Books',
      labelFa: 'کتاب‌ها',
      value: bookCount,
      icon: <BookText className="size-5" />,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-500/10',
    },
    {
      label: 'Projects',
      labelFa: 'پروژه‌ها',
      value: projectCount,
      icon: <Code2 className="size-5" />,
      color: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      label: 'Methodologies',
      labelFa: 'روش‌شناسی‌ها',
      value: methodologyCount,
      icon: <GraduationCap className="size-5" />,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="py-3">
            <CardContent className="flex items-center gap-3 px-4">
              <div
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-lg',
                  stat.bg
                )}
              >
                <span className={stat.color}>{stat.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-tight">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FILTER SECTION
// ═══════════════════════════════════════════════════════════════

interface FilterState {
  category: ReferenceCategory | 'all';
  dimension: DimensionKey | 'all';
}

function FilterSection({
  filters,
  onFilterChange,
}: {
  filters: FilterState;
  onFilterChange: (f: FilterState) => void;
}) {
  const allRefs = getAllReferences();
  const dimensionKeys = Object.keys(DIMENSION_META) as DimensionKey[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Filter className="size-4 text-muted-foreground" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filters */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Category
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={filters.category === 'all' ? 'default' : 'outline'}
              onClick={() => onFilterChange({ ...filters, category: 'all' })}
              className="h-7 text-xs"
            >
              All
              <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-[10px]">
                {allRefs.length}
              </Badge>
            </Button>
            {(
              Object.entries(REFERENCE_CATEGORIES) as [
                ReferenceCategory,
                (typeof REFERENCE_CATEGORIES)[ReferenceCategory],
              ][]
            ).map(([key, meta]) => {
              const count = allRefs.filter((r) => r.category === key).length;
              return (
                <Button
                  key={key}
                  size="sm"
                  variant={filters.category === key ? 'default' : 'outline'}
                  onClick={() =>
                    onFilterChange({ ...filters, category: key })
                  }
                  className={cn(
                    'h-7 text-xs',
                    filters.category === key && 'border-0'
                  )}
                >
                  {meta.label}
                  <Badge
                    variant="secondary"
                    className="ml-1.5 px-1 py-0 text-[10px]"
                  >
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Dimension Filters */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Dimension
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={filters.dimension === 'all' ? 'default' : 'outline'}
              onClick={() => onFilterChange({ ...filters, dimension: 'all' })}
              className="h-7 text-xs"
            >
              All
            </Button>
            {dimensionKeys.map((dimKey) => {
              const meta = DIMENSION_META[dimKey];
              const count = getReferencesForDimension(dimKey).length;
              const isActive = filters.dimension === dimKey;
              return (
                <Button
                  key={dimKey}
                  size="sm"
                  variant={isActive ? 'default' : 'outline'}
                  onClick={() =>
                    onFilterChange({
                      ...filters,
                      dimension: isActive ? 'all' : dimKey,
                    })
                  }
                  className={cn('h-7 text-xs gap-1', isActive && 'border-0')}
                  style={
                    isActive
                      ? {
                          backgroundColor: meta.color,
                          color: '#fff',
                        }
                      : undefined
                  }
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="hidden sm:inline">{meta.name}</span>
                  <span className="sm:hidden">{meta.name.split(' ')[0]}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'ml-0.5 px-1 py-0 text-[10px]',
                      isActive && 'bg-white/20 text-white hover:bg-white/30'
                    )}
                  >
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// REFERENCE CARD
// ═══════════════════════════════════════════════════════════════

function ReferenceCard({ reference }: { reference: Reference }) {
  const [expanded, setExpanded] = useState(false);
  const meta = REFERENCE_CATEGORIES[reference.category];

  return (
    <motion.div variants={itemVariants}>
      <Card className="group overflow-hidden py-0 transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          {/* Header */}
          <div className="mb-2 flex items-start gap-2">
            <div
              className={cn(
                'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border',
                getCategoryStyle(reference.category)
              )}
            >
              {getTypeIcon(reference.type)}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="line-clamp-2 text-sm font-semibold leading-tight">
                {reference.title}
              </h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {reference.author} · {reference.year}
              </p>
            </div>
          </div>

          {/* Type + Category badges */}
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              {getTypeLabel(reference.type)}
            </Badge>
            <Badge
              variant="outline"
              className={cn('h-5 px-1.5 text-[10px]', getCategoryStyle(reference.category))}
            >
              {meta.label}
            </Badge>
          </div>

          {/* Dimension Tags */}
          <div className="mb-2 flex flex-wrap gap-1">
            {reference.dimensions.map((dimKey) => {
              const dimMeta = DIMENSION_META[dimKey];
              return (
                <span
                  key={dimKey}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: dimMeta.color + '15',
                    color: dimMeta.color,
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: dimMeta.color }}
                  />
                  {dimMeta.name}
                </span>
              );
            })}
          </div>

          {/* Description (expandable) */}
          <div className="space-y-1">
            <p
              className={cn(
                'text-xs leading-relaxed text-muted-foreground',
                !expanded && 'line-clamp-2'
              )}
            >
              {reference.description}
            </p>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p
                    className="text-xs leading-relaxed text-muted-foreground"
                    dir="rtl"
                    style={{ fontFamily: 'Vazirmatn, Tahoma, sans-serif' }}
                  >
                    {reference.descriptionFa}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronDown className="size-3" />
                  Less
                </>
              ) : (
                <>
                  <ChevronRight className="size-3" />
                  More
                </>
              )}
            </Button>
            {reference.url && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-[11px] text-muted-foreground"
                asChild
              >
                <a href={reference.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3" />
                  Link
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REFERENCES TAB
// ═══════════════════════════════════════════════════════════════

function ReferencesTab({ filters }: { filters: FilterState }) {
  let refs = getAllReferences();

  if (filters.category !== 'all') {
    refs = refs.filter((r) => r.category === filters.category);
  }
  if (filters.dimension !== 'all') {
    const dimKey = filters.dimension as DimensionKey;
    refs = refs.filter((r) => r.dimensions.includes(dimKey));
  }

  return (
    <motion.div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      key={`${filters.category}-${filters.dimension}`}
    >
      <AnimatePresence mode="popLayout">
        {refs.map((ref) => (
          <ReferenceCard key={ref.id} reference={ref} />
        ))}
      </AnimatePresence>
      {refs.length === 0 && (
        <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
          No references match the current filters.
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// METHODOLOGY TAB
// ═══════════════════════════════════════════════════════════════

function FormulaBlock({
  formula,
  dimColor,
}: {
  formula: FormulaDoc['formulas'][number];
  dimColor: string;
}) {
  const [showFa, setShowFa] = useState(false);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <h5 className="text-sm font-medium">{formula.name}</h5>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[10px] text-muted-foreground"
          onClick={() => setShowFa(!showFa)}
        >
          {showFa ? 'EN' : 'FA'}
        </Button>
      </div>

      {/* Formula Display */}
      <div className="overflow-x-auto rounded-md bg-muted/50 px-3 py-2">
        <code className="whitespace-nowrap text-xs font-mono text-foreground">
          {formula.formula}
        </code>
      </div>

      {/* Description */}
      <AnimatePresence mode="wait">
        {!showFa ? (
          <motion.p
            key="en"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs leading-relaxed text-muted-foreground"
          >
            {formula.description}
          </motion.p>
        ) : (
          <motion.p
            key="fa"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            dir="rtl"
            className="text-xs leading-relaxed text-muted-foreground"
            style={{ fontFamily: 'Vazirmatn, Tahoma, sans-serif' }}
          >
            {formula.descriptionFa}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Source */}
      <div className="flex items-center gap-1.5">
        <BookMarked className="size-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">
          {formula.source}
        </span>
      </div>
    </div>
  );
}

function MethodologyTab({ filters }: { filters: FilterState }) {
  const formulas = DIMENSION_FORMULAS.filter((f) => {
    if (filters.dimension !== 'all') {
      return f.dimensionKey === filters.dimension;
    }
    return true;
  });

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      key={filters.dimension}
    >
      {formulas.map((dimFormulas) => (
        <motion.div key={dimFormulas.dimensionKey} variants={itemVariants}>
          <Card className="overflow-hidden py-0">
            {/* Dimension Header */}
            <div
              className="border-b px-4 py-3"
              style={{
                backgroundColor: dimFormulas.color + '08',
                borderColor: dimFormulas.color + '20',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: dimFormulas.color }}
                />
                <h3 className="text-sm font-semibold">
                  {dimFormulas.dimensionName}
                </h3>
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-[10px]"
                  style={{
                    borderColor: dimFormulas.color + '40',
                    color: dimFormulas.color,
                  }}
                >
                  {dimFormulas.formulas.length} formula
                  {dimFormulas.formulas.length > 1 ? 's' : ''}
                </Badge>
              </div>
              <p
                className="mt-0.5 text-xs text-muted-foreground"
                dir="rtl"
                style={{ fontFamily: 'Vazirmatn, Tahoma, sans-serif' }}
              >
                {dimFormulas.dimensionNameFa}
              </p>
            </div>

            {/* Formulas */}
            <div className="space-y-3 p-4">
              {dimFormulas.formulas.map((formula) => (
                <FormulaBlock
                  key={formula.name}
                  formula={formula}
                  dimColor={dimFormulas.color}
                />
              ))}
            </div>
          </Card>
        </motion.div>
      ))}

      {formulas.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No methodology data matches the current filters.
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CROSS-REFERENCE MATRIX
// ═══════════════════════════════════════════════════════════════

function CrossReferenceMatrix({
  filters,
  onFilterChange,
}: {
  filters: FilterState;
  onFilterChange: (f: FilterState) => void;
}) {
  const dimensionKeys = Object.keys(DIMENSION_META) as DimensionKey[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="size-4 text-muted-foreground" />
          Dimension × Reference Cross-Reference
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {dimensionKeys.map((dimKey) => {
            const meta = DIMENSION_META[dimKey];
            const refs = getReferencesForDimension(dimKey);
            const isActive = filters.dimension === dimKey;

            // Get top 3 authors
            const authorCounts: Record<string, number> = {};
            for (const r of refs) {
              const author = r.author.split('&')[0].trim();
              authorCounts[author] = (authorCounts[author] || 0) + 1;
            }
            const topAuthors = Object.entries(authorCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([name]) => name);

            return (
              <motion.button
                key={dimKey}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  onFilterChange({
                    ...filters,
                    dimension: isActive ? 'all' : dimKey,
                  })
                }
                className={cn(
                  'group rounded-lg border p-3 text-left transition-colors',
                  isActive
                    ? 'border-foreground/20 bg-foreground/5'
                    : 'border-border bg-card hover:bg-muted/50'
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="text-xs font-semibold leading-tight">
                    {meta.name}
                  </span>
                </div>
                <p className="text-lg font-bold" style={{ color: meta.color }}>
                  {refs.length}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {refs.length === 1 ? 'reference' : 'references'}
                </p>
                {topAuthors.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {topAuthors.map((author) => (
                      <p
                        key={author}
                        className="truncate text-[10px] text-muted-foreground"
                      >
                        {author}
                      </p>
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function ReferencesPanel() {
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    dimension: 'all',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <Library className="size-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Academic References & Methodology</h2>
          <p className="text-sm text-muted-foreground">
            Comprehensive reference library for the 12-dimension crypto scoring system
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <SummaryStats />

      {/* Filters */}
      <FilterSection filters={filters} onFilterChange={setFilters} />

      {/* Main Tabs */}
      <Tabs defaultValue="references" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="references" className="gap-1.5">
            <BookMarked className="size-3.5" />
            References
          </TabsTrigger>
          <TabsTrigger value="methodology" className="gap-1.5">
            <Calculator className="size-3.5" />
            Methodology
          </TabsTrigger>
        </TabsList>

        <TabsContent value="references" className="mt-4">
          <ReferencesTab filters={filters} />
        </TabsContent>

        <TabsContent value="methodology" className="mt-4">
          <MethodologyTab filters={filters} />
        </TabsContent>
      </Tabs>

      {/* Cross-Reference Matrix */}
      <CrossReferenceMatrix filters={filters} onFilterChange={setFilters} />
    </div>
  );
}
