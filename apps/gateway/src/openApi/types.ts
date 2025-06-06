import type { RouteConfig, RouteHandler, z } from '@hono/zod-openapi'

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R>

// @ts-expect-error
export type ZodSchema = z.ZodUnion | z.AnyZodObject | z.ZodArray<z.AnyZodObject>
