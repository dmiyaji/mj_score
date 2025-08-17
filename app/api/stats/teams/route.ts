import { NextRequest, NextResponse } from 'next/server'
import { statsOperations } from '@/lib/database'

// GET /api/stats/teams - Get team statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFromStr = searchParams.get('dateFrom')
    const dateToStr = searchParams.get('dateTo')
    
    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined
    const dateTo = dateToStr ? new Date(dateToStr) : undefined

    const teamStats = await statsOperations.getTeamStats(dateFrom, dateTo)
    return NextResponse.json(teamStats)
  } catch (error) {
    console.error('Error fetching team stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team statistics' },
      { status: 500 }
    )
  }
}