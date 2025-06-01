"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

const ADMIN_PASSWORD = "nine"

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [pendingView, setPendingView] = useState("")
  const { toast } = useToast()

  const requiresAuth = (view: string) => {
    return ["playerManagement", "teamManagement", "gameHistory", "dataManagement"].includes(view)
  }

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      setIsPasswordDialogOpen(false)
      setPasswordInput("")
      toast({
        title: "認証成功",
        description: "管理画面にアクセスできます",
      })
      return pendingView
    } else {
      toast({
        title: "認証失敗",
        description: "パスワードが正しくありません",
        variant: "destructive",
      })
      setPasswordInput("")
      return null
    }
  }

  const handleTabChange = (value: string) => {
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
    handlePasswordSubmit,
    handleTabChange,
    requiresAuth,
  }
}
