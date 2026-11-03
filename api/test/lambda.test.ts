import type {
  APIGatewayProxyResult,
  LambdaContext,
  LambdaEvent,
} from '@hono/aws-lambda'
import { describe, expect, it, vi } from 'vitest'
import { createHandler } from '../src/lambda-handler'
import { pikachu, tinySprite } from './helpers'

const FRONT = 'https://pokenuxt.vercel.app'

// What API Gateway's HTTP API sends to Lambda (payload format 2.0).
function event(
  method: string,
  path: string,
  {
    query = '',
    headers = {},
    body,
  }: { query?: string; headers?: Record<string, string>; body?: string } = {},
): LambdaEvent {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: path,
    rawQueryString: query,
    headers: { host: 'abc.execute-api.eu-north-1.amazonaws.com', ...headers },
    requestContext: {
      accountId: '123456789012',
      apiId: 'abc',
      authentication: null,
      authorizer: {},
      domainName: 'abc.execute-api.eu-north-1.amazonaws.com',
      domainPrefix: 'abc',
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '203.0.113.1',
        userAgent: 'test',
      },
      requestId: 'id',
      routeKey: '$default',
      stage: '$default',
      time: '03/Nov/2026:12:00:00 +0000',
      timeEpoch: 0,
    },
    body: body ?? null,
    isBase64Encoded: false,
  }
}

const context = {} as LambdaContext

async function invoke(event: LambdaEvent) {
  return (await handler()(event, context)) as APIGatewayProxyResult
}

function handler() {
  const fetch = vi.fn(async () => new Response(new Uint8Array(tinySprite())))
  return createHandler({
    fetch: fetch as unknown as typeof globalThis.fetch,
    origins: [FRONT],
  })
}

describe('handler Lambda', () => {
  it('répond au JSON', async () => {
    const result = await invoke(event('GET', '/health'))

    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body)).toEqual({ ok: true })
    expect(result.isBase64Encoded).toBe(false)
  })

  it('renvoie les sprites en base64, comme API Gateway l’attend', async () => {
    const result = await invoke(event('GET', '/sprite/25', { query: 's=96' }))

    expect(result.statusCode).toBe(200)
    expect(result.isBase64Encoded).toBe(true)
    expect(result.headers?.['content-type']).toBe('image/png')
    const png = Buffer.from(result.body, 'base64')
    expect(
      [...png.subarray(1, 4)].map((b) => String.fromCharCode(b)).join(''),
    ).toBe('PNG')
  })

  it('lit le corps d’un POST', async () => {
    const result = await invoke(
      event('POST', '/wishlist', {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(pikachu),
      }),
    )

    expect(result.statusCode).toBe(201)
    expect(JSON.parse(result.body)).toEqual({ item: { id: 25, ...pikachu } })
  })

  it('accepte la pré-vérification CORS du front', async () => {
    const result = await invoke(
      event('OPTIONS', '/wishlist', {
        headers: {
          origin: FRONT,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      }),
    )

    expect(result.statusCode).toBe(204)
    expect(result.headers?.['access-control-allow-origin']).toBe(FRONT)
    expect(result.headers?.['access-control-allow-methods']).toContain('POST')
  })

  it('n’autorise pas un autre site', async () => {
    const result = await invoke(
      event('GET', '/health', { headers: { origin: 'https://evil.test' } }),
    )

    expect(result.headers?.['access-control-allow-origin']).toBeUndefined()
  })
})
