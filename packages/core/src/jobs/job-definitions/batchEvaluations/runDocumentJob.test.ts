import { Job } from 'bullmq'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { LogSources, Providers } from '../../../browser'
import { Result } from '../../../lib/Result'
import * as commits from '../../../services/commits/runDocumentAtCommit'
import * as factories from '../../../tests/factories'
import { mockToolRequestsCopilot } from '../../../tests/helpers'
import { WebsocketClient } from '../../../websockets/workers'
import * as utils from '../../utils/progressTracker'
import { defaultQueue, evaluationsQueue, eventsQueue } from '../../queues'
import { ChainError } from '../../../lib/chainStreamManager/ChainErrors'
import { RunErrorCodes } from '@latitude-data/constants/errors'

const incrementErrorsMock = vi.hoisted(() => vi.fn())

describe('runDocumentJob', () => {
  let mockJob: Job
  let workspace: any
  let project: any
  let document: any
  let commit: any
  let evaluation: any

  // Set up spies
  vi.spyOn(WebsocketClient, 'getSocket').mockResolvedValue({
    emit: vi.fn(),
  } as any)
  const mocks = vi.hoisted(() => ({
    defaultQueue: vi.fn(),
    eventsQueue: vi.fn(),
    evaluationsQueue: vi.fn(),
  }))

  vi.spyOn(defaultQueue, 'add').mockImplementation(mocks.defaultQueue)
  vi.spyOn(eventsQueue, 'add').mockImplementation(mocks.eventsQueue)
  vi.spyOn(evaluationsQueue, 'add').mockImplementation(mocks.evaluationsQueue)

  vi.mock('../../../redis', () => ({
    buildRedisConnection: vi.fn().mockResolvedValue({} as any),
  }))
  vi.spyOn(commits, 'runDocumentAtCommit')
  // @ts-ignore
  vi.spyOn(utils, 'ProgressTracker').mockImplementation(() => ({
    incrementCompleted: vi.fn(),
    incrementErrors: incrementErrorsMock,
    getProgress: vi.fn(),
    cleanup: vi.fn(),
  }))

  beforeAll(async () => {
    await mockToolRequestsCopilot()
  })

  beforeEach(async () => {
    vi.clearAllMocks()

    // Create necessary resources using factories
    const setup = await factories.createProject({
      providers: [{ type: Providers.OpenAI, name: 'Latitude' }],
      documents: {
        'test-doc': factories.helpers.createPrompt({ provider: 'Latitude' }),
      },
    })
    workspace = setup.workspace
    project = setup.project
    document = setup.documents[0]
    commit = setup.commit

    evaluation = await factories.createLlmAsJudgeEvaluation({
      user: setup.user,
      workspace,
      name: 'Test Evaluation',
    })

    mockJob = {
      data: {
        workspaceId: workspace.id,
        documentUuid: document.documentUuid,
        commitUuid: commit.uuid,
        projectId: project.id,
        parameters: { param1: 'value1' },
        evaluationId: evaluation.id,
        batchId: 'batch1',
      },
    } as Job<any>
  })

  it('should run document and enqueue evaluation job on success', async () => {
    const mod = await import('./runDocumentJob')
    const runDocumentForEvaluationJob = mod.runDocumentForEvaluationJob
    const mockResult = {
      errorableUuid: 'log1',
      lastResponse: Promise.resolve({ providerLog: { uuid: 'log1' } }),
      toolCalls: Promise.resolve([]),
      messages: Promise.resolve([]),
    }
    vi.mocked(commits.runDocumentAtCommit).mockResolvedValue(
      // @ts-ignore
      Result.ok(mockResult),
    )

    await runDocumentForEvaluationJob(mockJob)
    expect(commits.runDocumentAtCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace,
        commit,
        parameters: { param1: 'value1' },
        source: LogSources.Evaluation,
      }),
    )

    expect(mocks.evaluationsQueue).toHaveBeenCalledWith('runEvaluationJob', {
      workspaceId: workspace.id,
      documentUuid: document.documentUuid,
      providerLogUuid: 'log1',
      evaluationId: evaluation.id,
      batchId: 'batch1',
    })

    expect(incrementErrorsMock).not.toHaveBeenCalled()
  })

  it('should handle errors and update progress tracker', async () => {
    const mod = await import('./runDocumentJob')
    const runDocumentForEvaluationJob = mod.runDocumentForEvaluationJob

    vi.mocked(commits.runDocumentAtCommit).mockRejectedValue(
      new Error('Test error'),
    )

    await runDocumentForEvaluationJob(mockJob)

    const socket = await WebsocketClient.getSocket()
    expect(socket.emit).toHaveBeenCalledWith('evaluationStatus', {
      workspaceId: workspace.id,
      data: expect.objectContaining({
        batchId: 'batch1',
        evaluationId: evaluation.id,
        documentUuid: document.documentUuid,
        version: 'v1',
      }),
    })

    expect(commits.runDocumentAtCommit).toHaveBeenCalled()
    expect(mocks.evaluationsQueue).not.toHaveBeenCalled()
    expect(incrementErrorsMock).toHaveBeenCalled()
  })

  it('should throw an error when document run fails with rate limit error', async () => {
    const mod = await import('./runDocumentJob')
    const runDocumentForEvaluationJob = mod.runDocumentForEvaluationJob
    const rateLimitError = new ChainError({
      code: RunErrorCodes.RateLimit,
      message: 'Rate limit error',
    })
    const mockResult = {
      errorableUuid: 'log1',
      lastResponse: Promise.resolve({ providerLog: { uuid: 'log1' } }),
      toolCalls: Promise.resolve([]),
      messages: Promise.resolve([]),
      error: Promise.resolve(rateLimitError),
    }
    vi.mocked(commits.runDocumentAtCommit).mockResolvedValue(
      // @ts-ignore
      Result.ok(mockResult),
    )

    await expect(runDocumentForEvaluationJob(mockJob)).rejects.toThrow(
      'Rate limit error',
    )

    expect(incrementErrorsMock).not.toHaveBeenCalled()
  })
})
