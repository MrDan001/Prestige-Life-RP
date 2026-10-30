/**
 * The primary owner's account is a private system identity, not a staff record.
 * Keep this immutable database ID server-side; do not expose it through client
 * bundles. It is intentionally independent of the editable role/title fields.
 */
export const PRIMARY_OWNER_ADMIN_ID = "cmvmy49140000m8vwxgz92lxx";

export function isPrimaryOwnerAccount(adminId: string) {
  return adminId === PRIMARY_OWNER_ADMIN_ID;
}
