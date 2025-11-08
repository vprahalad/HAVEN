"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import TopNav from "@/components/top-nav"
import ReportForm from "@/components/report-form"
import ReportResult from "@/components/report-result"

export default function ReportPage() {
  const router = useRouter()
  const [result, setResult] = useState<any>(null)

  const handleFormSubmit = (formResult: any) => {
    setResult(formResult)
  }

  const handleBackToMap = () => {
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <TopNav role="Citizen" />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {result ? (
            <ReportResult result={result} onBack={handleBackToMap} />
          ) : (
            <ReportForm onSubmit={handleFormSubmit} />
          )}
        </div>
      </div>
    </div>
  )
}
