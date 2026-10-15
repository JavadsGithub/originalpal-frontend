import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface BrandRowData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
}

export interface BrandsTableTranslations {
  title: string;
  subtitle: string;
  createButtonText: string;
  nameHeader: string;
  slugHeader: string;
  descriptionHeader: string;
  statusHeader: string;
  actionsHeader: string;
  activeStatus: string;
  inactiveStatus: string;
  noBrandsFound: string;
  editButtonText: string;
  activateButtonText: string;
  deactivateButtonText: string;
  deleteButtonText: string;
  inactiveHint: string;
  totalLabel: string;
  pageLabel: string;
  ofLabel: string;
  previousButtonText: string;
  nextButtonText: string;
}

export interface BrandsTableCallbacks {
  onCreate: () => void;
  onEdit: (brandId: string) => void;
  onToggleActive: (brandId: string, nextIsActive: boolean) => void;
  onDelete: (brandId: string) => void;
  onPageChange: (page: number) => void;
}

export interface BrandsTableUIProps {
  brands: BrandRowData[];
  total: number;
  page: number;
  pages: number;
  busyBrandId?: string | null;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  translations?: Partial<BrandsTableTranslations>;
  callbacks: BrandsTableCallbacks;
}

const defaultTranslations: BrandsTableTranslations = {
  title: "Brands",
  subtitle: "Optional product brands. A deactivated brand can stay on old products but not be attached to new ones.",
  createButtonText: "New brand",
  nameHeader: "Brand",
  slugHeader: "Slug",
  descriptionHeader: "Description",
  statusHeader: "Status",
  actionsHeader: "Actions",
  activeStatus: "Active",
  inactiveStatus: "Inactive",
  noBrandsFound: "No brands yet.",
  editButtonText: "Edit",
  activateButtonText: "Activate",
  deactivateButtonText: "Deactivate",
  deleteButtonText: "Delete",
  inactiveHint: "The backend refuses to attach an inactive brand to a product (422, field brand_id).",
  totalLabel: "total",
  pageLabel: "Page",
  ofLabel: "of",
  previousButtonText: "Previous",
  nextButtonText: "Next",
};

/** Tier 1 pure UI for the brand list. */
export default function BrandsTableUI({
  brands,
  total,
  page,
  pages,
  busyBrandId = null,
  canCreate,
  canUpdate,
  canDelete,
  translations = {},
  callbacks,
}: BrandsTableUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const hasActions = canUpdate || canDelete;

  return (
    <section className="space-y-4" data-testid="brands-table">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground" data-testid="brands-total">
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
              <TableHead>{t.descriptionHeader}</TableHead>
              <TableHead>{t.statusHeader}</TableHead>
              {hasActions && <TableHead className="text-right">{t.actionsHeader}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={hasActions ? 5 : 4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t.noBrandsFound}
                </TableCell>
              </TableRow>
            ) : (
              brands.map((brand) => {
                const isBusy = busyBrandId === brand.id;

                return (
                  <TableRow key={brand.id} data-testid={`brand-row-${brand.slug}`}>
                    <TableCell className="font-medium text-foreground">{brand.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {brand.slug}
                    </TableCell>
                    <TableCell className="max-w-[24rem] truncate text-xs text-muted-foreground">
                      {brand.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={brand.isActive ? "success" : "warning"}
                        title={brand.isActive ? undefined : t.inactiveHint}
                      >
                        {brand.isActive ? t.activeStatus : t.inactiveStatus}
                      </Badge>
                    </TableCell>
                    {hasActions && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                disabled={isBusy}
                                onClick={() => callbacks.onEdit(brand.id)}
                              >
                                {t.editButtonText}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                disabled={isBusy}
                                data-testid={`toggle-brand-active-${brand.slug}`}
                                onClick={() => callbacks.onToggleActive(brand.id, !brand.isActive)}
                              >
                                {brand.isActive ? t.deactivateButtonText : t.activateButtonText}
                              </Button>
                            </>
                          )}
                          {canDelete && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => callbacks.onDelete(brand.id)}
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

      {pages > 1 && (
        <nav
          className="flex items-center justify-end gap-3 text-xs text-muted-foreground"
          aria-label="Pagination"
        >
          <span>
            {t.pageLabel} {page} {t.ofLabel} {pages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={page <= 1}
            onClick={() => callbacks.onPageChange(page - 1)}
          >
            {t.previousButtonText}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={page >= pages}
            onClick={() => callbacks.onPageChange(page + 1)}
          >
            {t.nextButtonText}
          </Button>
        </nav>
      )}
    </section>
  );
}
