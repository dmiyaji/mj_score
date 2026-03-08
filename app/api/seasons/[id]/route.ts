import { NextRequest, NextResponse } from 'next/server'
import { seasonOperations } from '@/lib/database'
import { getRequestContext } from '@cloudflare/next-on-pages'
import { getDb } from '@/lib/get-db'

export const runtime = 'edge'

// DELETE /api/seasons/[id] - Delete a season
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const db = await getDb()
        await seasonOperations.delete(db, id)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting season:', error)
        return NextResponse.json(
            { error: 'Failed to delete season' },
            { status: 500 }
        )
    }
}
