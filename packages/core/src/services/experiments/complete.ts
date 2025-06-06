import { Experiment } from '../../browser'
import { database, Database } from '../../client'
import { LatitudeError } from '../../lib/errors'
import { Result } from '../../lib/Result'
import Transaction, { PromisedResult } from '../../lib/Transaction'
import { experiments } from '../../schema'
import { eq } from 'drizzle-orm'

export async function completeExperiment(
  experiment: Experiment,
  db: Database = database,
): PromisedResult<Experiment, LatitudeError> {
  const updateResult = await Transaction.call(async (tx) => {
    const result = await tx
      .update(experiments)
      .set({
        finishedAt: new Date(),
      })
      .where(eq(experiments.id, experiment.id))
      .returning()

    if (!result.length) {
      return Result.error(new LatitudeError('Failed to update experiment'))
    }

    return Result.ok(result[0]! as Experiment)
  }, db)

  if (updateResult.error) {
    return Result.error(updateResult.error as LatitudeError)
  }

  return updateResult
}
