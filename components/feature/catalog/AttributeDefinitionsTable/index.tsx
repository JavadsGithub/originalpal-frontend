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

export interface AttributeDefinitionRowData {
  id: string;
  name: string;
  slug: string;
  valueTypeLabel: string;
  unit: string | null;
  choices: string[];
  isSpecification: boolean;
  isFilterable: boolean;
  isVariant: boolean;
  group: string | null;
  displayOrder: number;
}

export interface AttributeDefinitionsTableTranslations {
  title: string;
  subtitle: string;
  createButtonText: string;
  nameHeader: string;
  typeHeader: string;
  choicesHeader: string;
  purposeHeader: string;
  groupHeader: string;
  actionsHeader: string;
  specificationBadge: string;
  filterableBadge: string;
  variantBadge: string;
  noDefinitionsFound: string;
  editButtonText: string;
  deleteButtonText: string;
  moreChoicesLabel: string;
  noChoicesLabel: string;
  totalLabel: string;
  pageLabel: string;
  ofLabel: string;
  previousButtonText: string;
  nextButtonText: string;
}

export interface AttributeDefinitionsTableCallbacks {
  onCreate: () => void;
  onEdit: (definitionId: string) => void;
  onDelete: (definitionId: string) => void;
  onPageChange: (page: number) => void;
}

export interface AttributeDefinitionsTableUIProps {
  definitions: AttributeDefinitionRowData[];
  total: number;
  page: number;
  pages: number;
  busyDefinitionId?: string | null;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  translations?: Partial<AttributeDefinitionsTableTranslations>;
  callbacks: AttributeDefinitionsTableCallbacks;
}

const MAX_VISIBLE_CHOICES = 3;

const defaultTranslations: AttributeDefinitionsTableTranslations = {
  title: "Attributes",
  subtitle: "Shared attribute definitions. Categories decide which of them products must fill in.",
  createButtonText: "New attribute",
  nameHeader: "Attribute",
  typeHeader: "Type",
  choicesHeader: "Choices",
  purposeHeader: "Purpose",
  groupHeader: "Group",
  actionsHeader: "Actions",
  specificationBadge: "specification",
  filterableBadge: "filterable",
  variantBadge: "variant",
  noDefinitionsFound: "No attributes yet.",
  editButtonText: "Edit",
  deleteButtonText: "Delete",
  moreChoicesLabel: "more",
  noChoicesLabel: "—",
  totalLabel: "total",
  pageLabel: "Page",
  ofLabel: "of",
  previousButtonText: "Previous",
  nextButtonText: "Next",
};

/** Tier 1 pure UI for the attribute definition catalog. */
export default function AttributeDefinitionsTableUI({
  definitions,
  total,
  page,
  pages,
  busyDefinitionId = null,
  canCreate,
  canUpdate,
  canDelete,
  translations = {},
  callbacks,
}: AttributeDefinitionsTableUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const hasActions = canUpdate || canDelete;

  return (
    <section className="space-y-4" data-testid="attribute-definitions-table">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground" data-testid="attribute-definitions-total">
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
              <TableHead>{t.typeHeader}</TableHead>
              <TableHead>{t.choicesHeader}</TableHead>
              <TableHead>{t.purposeHeader}</TableHead>
              <TableHead>{t.groupHeader}</TableHead>
              {hasActions && <TableHead className="text-right">{t.actionsHeader}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {definitions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={hasActions ? 6 : 5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t.noDefinitionsFound}
                </TableCell>
              </TableRow>
            ) : (
              definitions.map((definition) => {
                const isBusy = busyDefinitionId === definition.id;
                const hidden = definition.choices.length - MAX_VISIBLE_CHOICES;

                return (
                  <TableRow key={definition.id} data-testid={`attribute-row-${definition.slug}`}>
                    <TableCell className="font-medium text-foreground">
                      <span className="block">{definition.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {definition.slug}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {definition.valueTypeLabel}
                      {definition.unit ? ` · ${definition.unit}` : ""}
                    </TableCell>
                    <TableCell>
                      {definition.choices.length === 0 ? (
                        <span className="text-xs text-muted-foreground">{t.noChoicesLabel}</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {definition.choices.slice(0, MAX_VISIBLE_CHOICES).map((choice) => (
                            <Badge key={choice} variant="outline">
                              {choice}
                            </Badge>
                          ))}
                          {hidden > 0 && (
                            <Badge variant="default">
                              +{hidden} {t.moreChoicesLabel}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {definition.isSpecification && (
                          <Badge variant="outline">{t.specificationBadge}</Badge>
                        )}
                        {definition.isFilterable && (
                          <Badge variant="default">{t.filterableBadge}</Badge>
                        )}
                        {definition.isVariant && (
                          <Badge variant="success">{t.variantBadge}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {definition.group ?? "—"}
                    </TableCell>
                    {hasActions && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => callbacks.onEdit(definition.id)}
                            >
                              {t.editButtonText}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => callbacks.onDelete(definition.id)}
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
