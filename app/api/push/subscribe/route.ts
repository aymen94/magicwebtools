import { NextResponse } from 'next/server'

// Push Notifications plugin — subscription store.
// NOTE: This uses an in-memory store for the demo. In production, persist subscriptions in a
// database and send pushes from a server job using the `web-push` library with VAPID keys.
const subscriptions = new Map<string, unknown>()

export async function GET() {
  return NextResponse.json({ count: subscriptions.size })
}

export async function POST(request: Request) {
  try {
    const subscription = await request.json()
    if (!subscription?.endpoint) return NextResponse.json({ error: 'Missing subscription endpoint.' }, { status: 400 })
    subscriptions.set(subscription.endpoint, subscription)
    return NextResponse.json({ ok: true, count: subscriptions.size })
  } catch {
    return NextResponse.json({ error: 'Invalid subscription payload.' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json()
    if (endpoint) subscriptions.delete(endpoint)
    return NextResponse.json({ ok: true, count: subscriptions.size })
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  }
}
