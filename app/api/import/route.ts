import { NextRequest, NextResponse } from 'next/server'
import { importOperations } from '@/lib/database'

// POST /api/import - Import data
export async function POST(request: NextRequest) {
  try {
    const { type, data, csvText } = await request.json()
    
    if (!type || !['teams', 'players', 'gameResults'].includes(type)) {
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
    switch (type) {
      case 'teams':
        result = await importOperations.importTeams(importData)
        break
      case 'players':
        result = await importOperations.importPlayers(importData)
        break
      case 'gameResults':
        result = await importOperations.importGameResults(importData)
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