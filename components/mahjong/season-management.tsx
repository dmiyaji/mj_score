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
import type { Season } from "@/lib/types"

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
    if (
      !window.confirm(
        `本当にシーズン「${name}」を削除しますか？\n関連付けられたゲーム結果ごと消えてしまう可能性があります。`
      )
    ) {
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
    <Card className="overflow-hidden border border-white/20 bg-white/80 shadow-xl backdrop-blur-sm">
      <CardHeader className="rounded-t-lg bg-gradient-to-r from-red-50 to-orange-50 pb-4 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <div className="rounded-lg bg-gradient-to-r from-red-500 to-orange-600 p-2 shadow-lg">
            <Map className="h-4 w-4 text-white sm:h-5 sm:w-5" />
          </div>
          シーズン・ステージ管理
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          新規シーズンの作成や、レギュラー／ファイナルの切り替えを行います
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-4 sm:space-y-8 sm:p-6">
        {/* 新規シーズン作成 */}
        <div className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Plus className="h-4 w-4 text-orange-500" />
            新規シーズンを作成
          </h3>
          <form onSubmit={handleCreateSeason} className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Label htmlFor="season-name" className="sr-only">
                シーズン名
              </Label>
              <Input
                id="season-name"
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder="例: Mリーグ 2026シーズン"
                className="w-full border-2 text-sm focus:border-orange-500"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting || !newSeasonName.trim()}
              className="w-full bg-gradient-to-r from-red-500 to-orange-600 text-xs hover:from-red-600 hover:to-orange-700 sm:w-auto sm:text-sm"
            >
              <Plus className="mr-1 h-4 w-4" />
              追加
            </Button>
          </form>
        </div>

        {/* シーズン一覧 */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Map className="h-4 w-4 text-orange-500" />
            登録済みシーズン一覧
          </h3>

          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="w-[40%] min-w-[120px] shrink-0 text-xs">シーズン名</TableHead>
                    <TableHead className="min-w-[80px] shrink-0 text-xs">アクティブ</TableHead>
                    <TableHead className="min-w-[120px] shrink-0 text-xs">ステージ（フェーズ）</TableHead>
                    <TableHead className="min-w-[80px] shrink-0 text-right text-xs">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seasons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-gray-500">
                        登録されているシーズンはありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    seasons.map((season) => (
                      <TableRow key={season.id} className="group transition-colors duration-200 hover:bg-orange-50/30">
                        <TableCell className="text-xs font-medium sm:text-sm">{season.name}</TableCell>
                        <TableCell>
                          {season.is_active ? (
                            <Badge className="border-none bg-green-100 px-2 py-0.5 text-xs text-green-700 hover:bg-green-100">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetActive(season.id, season.name)}
                              className="h-6 px-2 text-xs text-gray-400 hover:bg-green-50 hover:text-green-600"
                            >
                              <CircleDashed className="mr-1 h-3 w-3" />
                              セット
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={season.current_stage || "REGULAR"}
                            onValueChange={(val: "REGULAR" | "FINAL") => handleSetStage(season.id, season.name, val)}
                          >
                            <SelectTrigger className="h-8 w-[110px] text-xs sm:w-[130px]">
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
                            className="h-8 w-8 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
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
