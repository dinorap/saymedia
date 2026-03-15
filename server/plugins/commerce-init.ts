import { ensureCommerceSchema } from "../utils/commerce";
import { ensureAdminWalletSchema } from "../utils/adminWallet";

export default defineNitroPlugin(async () => {
  await ensureCommerceSchema();
  await ensureAdminWalletSchema();
});

