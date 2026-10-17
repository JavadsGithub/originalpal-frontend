import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface CategoryRowData {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  /** Display path built from the tree, e.g. `Home / Kitchen / Knives`. */
  path: string;
  depth: number;
}

export interface CategoriesTableTranslations {
  title: string;
  subtitle: string;
  createButtonText: string;
  nameHeader: string;
  slugHeader: string;
  pathHeader: string;
  actionsHeader: string;
  noCategoriesFound: string;
  editButtonText: string;
  attributesButtonText: string;
  addChildButtonText: string;
  deleteButtonText: string;
  totalLabel: string;
}

export interface CategoriesTableCallbacks {
  onCreate: () => void;
  onEdit: (categoryId: string) => void;
  onAddChild: (categoryId: string) => void;
  onManageAttributes: (categoryId: string) => void;
  onDelete: (categoryId: string) => void;
}

export interface CategoriesTableUIProps {
  categories: CategoryRowData[];
  total: number;
  busyCategoryId?: string | null;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManageAttributes: boolean;
  translations?: Partial<CategoriesTableTranslations>;
  callbacks: CategoriesTableCallbacks;
}

const defaultTranslations: CategoriesTableTranslations = {
  title: "Categories",
  subtitle: "The catalog tree products are filed under; attributes are attached per category.",
  createButtonText: "New category",
  nameHeader: "Category",
  slugHeader: "Slug",
  pathHeader: "Path",
  actionsHeader: "Actions",
  noCategoriesFound: "No categories yet.",
  editButtonText: "Edit",
  attributesButtonText: "Attributes",
  addChildButtonText: "Add child",
  deleteButtonText: "Delete",
  totalLabel: "total",
};

/** Tier 1 pure UI — rows arrive already flattened from the tree by the injector. */
export default function CategoriesTableUI({
  categories,
  total,
  busyCategoryId = null,
  canCreate,
  canUpdate,
  canDelete,
  canManageAttributes,
  translations = {},
  callbacks,
}: CategoriesTableUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const hasActions = canUpdate || canDelete || canManageAttributes;

  return (
    <section className="space-y-4" data-testid="categories-table">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground" data-testid="categories-total">
            {total} {t.totalLabel}
          </span>
          {canCreate && (
            <Button type="button" size="sm" onClick={callbacks.onCreate}>
              {t.createButtonText}
            </Button>
          )}
        </div>
      </header>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.nameHeader}</TableHead>
              <TableHead>{t.slugHeader}</TableHead>
              <TableHead>{t.pathHeader}</TableHead>
              {hasActions && <TableHead className="text-right">{t.actionsHeader}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={hasActions ? 4 : 3}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t.noCategoriesFound}
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => {
                const isBusy = busyCategoryId === category.id;

                return (
                  <TableRow key={category.id} data-testid={`category-row-${category.slug}`}>
                    <TableCell className="font-medium text-foreground">
                      <span style={{ paddingLeft: `${category.depth * 1.25}rem` }}>
                        {category.depth > 0 && (
                          <span className="pr-1 text-muted-foreground" aria-hidden>
                            ↳
                          </span>
                        )}
                        {category.name}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {category.slug}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{category.path}</TableCell>
                    {hasActions && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => callbacks.onEdit(category.id)}
                            >
                              {t.editButtonText}
                            </Button>
                          )}
                          {canManageAttributes && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => callbacks.onManageAttributes(category.id)}
                            >
                              {t.attributesButtonText}
                            </Button>
                          )}
                          {canCreate && (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => callbacks.onAddChild(category.id)}
                            >
                              {t.addChildButtonText}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => callbacks.onDelete(category.id)}
                            >
                              {t.deleteButtonText}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
