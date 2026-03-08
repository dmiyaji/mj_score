import { NextRequest, NextResponse } from 'next/server'
import { gameResultOperations } from '@/lib/database'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getDb } from '@/lib/get-db'

export const runtime = 'edge'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = await getDb()
    await gameResultOperations.delete(db, id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting game result:', error)
    return NextResponse.json(
      { error: 'Failed to delete game result' },
      { status: 500 }
    )
  }
}

// PUT /api/game-results/[id] - Update a game result
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json() as any
    const { playerResults } = body

    if (!playerResults || !Array.isArray(playerResults)) {
      return NextResponse.json({ error: 'Missing or invalid playerResults' }, { status: 400 })
    }

    const db = await getDb()
    await gameResultOperations.update(db, id, playerResults)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating game result:', error)
    return NextResponse.json(
      { error: 'Failed to update game result' },
      { status: 500 }
    )
  }
}
