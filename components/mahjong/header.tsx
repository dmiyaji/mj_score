"use client"
import { useState } from "react"
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
import {
  Users,
  User,
  History,
  Database,
  Share2,
  ExternalLink,
  CalendarIcon,
  X,
  Settings,
  ChevronRight,
  Lock,
  CalendarRange,
} from "lucide-react"
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
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false)

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
            className={`h-10 w-full justify-start border-2 text-left text-xs font-normal focus:border-blue-500 sm:text-sm ${
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

  // 管理者メニューのアイテム
  const adminMenuItems = [
    {
      id: "playerManagement",
      label: "チーム・プレイヤー管理",
      icon: Users,
      description: "チーム・プレイヤーの追加・編集・削除",
    },
    {
      id: "gameHistory",
      label: "過去の成績",
      icon: History,
      description: "ゲーム履歴の確認・削除",
    },
    {
      id: "seasonManagement",
      label: "シーズン管理",
      icon: CalendarRange,
      description: "シーズン追加・設定・ステージ切替",
    },
    {
      id: "dataManagement",
      label: "データ管理",
      icon: Database,
      description: "データのエクスポート・インポート",
    },
  ]

  return (
    <div className="relative mb-6 sm:mb-8">
      <div className="rounded-2xl border border-white/20 bg-white/80 p-6 shadow-xl backdrop-blur-sm sm:p-8">
        <div className="mb-4 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="shrink-0 rounded-lg border border-gray-100 bg-white p-1.5 shadow-lg sm:rounded-xl sm:p-2">
              <img
                src="/images/nine-league-logo.webp"
                alt="Nine League Logo"
                className="h-9 w-9 object-contain sm:h-16 sm:w-16"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-[16px] font-extrabold leading-[1.15] tracking-tight text-transparent sm:text-4xl sm:leading-normal">
                <span className="block sm:inline">ナインリーグ</span>
                <span className="block sm:inline">成績入力</span>
              </h1>
            </div>
          </div>

          {/* 右上のメニューエリア */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {/* 管理者メニューボタン */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
              className="h-10 w-10 rounded-full p-0 text-gray-400 transition-all duration-200 hover:bg-gray-50 hover:text-gray-600"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 基本タブ（成績入力、プレイヤー、チーム） */}
        <div className="w-full overflow-x-auto">
          <Tabs value={currentView} onValueChange={onTabChange}>
            <TabsList className="grid w-full grid-cols-3 border border-white/20 bg-white/50 backdrop-blur-sm">
              <TabsTrigger
                value="input"
                className="px-3 text-xs transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white sm:text-sm"
              >
                成績入力
              </TabsTrigger>
              <TabsTrigger
                value="playerRanking"
                className="px-3 text-xs transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white sm:text-sm"
              >
                個人ランキング
              </TabsTrigger>
              <TabsTrigger
                value="teamRanking"
                className="px-3 text-xs transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white sm:text-sm"
              >
                チームランキング
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 管理者メニューのスライドイン */}
      <div
        className={`absolute right-0 top-0 z-50 transition-all duration-300 ease-in-out ${
          isAdminMenuOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0"
        }`}
      >
        <div className="mt-2 min-w-[280px] rounded-2xl border border-white/20 bg-white/95 p-4 shadow-2xl backdrop-blur-sm">
          {/* ヘッダー */}
          <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-semibold text-gray-700">管理者メニュー</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdminMenuOpen(false)}
              className="h-6 w-6 rounded-full p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* メニューアイテム */}
          <div className="space-y-2">
            {/* 公開用ランキング生成 */}
            <Dialog
              open={isPublicRankingDialogOpen}
              onOpenChange={(open) => {
                setIsPublicRankingDialogOpen(open)
                // ダイアログが開くときに管理者メニューの親パネルを閉じる
                if (open) setIsAdminMenuOpen(false)
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="group h-auto w-full justify-start p-3 text-left transition-all duration-200 hover:bg-green-50"
                >
                  <div className="flex w-full items-center gap-3">
                    <div className="rounded-lg bg-green-100 p-1.5 transition-colors duration-200 group-hover:bg-green-200">
                      <Share2 className="h-4 w-4 text-green-600 group-hover:text-green-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-gray-700 group-hover:text-green-700">
                        公開ランキング生成
                      </div>
                      <div className="truncate text-[10px] text-gray-500">外部シェア用の専用画面を作成</div>
                    </div>
                    <ChevronRight className="h-3 w-3 text-gray-400 transition-colors duration-200 group-hover:text-green-500" />
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[90vw] max-w-md border border-white/20 bg-white/95 backdrop-blur-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <Share2 className="h-5 w-5 text-green-600" />
                    公開用ランキング生成
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
                      className="border-2 text-sm transition-colors duration-200 focus:border-green-500"
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
                        <X className="mr-1 h-3 w-3" />
                        クリア
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={onGeneratePublicRanking}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-sm transition-all duration-200 hover:from-green-600 hover:to-emerald-700"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      生成
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsPublicRankingDialogOpen(false)}
                      className="border-2 text-sm transition-colors duration-200 hover:bg-slate-50"
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {adminMenuItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => {
                    onTabChange(item.id)
                    setIsAdminMenuOpen(false)
                  }}
                  className="group h-auto w-full justify-start p-3 text-left transition-all duration-200 hover:bg-gray-50"
                >
                  <div className="flex w-full items-center gap-3">
                    <div className="rounded-lg bg-gray-100 p-1.5 transition-colors duration-200 group-hover:bg-blue-100">
                      <Icon className="h-3 w-3 text-gray-600 group-hover:text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-gray-700 group-hover:text-blue-700">{item.label}</div>
                      <div className="truncate text-[10px] text-gray-500">{item.description}</div>
                    </div>
                    <ChevronRight className="h-3 w-3 text-gray-400 transition-colors duration-200 group-hover:text-blue-500" />
                  </div>
                </Button>
              )
            })}
          </div>

          {/* フッター */}
          <div className="mt-4 border-t border-gray-200 pt-3">
            <p className="text-center text-[10px] text-gray-400">パスワード認証が必要です</p>
          </div>
        </div>
      </div>

      {/* オーバーレイ（メニューが開いているときの背景クリック用） */}
      {isAdminMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm" onClick={() => setIsAdminMenuOpen(false)} />
      )}
    </div>
  )
}
