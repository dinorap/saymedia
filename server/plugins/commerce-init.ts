import { ensureCommerceSchema } from "../utils/commerce";

export default defineNitroPlugin(async () => {
  await ensureCommerceSchema();
});

