'use server'

import { MAX_SIZE, MAX_UPLOAD_SIZE_IN_MB } from '@latitude-data/core/browser'
import { convertFile } from '@latitude-data/core/services/files/convert'
import { z } from 'zod'

import { authProcedure } from '../procedures'

export const convertFileAction = authProcedure
  .createServerAction()
  .input(
    z.object({
      file: z.instanceof(File).refine(async (file) => {
        return file?.size <= MAX_UPLOAD_SIZE_IN_MB
      }, `Your file must be less than ${MAX_SIZE}MB in size. You can split it into smaller files and upload them separately.`),
    }),
  )
  .handler(async ({ input }) => {
    const result = await convertFile(input.file)

    return result.unwrap()
  })
