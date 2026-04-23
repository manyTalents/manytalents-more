"use client"

import { useState } from "react"
import { optionsApi } from "@/lib/options-api"
import { setAdmin } from "@/lib/options-access"

interface Props {
  onSuccess: () => void
}

export default function AdminLogin({ onSuccess }: Props) {
  const [show, setShow] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(false)
    try {
      const { valid } = await optionsApi.verifyAdmin(password)
      if (valid) {
        setAdmin()
        onSuccess()
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    }
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="text-neutral-600 hover:text-neutral-400 text-xs transition"
      >
        Admin
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="px-3 py-1 text-xs rounded-lg bg-navy-card border border-navy-border text-cream w-40 focus:outline-none focus:border-gold/50"
        autoFocus
      />
      <button
        type="submit"
        className="px-3 py-1 text-xs rounded-lg bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition"
      >
        Enter
      </button>
      {error && <span className="text-xs text-red-400">Invalid</span>}
    </form>
  )
}
