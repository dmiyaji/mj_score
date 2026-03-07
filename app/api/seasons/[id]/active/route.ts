import { NextRequest, NextResponse } from 'next/server'
import { seasonOperations } from '@/lib/database'

// PUT /api/seasons/[id]/active - Set active season
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await seasonOperations.setActive(id)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error setting active season:', error)
        return NextResponse.json(
            { error: 'Failed to set active season' },
            { status: 500 }
        )
    }
}
