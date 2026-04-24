"use client"

import { useState, useTransition } from "react"
import type { FeatureFlag } from "@/types/entities"

interface Props {
  flags: FeatureFlag[]
  actorId: string
}

export function AdminFlagsClient({ flags: initialFlags }: Props) {
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const toggle = (flag: FeatureFlag) => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/feature-flags/${flag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !flag.enabled }),
      })
      if (!res.ok) return
      const updated: FeatureFlag = await res.json()
      setFlags(prev => prev.map(f => (f.id === updated.id ? updated : f)))
    })
  }

  const deleteFlag = (flag: FeatureFlag) => {
    if (!confirm(`Delete flag "${flag.name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const res = await fetch(`/api/admin/feature-flags/${flag.id}`, { method: "DELETE" })
      if (!res.ok) return
      setFlags(prev => prev.filter(f => f.id !== flag.id))
    })
  }

  const createFlag = () => {
    setError(null)
    if (!newName.trim()) return
    startTransition(async () => {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
      })
      if (res.status === 409) { setError("A flag with that name already exists."); return }
      if (res.status === 400) { setError("Name must be lowercase letters, numbers, and hyphens only."); return }
      if (!res.ok) { setError("Something went wrong."); return }
      const created: FeatureFlag = await res.json()
      setFlags(prev => [...prev, created])
      setNewName("")
      setNewDesc("")
    })
  }

  return (
    <div className="space-y-8">
      {/* Create form */}
      <div className="border rounded-lg p-4 space-y-3">
        <h2 className="font-medium">New flag</h2>
        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-1.5 text-sm flex-1"
            placeholder="flag-name (lowercase, hyphens)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createFlag()}
          />
          <input
            className="border rounded px-3 py-1.5 text-sm flex-1"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createFlag()}
          />
          <button
            onClick={createFlag}
            disabled={isPending || !newName.trim()}
            className="px-4 py-1.5 text-sm bg-black text-white rounded disabled:opacity-40"
          >
            Create
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Flag table */}
      {flags.length === 0 ? (
        <p className="text-sm text-gray-500">No flags yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium">Global</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {flags.map(flag => (
              <tr key={flag.id} className="py-2">
                <td className="py-2 pr-4 font-mono">{flag.name}</td>
                <td className="py-2 pr-4 text-gray-600">{flag.description ?? "—"}</td>
                <td className="py-2 pr-4">
                  <button
                    onClick={() => toggle(flag)}
                    disabled={isPending}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-40 ${
                      flag.enabled ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        flag.enabled ? "translate-x-4.5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => deleteFlag(flag)}
                    disabled={isPending}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
