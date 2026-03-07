import { NextRequest, NextResponse } from 'next/server'
import { seasonOperations } from '@/lib/database'

// DELETE /api/seasons/[id] - Delete a season
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await seasonOperations.delete(id)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting season:', error)
        return NextResponse.json(
            { error: 'Failed to delete season' },
            { status: 500 }
        )
    }
}
