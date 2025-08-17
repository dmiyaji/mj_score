import { NextRequest, NextResponse } from 'next/server'
import { gameResultOperations } from '@/lib/database'

// DELETE /api/game-results/[id] - Delete a game result
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await gameResultOperations.delete(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting game result:', error)
    return NextResponse.json(
      { error: 'Failed to delete game result' },
      { status: 500 }
    )
  }
}