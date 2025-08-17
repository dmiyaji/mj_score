import { NextRequest, NextResponse } from 'next/server'
import { statsOperations } from '@/lib/database'

// GET /api/stats/players - Get player statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamFilter = searchParams.get('teamFilter') || undefined
    const dateFromStr = searchParams.get('dateFrom')
    const dateToStr = searchParams.get('dateTo')
    
    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined
    const dateTo = dateToStr ? new Date(dateToStr) : undefined

    const playerStats = await statsOperations.getPlayerStats(teamFilter, dateFrom, dateTo)
    return NextResponse.json(playerStats)
  } catch (error) {
    console.error('Error fetching player stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch player statistics' },
      { status: 500 }
    )
  }
}