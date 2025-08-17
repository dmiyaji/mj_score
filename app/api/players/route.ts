import { NextRequest, NextResponse } from 'next/server'
import { playerOperations } from '@/lib/database'

// GET /api/players - Get all players
export async function GET() {
  try {
    const players = await playerOperations.getAll()
    return NextResponse.json(players)
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    )
  }
}

// POST /api/players - Create a new player
export async function POST(request: NextRequest) {
  try {
    const { name, teamId } = await request.json()
    
    if (!name || !teamId) {
      return NextResponse.json(
        { error: 'Name and teamId are required' },
        { status: 400 }
      )
    }

    const player = await playerOperations.create(name, teamId)
    return NextResponse.json(player, { status: 201 })
  } catch (error) {
    console.error('Error creating player:', error)
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    )
  }
}