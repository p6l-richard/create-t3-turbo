import { z } from "zod"

import { AccessToken, Session } from "./features/auth"

const ChromeStorageSchema = z.object({
  accessToken: AccessToken.optional(),
  session: Session.optional()
})

export const ChromeStorage = ChromeStorageSchema.shape
