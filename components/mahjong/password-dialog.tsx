"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock } from "lucide-react"

interface PasswordDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  passwordInput: string
  setPasswordInput: (password: string) => void
  onSubmit: () => void
}

export default function PasswordDialog({
  isOpen,
  onOpenChange,
  passwordInput,
  setPasswordInput,
  onSubmit,
}: PasswordDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-md bg-white/95 backdrop-blur-sm border border-white/20">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            管理画面へのアクセス
          </DialogTitle>
          <DialogDescription className="text-sm">管理画面にアクセスするにはパスワードが必要です</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              パスワード
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="パスワードを入力"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              className="text-sm border-2 focus:border-blue-500 transition-colors duration-200"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onSubmit}
              className="flex-1 text-sm bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
            >
              認証
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-sm border-2 hover:bg-slate-50 transition-colors duration-200"
            >
              キャンセル
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
