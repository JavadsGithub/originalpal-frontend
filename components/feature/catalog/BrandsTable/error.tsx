export interface BrandsTableErrorProps {
  message: string;
  onRetry?: () => void;
}

export default function BrandsTableError({ message, onRetry }: BrandsTableErrorProps) {
  return (
    <div
      data-testid="brands-table-error"
      className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
    >
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-current/40 px-2.5 py-1 text-xs font-semibold hover:opacity-80"
        >
          Retry
        </button>
      )}
    </div>
  );
}
