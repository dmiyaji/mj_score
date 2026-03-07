import { NextRequest, NextResponse } from 'next/server'
import { seasonOperations } from '@/lib/database'

// GET /api/seasons - Get all seasons
export async function GET() {
    try {
        const seasons = await seasonOperations.getAll()
        return NextResponse.json(seasons)
    } catch (error) {
        console.error('Error fetching seasons:', error)
        return NextResponse.json(
            { error: 'Failed to fetch seasons' },
            { status: 500 }
        )
    }
}

// POST /api/seasons - Create a new season
export async function POST(request: NextRequest) {
    try {
        const { name } = await request.json()

        if (!name) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            )
        }

        const season = await seasonOperations.create(name)
        return NextResponse.json(season, { status: 201 })
    } catch (error) {
        console.error('Error creating season:', error)
        return NextResponse.json(
            { error: 'Failed to create season' },
            { status: 500 }
        )
    }
}
