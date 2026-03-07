import { NextRequest, NextResponse } from 'next/server'
import { seasonOperations } from '@/lib/database'

// PUT /api/seasons/[id]/stage - Set active stage for a season
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { stage } = await request.json()

        if (stage !== 'REGULAR' && stage !== 'FINAL') {
            return NextResponse.json(
                { error: 'Invalid stage' },
                { status: 400 }
            )
        }

        await seasonOperations.setStage(id, stage)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error setting season stage:', error)
        return NextResponse.json(
            { error: 'Failed to set season stage' },
            { status: 500 }
        )
    }
}
