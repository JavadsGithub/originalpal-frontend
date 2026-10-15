"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type RoleFormMode = "create" | "edit";

export interface RoleFormValues {
  name: string;
  is_active: boolean;
}

export interface RoleFormDialogTranslations {
  createTitle: string;
  editTitle: string;
  createDescription: string;
  editDescription: string;
  nameLabel: string;
  namePlaceholder: string;
  activeLabel: string;
  activeHint: string;
  submitCreate: string;
  submitEdit: string;
  submitting: string;
  cancel: string;
}

export interface RoleFormDialogCallbacks {
  onSubmit: (values: RoleFormValues) => void;
  onCancel: () => void;
}

export interface RoleFormDialogUIProps {
  mode: RoleFormMode;
  initialValues?: Partial<RoleFormValues>;
  submitting?: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  translations?: Partial<RoleFormDialogTranslations>;
  callbacks: RoleFormDialogCallbacks;
}

const defaultTranslations: RoleFormDialogTranslations = {
  createTitle: "New role",
  editTitle: "Edit role",
  createDescription: "Start with a name; assign permissions afterwards.",
  editDescription: "Renaming an active role affects every user that holds it.",
  nameLabel: "Role name",
  namePlaceholder: "e.g. Catalog manager",
  activeLabel: "Active",
  activeHint: "Inactive roles stay assigned but grant nothing (the backend ignores them).",
  submitCreate: "Create role",
  submitEdit: "Save changes",
  submitting: "Saving...",
  cancel: "Cancel",
};

/** Tier 1 pure UI for creating and editing roles. */
export default function RoleFormDialogUI({
  mode,
  initialValues,
  submitting = false,
  errorMessage = null,
  fieldErrors = {},
  translations = {},
  callbacks,
}: RoleFormDialogUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const isCreate = mode === "create";
  const [name, setName] = useState(initialValues?.name ?? "");
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true);

  return (
    <Dialog
      open
      busy={submitting}
      onClose={callbacks.onCancel}
      title={isCreate ? t.createTitle : t.editTitle}
      description={isCreate ? t.createDescription : t.editDescription}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={callbacks.onCancel}
            disabled={submitting}
          >
            {t.cancel}
          </Button>
          <Button
            type="submit"
            form="role-form"
            size="sm"
            disabled={submitting || name.trim().length === 0}
          >
            {submitting ? t.submitting : isCreate ? t.submitCreate : t.submitEdit}
          </Button>
        </>
      }
    >
      <form
        id="role-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          callbacks.onSubmit({ name: name.trim(), is_active: isActive });
        }}
      >
        <FormError message={errorMessage} />

        <div className="space-y-1.5">
          <Label htmlFor="role-name">{t.nameLabel}</Label>
          <Input
            id="role-name"
            value={name}
            placeholder={t.namePlaceholder}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.name)}
            onChange={(event) => setName(event.target.value)}
          />
          {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
        </div>

        {!isCreate && (
          <div className="space-y-1.5 rounded-md border border-border p-3">
            <Checkbox
              id="role-active"
              label={t.activeLabel}
              checked={isActive}
              disabled={submitting}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <p className="text-xs text-muted-foreground">{t.activeHint}</p>
          </div>
        )}
      </form>
    </Dialog>
  );
}
