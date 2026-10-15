/** Sibling loading state of the roles screen (framework convention: one per feature component). */
export default function RolesTableLoading() {
  return (
    <div
      data-testid="roles-table-loading"
      className="flex h-48 items-center justify-center text-sm text-muted-foreground"
    >
      Loading roles...
    </div>
  );
}
