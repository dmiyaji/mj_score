"use client"
import { useState } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, Download, Upload, FileText, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { exportOperations, importOperations } from "@/lib/database"

interface DataManagementProps {
  onDataUpdate: () => void
}

export default function DataManagement({ onDataUpdate }: DataManagementProps) {
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json")
  const [exportTable, setExportTable] = useState<"teams" | "players" | "gameResults">("teams")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importType, setImportType] = useState<"teams" | "players" | "gameResults">("teams")
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const { toast } = useToast()

  // データエクスポート
  const handleExport = async () => {
    setIsExporting(true)
    try {
      if (exportFormat === "json") {
        const data = await exportOperations.exportAllData()
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
        const csvData = await exportOperations.exportToCSV(exportTable)
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
        description: "データのエクスポートに失敗しました",
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

      if (importFile.name.endsWith(".json")) {
        const data = JSON.parse(fileContent)

        if (importType === "teams" && data.teams) {
          await importOperations.importTeams(data.teams)
        } else if (importType === "players" && data.players) {
          await importOperations.importPlayers(data.players)
        } else if (importType === "gameResults" && data.gameResults) {
          await importOperations.importGameResults(data.gameResults)
        } else {
          throw new Error("インポートするデータが見つかりません")
        }
      } else if (importFile.name.endsWith(".csv")) {
        const parsedData = importOperations.parseCSV(fileContent, importType)

        if (importType === "teams") {
          await importOperations.importTeams(parsedData)
        } else if (importType === "players") {
          await importOperations.importPlayers(parsedData)
        } else if (importType === "gameResults") {
          await importOperations.importGameResults(parsedData)
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
    <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-xl">
      <CardHeader className="pb-3 sm:pb-6 bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <div className="p-2 bg-gradient-to-r from-slate-500 to-gray-600 rounded-lg shadow-lg">
            <Database className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          データ管理
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">データのエクスポート・インポート機能</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/50 backdrop-blur-sm border border-white/20">
            <TabsTrigger
              value="export"
              className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              エクスポート
            </TabsTrigger>
            <TabsTrigger
              value="import"
              className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              インポート
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">エクスポート形式</Label>
                <Select value={exportFormat} onValueChange={(value: "json" | "csv") => setExportFormat(value)}>
                  <SelectTrigger className="text-sm border-2 focus:border-green-500">
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
                    <SelectTrigger className="text-sm border-2 focus:border-green-500">
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
                className="w-full text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? "エクスポート中..." : "エクスポート"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800">
                    <p className="font-medium mb-1">注意事項</p>
                    <ul className="space-y-1 text-xs">
                      <li>• インポート前に必ずデータをバックアップしてください</li>
                      <li>• 同じ名前のデータが存在する場合はエラーになります</li>
                      <li>• CSVファイルは適切な形式である必要があります</li>
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
                  <SelectTrigger className="text-sm border-2 focus:border-blue-500">
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

              <div className="space-y-2">
                <Label className="text-sm font-medium">ファイルを選択</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileSelect}
                    className="text-sm border-2 focus:border-blue-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>
                {importFile && (
                  <p className="text-xs text-muted-foreground">
                    選択されたファイル: {importFile.name} ({Math.round(importFile.size / 1024)}KB)
                  </p>
                )}
              </div>

              <Button
                onClick={handleImport}
                disabled={!importFile || isImporting}
                className="w-full text-sm bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isImporting ? "インポート中..." : "インポート"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
