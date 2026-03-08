import { NextRequest, NextResponse } from 'next/server'
import { gameResultOperations } from '@/lib/database'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getDb } from '@/lib/get-db'

export const runtime = 'edge'

// GET /api/game-results - Get all game results
export async function GET() {
  try {
    const db = await getDb()
    const gameResults = await gameResultOperations.getAll(db)
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
    const { gameDate, playerResults, seasonId, stage } = await request.json() as any

    if (!gameDate || !playerResults || !Array.isArray(playerResults)) {
      return NextResponse.json(
        { error: 'gameDate and playerResults array are required' },
        { status: 400 }
      )
    }

    // teamIdの要求は各プレイヤーに
    const hasMissingTeamId = playerResults.some(pr => !pr.teamId);
    if (hasMissingTeamId) {
      return NextResponse.json(
        { error: 'チームIDはすべてのプレイヤー結果に必須です' },
        { status: 400 }
      )
    }

    if (playerResults.length !== 4) {
      return NextResponse.json(
        { error: 'Exactly 4 player results are required' },
        { status: 400 }
      )
    }

    const db = await getDb()
    const gameResult = await gameResultOperations.create(db, gameDate, playerResults, seasonId, stage)
    return NextResponse.json(gameResult, { status: 201 })
  } catch (error) {
    console.error('Error creating game result:', error)
    return NextResponse.json(
      { error: 'Failed to create game result', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}