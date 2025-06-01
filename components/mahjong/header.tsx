"use client"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Users, User, Lock, History, Database, Share2, ExternalLink, CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

interface HeaderProps {
  currentView: string
  onTabChange: (value: string) => void
  publicRankingTitle: string
  setPublicRankingTitle: (title: string) => void
  publicRankingDate: Date
  setPublicRankingDate: (date: Date) => void
  previousSessionDate: Date | undefined
  setPreviousSessionDate: (date: Date | undefined) => void
  isPublicRankingDialogOpen: boolean
  setIsPublicRankingDialogOpen: (open: boolean) => void
  onGeneratePublicRanking: () => void
}

export default function Header({
  currentView,
  onTabChange,
  publicRankingTitle,
  setPublicRankingTitle,
  publicRankingDate,
  setPublicRankingDate,
  previousSessionDate,
  setPreviousSessionDate,
  isPublicRankingDialogOpen,
  setIsPublicRankingDialogOpen,
  onGeneratePublicRanking,
}: HeaderProps) {
  const DatePicker = ({
    date,
    onDateChange,
    placeholder,
  }: {
    date: Date | undefined
    onDateChange: (date: Date | undefined) => void
    placeholder: string
  }) => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-start text-left font-normal text-xs sm:text-sm h-10 border-2 focus:border-blue-500 ${
              !date && "text-muted-foreground"
            }`}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "yyyy/MM/dd", { locale: ja }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={onDateChange} initialFocus locale={ja} />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div className="mb-6 sm:mb-8">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white rounded-xl shadow-lg border border-gray-100">
            <img
              src="/images/nine-league-logo.webp"
              alt="Nine League Logo"
              className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ナインリーグ成績入力
            </h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={isPublicRankingDialogOpen} onOpenChange={setIsPublicRankingDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm h-10 border-2 hover:bg-green-50 hover:border-green-300 transition-all duration-200"
                >
                  <Share2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  公開ランキング
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[90vw] max-w-md bg-white/95 backdrop-blur-sm border border-white/20">
                <DialogHeader>
                  <DialogTitle className="text-lg flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-green-600" />
                    公開ランキング生成
                  </DialogTitle>
                  <DialogDescription className="text-sm">外部公開用のランキングページを生成します</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ranking-title" className="text-sm font-medium">
                      タイトル
                    </Label>
                    <Input
                      id="ranking-title"
                      placeholder="DAY 22"
                      value={publicRankingTitle}
                      onChange={(e) => setPublicRankingTitle(e.target.value)}
                      className="text-sm border-2 focus:border-green-500 transition-colors duration-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">開催日</Label>
                    <DatePicker
                      date={publicRankingDate}
                      onDateChange={(date) => setPublicRankingDate(date || new Date())}
                      placeholder="開催日を選択"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">前節基準日（今節ポイント計算用）</Label>
                    <DatePicker
                      date={previousSessionDate}
                      onDateChange={setPreviousSessionDate}
                      placeholder="前節基準日を選択（任意）"
                    />
                    {previousSessionDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviousSessionDate(undefined)}
                        className="h-6 text-xs text-gray-500 hover:text-red-600"
                      >
                        <X className="w-3 h-3 mr-1" />
                        クリア
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={onGeneratePublicRanking}
                      className="flex-1 text-sm bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      生成
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsPublicRankingDialogOpen(false)}
                      className="text-sm border-2 hover:bg-slate-50 transition-colors duration-200"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <Tabs value={currentView} onValueChange={onTabChange}>
            <TabsList className="grid grid-cols-3 sm:grid-cols-7 w-full min-w-[700px] sm:min-w-0 bg-white/50 backdrop-blur-sm border border-white/20">
              <TabsTrigger
                value="input"
                className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
              >
                成績入力
              </TabsTrigger>
              <TabsTrigger
                value="playerRanking"
                className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
              >
                プレイヤー
              </TabsTrigger>
              <TabsTrigger
                value="teamRanking"
                className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
              >
                チーム
              </TabsTrigger>
              <TabsTrigger
                value="playerManagement"
                className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
              >
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">プレイヤー管理</span>
                  <span className="sm:hidden">P管理</span>
                  <Lock className="w-2 h-2 sm:w-3 sm:h-3" />
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="teamManagement"
                className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
              >
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">チーム管理</span>
                  <span className="sm:hidden">T管理</span>
                  <Lock className="w-2 h-2 sm:w-3 sm:h-3" />
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="gameHistory"
                className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
              >
                <div className="flex items-center gap-1">
                  <History className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">過去の成績</span>
                  <span className="sm:hidden">履歴</span>
                  <Lock className="w-2 h-2 sm:w-3 sm:h-3" />
                </div>
              </TabsTrigger>
              <TabsTrigger
                value="dataManagement"
                className="text-xs sm:text-sm px-1 sm:px-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-200"
              >
                <div className="flex items-center gap-1">
                  <Database className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">データ管理</span>
                  <span className="sm:hidden">DB</span>
                  <Lock className="w-2 h-2 sm:w-3 sm:h-3" />
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
