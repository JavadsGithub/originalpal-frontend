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

export interface SkuRowData {
  id: string;
  code: string;
  optionValues: Record<string, string>;
  priceLabel: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  imageCount: number;
}

export interface SkuTableTranslations {
  title: string;
  subtitle: string;
  createButtonText: string;
  codeHeader: string;
  optionsHeader: string;
  priceHeader: string;
  stockHeader: string;
  availableHeader: string;
  actionsHeader: string;
  noSkusFound: string;
  noOptionsLabel: string;
  editButtonText: string;
  stockButtonText: string;
  attributesButtonText: string;
  deactivateButtonText: string;
  imagesLabel: string;
  deactivatedNotice: string;
  totalLabel: string;
}

export interface SkuTableCallbacks {
  onCreate: () => void;
  onEdit: (skuId: string) => void;
  onAdjustStock: (skuId: string) => void;
  onManageAttributes: (skuId: string) => void;
  onDeactivate: (skuId: string) => void;
}

export interface SkuTableUIProps {
  skus: SkuRowData[];
  total: number;
  busySkuId?: string | null;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManageAttributes: boolean;
  translations?: Partial<SkuTableTranslations>;
  callbacks: SkuTableCallbacks;
}

const defaultTranslations: SkuTableTranslations = {
  title: "SKUs",
  subtitle:
    "Prices and stock live on the SKU. `DELETE` deactivates a SKU: it leaves this list and stops counting towards publication.",
  createButtonText: "New SKU",
  codeHeader: "Code",
  optionsHeader: "Options",
  priceHeader: "Price",
  stockHeader: "On hand",
  availableHeader: "Available",
  actionsHeader: "Actions",
  noSkusFound: "No active SKUs yet — a product cannot be published without one.",
  noOptionsLabel: "default",
  editButtonText: "Edit",
  stockButtonText: "Stock",
  attributesButtonText: "Attributes",
  deactivateButtonText: "Deactivate",
  imagesLabel: "images",
  deactivatedNotice:
    "Deactivated SKUs are invisible here: the list endpoint returns active SKUs only.",
  totalLabel: "active",
};

/** Tier 1 pure UI for the SKU list of one product. */
export default function SkuTableUI({
  skus,
  total,
  busySkuId = null,
  canCreate,
  canUpdate,
  canDelete,
  canManageAttributes,
  translations = {},
  callbacks,
}: SkuTableUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const hasActions = canUpdate || canDelete || canManageAttributes;

  return (
    <section className="space-y-3" data-testid="sku-table">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{t.title}</h2>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground" data-testid="skus-total">
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
              <TableHead>{t.codeHeader}</TableHead>
              <TableHead>{t.optionsHeader}</TableHead>
              <TableHead>{t.priceHeader}</TableHead>
              <TableHead>{t.stockHeader}</TableHead>
              <TableHead>{t.availableHeader}</TableHead>
              {hasActions && <TableHead className="text-right">{t.actionsHeader}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {skus.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={hasActions ? 6 : 5}
                  className="h-20 text-center text-muted-foreground"
                >
                  {t.noSkusFound}
                </TableCell>
              </TableRow>
            ) : (
              skus.map((sku) => {
                const isBusy = busySkuId === sku.id;
                const optionEntries = Object.entries(sku.optionValues);

                return (
                  <TableRow key={sku.id} data-testid={`sku-row-${sku.code}`}>
                    <TableCell className="font-mono text-xs text-foreground">
                      {sku.code}
                      {sku.imageCount > 0 && (
                        <span className="block text-[0.65rem] text-muted-foreground">
                          {sku.imageCount} {t.imagesLabel}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {optionEntries.length === 0 ? (
                        <span className="text-xs text-muted-foreground">{t.noOptionsLabel}</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {optionEntries.map(([key, value]) => (
                            <Badge key={key} variant="outline">
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-foreground">{sku.priceLabel}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sku.stockQuantity}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span
                        className={
                          sku.availableQuantity > 0 ? "text-foreground" : "text-destructive"
                        }
                      >
                        {sku.availableQuantity}
                      </span>
                      {sku.reservedQuantity > 0 && (
                        <span className="block text-[0.65rem] text-muted-foreground">
                          {sku.reservedQuantity} reserved
                        </span>
                      )}
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
                                onClick={() => callbacks.onEdit(sku.id)}
                              >
                                {t.editButtonText}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                disabled={isBusy}
                                data-testid={`adjust-stock-${sku.code}`}
                                onClick={() => callbacks.onAdjustStock(sku.id)}
                              >
                                {t.stockButtonText}
                              </Button>
                            </>
                          )}
                          {canManageAttributes && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => callbacks.onManageAttributes(sku.id)}
                            >
                              {t.attributesButtonText}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => callbacks.onDeactivate(sku.id)}
                            >
                              {t.deactivateButtonText}
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

      <p className="text-xs text-muted-foreground">{t.deactivatedNotice}</p>
    </section>
  );
}
