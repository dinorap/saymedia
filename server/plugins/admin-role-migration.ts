import { ensureAdminSupportRoleMigration } from "../utils/adminRoleMigration";
import { ensureAdminHierarchySchema } from "../utils/adminHierarchy";

export default defineNitroPlugin(async () => {
  await ensureAdminSupportRoleMigration();
  await ensureAdminHierarchySchema();
});
