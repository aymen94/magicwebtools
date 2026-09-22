import { NextResponse } from 'next/server'
import { checkers } from '../../../../lib/checkers'

// These checkers use Node core modules (dns/net/tls) and outbound requests.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const handler = checkers[slug]
  if (!handler) {
    return NextResponse.json({ error: 'Unknown tool.' }, { status: 404 })
  }

  let input: Record<string, string> = {}
  try {
    const body = await request.json()
    if (body && typeof body === 'object') {
      input = Object.fromEntries(Object.entries(body).map(([key, value]) => [key, String(value ?? '')]))
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  try {
    const result = await handler(input)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The check could not be completed.'
    return NextResponse.json({ error: message }, { status: 422 })
  }
}
