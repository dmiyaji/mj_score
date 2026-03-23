import { NextRequest, NextResponse } from 'next/server'
import { importOperations } from '@/lib/database'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getDb } from '@/lib/get-db'

export const runtime = 'edge'

// POST /api/import - Import data
export async function POST(request: NextRequest) {
  try {
    const { type, data, csvText } = await request.json() as any

    if (!type || !['teams', 'players', 'gameResults', 'restore'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid import type' },
        { status: 400 }
      )
    }

    let importData
    if (csvText) {
      // Parse CSV text
      importData = importOperations.parseCSV(csvText, type as 'teams' | 'players' | 'gameResults')
    } else if (data) {
      importData = data
    } else {
      return NextResponse.json(
        { error: 'Either data or csvText is required' },
        { status: 400 }
      )
    }

    let result
    const db = await getDb()
    switch (type) {
      case 'restore':
        result = await importOperations.restoreFullDatabase(db, importData)
        return NextResponse.json({
          success: true,
          message: 'Database restored successfully',
          count: result.count
        })
      case 'teams':
        result = await importOperations.importTeams(db, importData)
        break
      case 'players':
        result = await importOperations.importPlayers(db, importData)
        break
      case 'gameResults':
        result = await importOperations.importGameResults(db, importData)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid import type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      imported: result.length,
      data: result
    })
  } catch (error) {
    console.error('Error importing data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import data' },
      { status: 500 }
    )
  }
}