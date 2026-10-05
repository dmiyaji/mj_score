"use client"

import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { authApi } from "@/lib/api-client"

const ADMIN_VIEWS = ["playerManagement", "teamManagement", "gameHistory", "dataManagement", "seasonManagement"]

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingView, setPendingView] = useState("")
  const { toast } = useToast()

  // ログイン状態はサーバーの Cookie で管理しているため、起動時に確認する
  useEffect(() => {
    authApi
      .me()
      .then(({ authenticated }) => setIsAuthenticated(authenticated))
      .catch(() => setIsAuthenticated(false))
  }, [])

  const requiresAuth = (view: string) => ADMIN_VIEWS.includes(view)

  /** ログインに成功したら、開こうとしていた画面を返す */
  const handlePasswordSubmit = async (): Promise<string | null> => {
    if (isSubmitting) return null
    setIsSubmitting(true)
    try {
      await authApi.login(passwordInput)
      setIsAuthenticated(true)
      setIsPasswordDialogOpen(false)
      toast({
        title: "認証成功",
        description: "管理画面にアクセスできます",
      })
      return pendingView
    } catch (error) {
      toast({
        title: "認証失敗",
        description: error instanceof Error ? error.message : "パスワードが正しくありません",
        variant: "destructive",
      })
      return null
    } finally {
      setPasswordInput("")
      setIsSubmitting(false)
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      setIsAuthenticated(false)
      toast({ title: "ログアウトしました" })
    }
  }

  const handleTabChange = <T extends string>(value: T): T | null => {
    if (requiresAuth(value) && !isAuthenticated) {
      setPendingView(value)
      setIsPasswordDialogOpen(true)
      return null
    }
    return value
  }

  return {
    isAuthenticated,
    passwordInput,
    setPasswordInput,
    isPasswordDialogOpen,
    setIsPasswordDialogOpen,
    isSubmitting,
    handlePasswordSubmit,
    handleTabChange,
    requiresAuth,
    logout,
  }
}
