import { NextRequest, NextResponse } from 'next/server'
import { gameResultOperations } from '@/lib/database'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await gameResultOperations.delete(id)
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
    const body = await request.json()
    const { playerResults } = body

    if (!playerResults || !Array.isArray(playerResults)) {
      return NextResponse.json({ error: 'Missing or invalid playerResults' }, { status: 400 })
    }

    await gameResultOperations.update(id, playerResults)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating game result:', error)
    return NextResponse.json(
      { error: 'Failed to update game result' },
      { status: 500 }
    )
  }
}
