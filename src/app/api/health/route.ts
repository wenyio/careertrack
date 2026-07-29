import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    await query('SELECT 1 AS ok')
    return NextResponse.json(
      { status: 'ok' },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      { status: 'unhealthy' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  }
}
