import { ensureSocialProofSchema, startSocialProofFakeLoop } from '../utils/socialProof'

export default defineNitroPlugin(async () => {
  try {
    await ensureSocialProofSchema()
    startSocialProofFakeLoop()
  } catch (e) {
    console.error('[social-proof] Failed to init', e)
  }
})

