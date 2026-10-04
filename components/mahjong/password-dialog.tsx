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
  isSubmitting?: boolean
}

export default function PasswordDialog({
  isOpen,
  onOpenChange,
  passwordInput,
  setPasswordInput,
  onSubmit,
  isSubmitting = false,
}: PasswordDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-md border border-white/20 bg-white/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-blue-600" />
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
              onKeyDown={(e) => e.key === "Enter" && !isSubmitting && onSubmit()}
              disabled={isSubmitting}
              className="border-2 text-sm transition-colors duration-200 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-sm transition-all duration-200 hover:from-blue-600 hover:to-purple-700"
            >
              {isSubmitting ? "認証中..." : "認証"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-2 text-sm transition-colors duration-200 hover:bg-slate-50"
            >
              キャンセル
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
