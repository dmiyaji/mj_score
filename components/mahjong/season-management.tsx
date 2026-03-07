"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Map, Plus, Play, Trophy, CheckCircle2, CircleDashed, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { seasonApi } from "@/lib/api-client"
import type { Season } from "@/lib/supabase"

interface SeasonManagementProps {
    seasons: Season[]
    onDataUpdate: () => void
}

export default function SeasonManagement({ seasons, onDataUpdate }: SeasonManagementProps) {
    const [newSeasonName, setNewSeasonName] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const { toast } = useToast()

    const handleCreateSeason = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSeasonName.trim()) return

        setIsSubmitting(true)
        try {
            await seasonApi.create(newSeasonName.trim())
            setNewSeasonName("")
            onDataUpdate()
            toast({
                title: "シーズン作成完了",
                description: `シーズン「${newSeasonName}」を作成しました`,
            })
        } catch (error) {
            toast({
                title: "エラー",
                description: "シーズンの作成に失敗しました",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSetActive = async (id: string, name: string) => {
        try {
            await seasonApi.setActive(id)
            onDataUpdate()
            toast({
                title: "アクティブ切替",
                description: `シーズン「${name}」をアクティブに設定しました`,
            })
        } catch (error) {
            toast({
                title: "エラー",
                description: "アクティブシーズンの切り替えに失敗しました",
                variant: "destructive",
            })
        }
    }

    const handleSetStage = async (id: string, name: string, stage: "REGULAR" | "FINAL") => {
        try {
            await seasonApi.setStage(id, stage)
            onDataUpdate()
            toast({
                title: "ステージ切替",
                description: `「${name}」を${stage === "REGULAR" ? "レギュラー" : "ファイナル"}に切り替えました`,
            })
        } catch (error) {
            toast({
                title: "エラー",
                description: "ステージの切り替えに失敗しました",
                variant: "destructive",
            })
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`本当にシーズン「${name}」を削除しますか？\n関連付けられたゲーム結果ごと消えてしまう可能性があります。`)) {
            return
        }

        setIsDeleting(id)
        try {
            await seasonApi.delete(id)
            onDataUpdate()
            toast({
                title: "削除完了",
                description: `シーズン「${name}」を削除しました`,
            })
        } catch (error) {
            toast({
                title: "エラー",
                description: "シーズンの削除に失敗しました",
                variant: "destructive",
            })
        } finally {
            setIsDeleting(null)
        }
    }

    return (
        <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl overflow-hidden">
            <CardHeader className="pb-4 sm:pb-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <div className="p-2 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg shadow-lg">
                        <Map className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    シーズン・ステージ管理
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                    新規シーズンの作成や、レギュラー／ファイナルの切り替えを行います
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6 sm:space-y-8">
                {/* 新規シーズン作成 */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-orange-500" />
                        新規シーズンを作成
                    </h3>
                    <form onSubmit={handleCreateSeason} className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <Label htmlFor="season-name" className="sr-only">
                                シーズン名
                            </Label>
                            <Input
                                id="season-name"
                                value={newSeasonName}
                                onChange={(e) => setNewSeasonName(e.target.value)}
                                placeholder="例: Mリーグ 2026シーズン"
                                className="w-full text-sm border-2 focus:border-orange-500"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !newSeasonName.trim()}
                            className="w-full sm:w-auto text-xs sm:text-sm bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            追加
                        </Button>
                    </form>
                </div>

                {/* シーズン一覧 */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Map className="w-4 h-4 text-orange-500" />
                        登録済みシーズン一覧
                    </h3>

                    <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-white">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50/50">
                                        <TableHead className="w-[40%] text-xs shrink-0 min-w-[120px]">シーズン名</TableHead>
                                        <TableHead className="text-xs shrink-0 min-w-[80px]">アクティブ</TableHead>
                                        <TableHead className="text-xs shrink-0 min-w-[120px]">ステージ（フェーズ）</TableHead>
                                        <TableHead className="text-right text-xs shrink-0 min-w-[80px]">操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {seasons.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-sm text-gray-500">
                                                登録されているシーズンはありません
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        seasons.map((season) => (
                                            <TableRow key={season.id} className="group hover:bg-orange-50/30 transition-colors duration-200">
                                                <TableCell className="font-medium text-xs sm:text-sm">{season.name}</TableCell>
                                                <TableCell>
                                                    {season.is_active ? (
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0.5 text-xs">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleSetActive(season.id, season.name)}
                                                            className="text-gray-400 hover:text-green-600 hover:bg-green-50 h-6 px-2 text-xs"
                                                        >
                                                            <CircleDashed className="w-3 h-3 mr-1" />
                                                            セット
                                                        </Button>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={season.current_stage || "REGULAR"}
                                                        onValueChange={(val: "REGULAR" | "FINAL") => handleSetStage(season.id, season.name, val)}
                                                    >
                                                        <SelectTrigger className="h-8 w-[110px] sm:w-[130px] text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="REGULAR" className="text-xs font-medium text-blue-600">
                                                                レギュラー
                                                            </SelectItem>
                                                            <SelectItem value="FINAL" className="text-xs font-medium text-purple-600">
                                                                ファイナル
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={isDeleting === season.id}
                                                        onClick={() => handleDelete(season.id, season.name)}
                                                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
