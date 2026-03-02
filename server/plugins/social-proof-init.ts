import { ensureSocialProofSchema } from '../utils/socialProof'

export default defineNitroPlugin(async () => {
  try {
    await ensureSocialProofSchema()
  } catch (e) {
    console.error('[social-proof] Failed to ensure schema', e)
  }
})

