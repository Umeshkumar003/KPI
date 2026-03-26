/** Default tenant used for seeded demo data; new orgs get their own id from auth/API. */
export const DEFAULT_TENANT_ID = "tenant-demo-default"

/** Second tenant with no seed rows — demonstrates isolation in the UI. */
export const EMPTY_DEMO_TENANT_ID = "tenant-empty-demo"

export type TenantOption = {
  id: string
  name: string
}

export const TENANT_OPTIONS: TenantOption[] = [
  { id: DEFAULT_TENANT_ID, name: "Demo Freight Co." },
  { id: EMPTY_DEMO_TENANT_ID, name: "Empty org (demo)" },
]

export function assignTenant<T extends { tenantId: string }>(
  rows: Array<Omit<T, "tenantId">>,
  tenantId: string,
): T[] {
  return rows.map((r) => ({ ...r, tenantId } as T))
}
