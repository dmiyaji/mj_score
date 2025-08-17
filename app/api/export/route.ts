import { NextRequest, NextResponse } from 'next/server'
import { exportOperations } from '@/lib/database'

// GET /api/export?type=all&format=json - Export all data
// GET /api/export?type=teams&format=csv - Export teams as CSV
// GET /api/export?type=players&format=csv - Export players as CSV
// GET /api/export?type=gameResults&format=csv - Export game results as CSV
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const format = searchParams.get('format') || 'json'

    if (format === 'csv' && type !== 'all') {
      if (!['teams', 'players', 'gameResults'].includes(type)) {
        return NextResponse.json(
          { error: 'Invalid type for CSV export' },
          { status: 400 }
        )
      }
      
      const csvData = await exportOperations.exportToCSV(type as 'teams' | 'players' | 'gameResults')
      
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}.csv"`,
        },
      })
    } else {
      // JSON export (all data)
      const data = await exportOperations.exportAllData()
      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}