"use client"
import { useState } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, Download, Upload, FileText, AlertTriangle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { exportApi, importApi } from "@/lib/api-client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface DataManagementProps {
  onDataUpdate: () => void
}

export default function DataManagement({ onDataUpdate }: DataManagementProps) {
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json")
  const [exportTable, setExportTable] = useState<"teams" | "players" | "gameResults">("teams")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importType, setImportType] = useState<"teams" | "players" | "gameResults" | "seasons" | "restore">("teams")
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const { toast } = useToast()

  // データエクスポート
  const handleExport = async () => {
    setIsExporting(true)
    try {
      if (exportFormat === "json") {
        const data = await exportApi.exportAllData()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `mahjong-data-${new Date().toISOString().split("T")[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        const csvData = await exportApi.exportToCSV(exportTable)
        const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${exportTable}-${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }

      toast({
        title: "エクスポート完了",
        description: "データのエクスポートが完了しました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "データのエクスポートに失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // データインポート
  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: "エラー",
        description: "ファイルを選択してください",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    try {
      const fileContent = await importFile.text()

      if (importType === "restore") {
        if (!importFile.name.endsWith(".json")) {
          throw new Error("完全復元にはエクスポートされたJSONファイルを使用してください")
        }
        const data = JSON.parse(fileContent)
        await importApi.restoreDatabase(data)
      } else if (importFile.name.endsWith(".json")) {
        const data = JSON.parse(fileContent)

        if (importType === "teams" && data.teams) {
          await importApi.importTeams(data.teams)
        } else if (importType === "players" && data.players) {
          await importApi.importPlayers(data.players)
        } else if (importType === "gameResults" && data.gameResults) {
          await importApi.importGameResults(data.gameResults)
        } else {
          throw new Error("インポートするデータが見つかりません")
        }
      } else if (importFile.name.endsWith(".csv")) {
        await importApi.parseCSVAndImport(fileContent, importType)

        if (importType === "teams") {
          // Data already imported by parseCSVAndImport
        } else if (importType === "players") {
          // Data already imported by parseCSVAndImport
        } else if (importType === "gameResults") {
          // Data already imported by parseCSVAndImport
        }
      } else {
        throw new Error("サポートされていないファイル形式です")
      }

      onDataUpdate()
      setImportFile(null)
      toast({
        title: "インポート完了",
        description: "データのインポートが完了しました",
      })
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "データのインポートに失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  // ファイル選択処理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImportFile(file)
    }
  }

  return (
    <Card className="border border-white/20 bg-white/80 shadow-xl backdrop-blur-sm">
      <CardHeader className="rounded-t-lg bg-gradient-to-r from-slate-50 to-gray-50 pb-3 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <div className="rounded-lg bg-gradient-to-r from-slate-500 to-gray-600 p-2 shadow-lg">
            <Database className="h-4 w-4 text-white sm:h-5 sm:w-5" />
          </div>
          データ管理
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">データのエクスポート・インポート機能</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2 border border-white/20 bg-white/50 backdrop-blur-sm">
            <TabsTrigger
              value="export"
              className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white sm:text-sm"
            >
              <Download className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              エクスポート
            </TabsTrigger>
            <TabsTrigger
              value="import"
              className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white sm:text-sm"
            >
              <Upload className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              インポート
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="mt-6 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">エクスポート形式</Label>
                <Select value={exportFormat} onValueChange={(value: "json" | "csv") => setExportFormat(value)}>
                  <SelectTrigger className="border-2 text-sm focus:border-green-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json" className="text-sm">
                      JSON（全データ）
                    </SelectItem>
                    <SelectItem value="csv" className="text-sm">
                      CSV（テーブル別）
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {exportFormat === "csv" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">エクスポートするテーブル</Label>
                  <Select
                    value={exportTable}
                    onValueChange={(value: "teams" | "players" | "gameResults") => setExportTable(value)}
                  >
                    <SelectTrigger className="border-2 text-sm focus:border-green-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teams" className="text-sm">
                        チーム
                      </SelectItem>
                      <SelectItem value="players" className="text-sm">
                        プレイヤー
                      </SelectItem>
                      <SelectItem value="gameResults" className="text-sm">
                        ゲーム結果
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-sm transition-all duration-200 hover:from-green-600 hover:to-emerald-700"
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "エクスポート中..." : "エクスポート"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="import" className="mt-6 space-y-4">
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  <div className="text-xs text-amber-800">
                    <p className="mb-1 font-medium">注意事項</p>
                    <ul className="space-y-1 text-xs">
                      <li>• インポート前に必ずデータをバックアップしてください</li>
                      <li>• 同一IDや同名のデータがある場合は**最新の情報に上書き**されます</li>
                      <li>• セレクターで「完全復元」を選ぶとDBが一度空になります</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">インポートするデータ種別</Label>
                <Select
                  value={importType}
                  onValueChange={(value: "teams" | "players" | "gameResults") => setImportType(value)}
                >
                  <SelectTrigger className="border-2 text-sm focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restore" className="text-sm font-bold text-red-600">
                      完全復元 (JSONのみ)
                    </SelectItem>
                    <SelectItem value="seasons" className="text-sm">
                      大会シーズン
                    </SelectItem>
                    <SelectItem value="teams" className="text-sm">
                      チーム
                    </SelectItem>
                    <SelectItem value="players" className="text-sm">
                      プレイヤー
                    </SelectItem>
                    <SelectItem value="gameResults" className="text-sm">
                      ゲーム結果
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">ファイルを選択</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileSelect}
                    className="border-2 text-sm file:mr-2 file:rounded file:border-0 file:bg-blue-50 file:px-2 file:py-1 file:text-xs file:text-blue-700 hover:file:bg-blue-100 focus:border-blue-500"
                  />
                  <FileText className="h-4 w-4 text-gray-400" />
                </div>
                {importFile && (
                  <p className="text-xs text-muted-foreground">
                    選択されたファイル: {importFile.name} ({Math.round(importFile.size / 1024)}KB)
                  </p>
                )}
              </div>

              {importType === "restore" && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                    <div className="text-xs text-red-800">
                      <p className="mb-1 font-bold">【重要】完全復元の確認</p>
                      <p>
                        この操作を実行すると、現在のデータベース内の**すべてのデータ（設定、プレイヤー、成績）が削除され**、
                        選択したバックグラウンドファイルの内容で完全に置き換えられます。
                      </p>
                      <p className="mt-1 font-semibold">この操作は取り消せません。</p>
                    </div>
                  </div>
                </div>
              )}

              {importType === "restore" ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={!importFile || isImporting}
                      className="w-full bg-gradient-to-r from-red-600 to-rose-700 text-sm transition-all duration-200 hover:from-red-700 hover:to-rose-800"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isImporting ? "復元中..." : "データベースを完全復元する"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>データベースの完全復元</AlertDialogTitle>
                      <AlertDialogDescription>
                        本当にデータベースを完全に復元しますか？既存のすべてのデータが削除され、選択したファイルの内容で上書きされます。この操作は取り消せません。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction onClick={handleImport} className="bg-red-600 text-white hover:bg-red-700">
                        実行する
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  onClick={handleImport}
                  disabled={!importFile || isImporting}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-sm transition-all duration-200 hover:from-blue-600 hover:to-purple-700"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isImporting ? "インポート中..." : "追加・上書きインポート"}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
