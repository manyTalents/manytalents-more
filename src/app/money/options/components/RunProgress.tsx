"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"

const STAGES = [
  "Starting analysis...",
  "Scanning macro conditions...",
  "Analyzing unusual options flow...",
  "Reviewing fundamentals & catalysts...",
  "Scoring confidence & risk...",
  "Ranking recommendations...",
]

interface Props {
  isReal: boolean
  runId?: string | null
  onComplete?: () => void
  onError?: (message: string) => void
}

export default function RunProgress({ isReal, runId, onComplete, onError }: Props) {
  const [stageIndex, setStageIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const completedRef = useRef(false)

  // Real run: poll Supabase for analysis_runs status
  useEffect(() => {
    if (!isReal || !runId) return
    completedRef.current = false

    const poll = setInterval(async () => {
      if (completedRef.current) return

      try {
        const { data } = await supabase
          .from("analysis_runs")
          .select("status, started_at, completed_at, error_message")
          .eq("id", runId)
          .single()

        if (!data) return

        // Advance stage based on elapsed time (~30s per stage)
        if (data.started_at) {
          const elapsed = Date.now() - new Date(data.started_at).getTime()
          const idx = Math.min(
            Math.floor(elapsed / 30000) + 1,
            STAGES.length - 1
          )
          setStageIndex(idx)
          setProgress(Math.min(92, (elapsed / 180000) * 100))
        }

        if (data.status === "done" || data.status === "completed") {
          completedRef.current = true
          setProgress(100)
          setStageIndex(STAGES.length - 1)
          clearInterval(poll)
          setTimeout(() => onComplete?.(), 600)
        } else if (data.status === "error" || data.status === "failed") {
          completedRef.current = true
          clearInterval(poll)
          onError?.(
            `Analysis failed: ${data.error_message || "Unknown error"}`
          )
        }
      } catch {
        // Silently retry on network blips
      }
    }, 3000)

    return () => clearInterval(poll)
  }, [isReal, runId, onComplete, onError])

  // Real run without runId yet: show "Starting..." with slow progress
  useEffect(() => {
    if (!isReal || runId) return
    const timer = setInterval(() => {
      setProgress((p) => Math.min(p + 0.5, 10))
    }, 500)
    return () => clearInterval(timer)
  }, [isReal, runId])

  // Cached run: simulated progress (30-40s)
  useEffect(() => {
    if (isReal) return

    const totalDuration = 30000 + Math.random() * 10000
    const stageInterval = totalDuration / (STAGES.length - 1)
    const progressInterval = 200

    // Start from stage 1 (skip "Starting analysis...")
    setStageIndex(1)

    const stageTimer = setInterval(() => {
      setStageIndex((prev) => {
        if (prev >= STAGES.length - 1) {
          clearInterval(stageTimer)
          return prev
        }
        return prev + 1
      })
    }, stageInterval)

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (100 / (totalDuration / progressInterval))
        if (next >= 100) {
          clearInterval(progressTimer)
          onComplete?.()
          return 100
        }
        return next
      })
    }, progressInterval)

    return () => {
      clearInterval(stageTimer)
      clearInterval(progressTimer)
    }
  }, [isReal, onComplete])

  return (
    <div className="rounded-xl border border-navy-border bg-navy-card/50 p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="h-10 w-10 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>

      <p className="text-sm text-cream font-medium mb-2">
        {STAGES[stageIndex]}
      </p>

      <div className="w-full h-1.5 bg-navy-border rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gold rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      {isReal && (
        <p className="text-xs text-neutral-400 mb-2">
          This takes 2–3 minutes while our AI agents research the market.
        </p>
      )}

      <p className="text-xs text-neutral-500 italic">
        Not investment advice. May aid research only.
      </p>
    </div>
  )
}
