import { useCallback, useRef, useState } from 'react';

import { getProductRequirementsByIds, ProductRequirements } from '@/shared/service/vs/api/product';

export type ProductRequirementsMap = Map<number, ProductRequirements>;

export function useProductRequirements() {
  const fetchedIds = useRef<Set<number>>(new Set());
  const [requirementsMap, setRequirementsMap] = useState<ProductRequirementsMap>(new Map());

  const fetchRequirements = useCallback(async (productIds: number[]) => {
    const newIds = productIds.filter((id) => !fetchedIds.current.has(id));
    if (!newIds.length) return;

    newIds.forEach((id) => fetchedIds.current.add(id));

    try {
      const requirements = await getProductRequirementsByIds(newIds);
      setRequirementsMap((prev) => {
        const next = new Map(prev);
        requirements.forEach((req) => next.set(req.productId, req));
        return next;
      });
    } catch {
      // Remove from fetched set so they can be retried
      newIds.forEach((id) => fetchedIds.current.delete(id));
    }
  }, []);

  return { requirementsMap, fetchRequirements };
}
