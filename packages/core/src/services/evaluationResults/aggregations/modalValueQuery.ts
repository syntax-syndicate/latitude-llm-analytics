import { and, eq, sql, sum } from 'drizzle-orm'

import { getCommitFilter } from '../_createEvaluationResultQuery'
import { Commit, Evaluation } from '../../../browser'
import { database } from '../../../client'
import { EvaluationResultsRepository } from '../../../repositories'
import { commits, documentLogs } from '../../../schema'

export async function getEvaluationModalValueQuery(
  {
    workspaceId,
    evaluation,
    documentUuid,
    commit,
  }: {
    workspaceId: number
    evaluation: Evaluation
    documentUuid: string
    commit: Commit
  },
  db = database,
) {
  const repo = new EvaluationResultsRepository(workspaceId, db)
  const evaluationResultsScope = repo.scope.as('evaluation_results_scope')
  const totalQuery = await db
    .select({
      totalCount: sum(evaluationResultsScope.id)
        .mapWith(Number)
        .as('ev_results_from_commit_total'),
    })
    .from(evaluationResultsScope)
    .innerJoin(
      documentLogs,
      eq(documentLogs.id, evaluationResultsScope.documentLogId),
    )
    .innerJoin(commits, eq(commits.id, documentLogs.commitId))
    .where(
      and(
        eq(evaluationResultsScope.evaluationId, evaluation.id),
        eq(documentLogs.documentUuid, documentUuid),
        getCommitFilter(commit),
      ),
    )
    .groupBy(evaluationResultsScope.evaluationId)
    .limit(1)

  const mostCommonResult = await db
    .select({
      mostCommon: evaluationResultsScope.result,
      mostCommonCount: sum(evaluationResultsScope.id)
        .mapWith(Number)
        .as('most_common_count'),
    })
    .from(evaluationResultsScope)
    .innerJoin(
      documentLogs,
      eq(documentLogs.id, evaluationResultsScope.documentLogId),
    )
    .innerJoin(commits, eq(commits.id, documentLogs.commitId))
    .where(
      and(
        eq(evaluationResultsScope.evaluationId, evaluation.id),
        eq(documentLogs.documentUuid, documentUuid),
        getCommitFilter(commit),
      ),
    )
    .groupBy(evaluationResultsScope.result)
    .orderBy(sql`most_common_count DESC`)
    .limit(1)

  const total = totalQuery[0]?.totalCount ?? 0
  const mostCommon = mostCommonResult[0]?.mostCommon ?? '-'
  const mostCommonCount = mostCommonResult[0]?.mostCommonCount ?? 0
  let percentage = 0

  if (mostCommonCount > 0) {
    percentage = parseFloat(((mostCommonCount / total) * 100).toFixed(2))
  }
  return {
    mostCommon,
    percentage,
  }
}
