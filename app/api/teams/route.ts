import { NextRequest, NextResponse } from 'next/server'
import { teamOperations } from '@/lib/database'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getDb } from '@/lib/get-db'

export const runtime = 'edge'

// GET /api/teams - Get all teams
export async function GET() {
  try {
    const db = await getDb()
    const teams = await teamOperations.getAll(db)
    return NextResponse.json(teams)
  } catch (error: any) {
    console.error('Error fetching teams:', error)

    let dbgEnv = 'unknown';
    try {
      const ctx = getRequestContext();
      dbgEnv = ctx && ctx.env ? Object.keys(ctx.env).join(', ') : 'no env';
    } catch (e: any) {
      dbgEnv = 'ctx error: ' + String(e.message);
    }

    return NextResponse.json(
      { error: 'Failed to fetch teams', details: String(error?.message || error), envKeys: dbgEnv },
      { status: 500 }
    )
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const { name, color } = await request.json()

    if (!name || !color) {
      return NextResponse.json(
        { error: 'Name and color are required' },
        { status: 400 }
      )
    }

    const db = await getDb()
    const team = await teamOperations.create(db, name, color)
    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    )
  }
}