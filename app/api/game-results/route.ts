import { NextRequest, NextResponse } from 'next/server'
import { gameResultOperations } from '@/lib/database'

// GET /api/game-results - Get all game results
export async function GET() {
  try {
    const gameResults = await gameResultOperations.getAll()
    return NextResponse.json(gameResults)
  } catch (error) {
    console.error('Error fetching game results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch game results' },
      { status: 500 }
    )
  }
}

// POST /api/game-results - Create a new game result
export async function POST(request: NextRequest) {
  try {
    const { gameDate, playerResults } = await request.json()
    
    if (!gameDate || !playerResults || !Array.isArray(playerResults)) {
      return NextResponse.json(
        { error: 'gameDate and playerResults array are required' },
        { status: 400 }
      )
    }

    if (playerResults.length !== 4) {
      return NextResponse.json(
        { error: 'Exactly 4 player results are required' },
        { status: 400 }
      )
    }

    const gameResult = await gameResultOperations.create(gameDate, playerResults)
    return NextResponse.json(gameResult, { status: 201 })
  } catch (error) {
    console.error('Error creating game result:', error)
    return NextResponse.json(
      { error: 'Failed to create game result' },
      { status: 500 }
    )
  }
}