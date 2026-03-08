import { NextRequest, NextResponse } from 'next/server'
import { statsOperations } from '@/lib/database'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getDb } from '@/lib/get-db'

export const runtime = 'edge'

// GET /api/stats/players - Get player statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamFilter = searchParams.get('teamFilter') || undefined
    const dateFromStr = searchParams.get('dateFrom')
    const dateToStr = searchParams.get('dateTo')
    const seasonId = searchParams.get('seasonId') || undefined
    const stageStr = searchParams.get('stage')
    const stage = (stageStr === 'REGULAR' || stageStr === 'FINAL') ? stageStr : undefined

    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined
    const dateTo = dateToStr ? new Date(dateToStr) : undefined

    const db = await getDb()
    const playerStats = await statsOperations.getPlayerStats(db, teamFilter, dateFrom, dateTo, seasonId, stage)
    return NextResponse.json(playerStats)
  } catch (error) {
    console.error('Error fetching player stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player statistics' },
      { status: 500 }
    )
  }
}