import { customFetcher } from "@/lib/fetcher";
import type { UploadedFile } from "@/lib/types/catalog";
import { invalidateFileCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

export interface UploadFileVariables {
  file: File;
  /** Called with the upload progress between 0 and 1 when the browser reports it. */
  onProgress?: (fraction: number) => void;
}

/**
 * `POST /api/upload` — requires `uploads:create`. Answers **201** (the only 201 in the API) with the
 * stored file's id/key.
 *
 * The body is `multipart/form-data`; the `Content-Type` header is deliberately left unset so axios
 * adds the boundary itself. Backend limits (live-verified): non-empty, `UPLOAD_MAX_SIZE_BYTES`
 * (10 MB by default) — over that is `422 VALIDATION_ERROR` with field `file`.
 */
export function useUploadFile(callbacks?: CatalogMutationCallbacks<UploadedFile>) {
  return useResourceMutation<UploadedFile, UploadFileVariables>({
    mutationFn: ({ file, onProgress }) => {
      const formData = new FormData();
      formData.append("file", file);

      return customFetcher<UploadedFile>({
        url: "/upload",
        method: "POST",
        data: formData,
        onUploadProgress: onProgress
          ? (event) => {
              const total = event.total ?? 0;
              if (total > 0) onProgress(Math.min(1, (event.loaded ?? 0) / total));
            }
          : undefined,
      });
    },
    invalidate: (queryClient) => invalidateFileCaches(queryClient),
    callbacks,
  });
}

export default useUploadFile;
