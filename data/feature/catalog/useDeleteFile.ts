import { customFetcher } from "@/lib/fetcher";
import type { UploadedFile } from "@/lib/types/catalog";
import { invalidateFileCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

/**
 * `DELETE /api/files/{fileId}` — requires `uploads:delete`.
 *
 * Only removes the stored file. Products/SKUs that still reference its id in `gallery` keep the
 * reference, so the media screen warns that a product image may stop resolving.
 */
export function useDeleteFile(callbacks?: CatalogMutationCallbacks<UploadedFile>) {
  return useResourceMutation<UploadedFile, string>({
    mutationFn: (fileId) =>
      customFetcher<UploadedFile>({ url: `/files/${fileId}`, method: "DELETE" }),
    invalidate: (queryClient) => invalidateFileCaches(queryClient),
    callbacks,
  });
}

export default useDeleteFile;
