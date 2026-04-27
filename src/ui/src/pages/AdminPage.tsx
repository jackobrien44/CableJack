import { useState, type ChangeEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import type { ImportResult } from '../types/api'

export default function AdminPage() {
  const [m3uResult, setM3uResult] = useState<ImportResult | null>(null)
  const [epgResult, setEpgResult] = useState<ImportResult | null>(null)

  const importM3U = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/admin/channels/import', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<ImportResult>
    },
    onSuccess: setM3uResult,
  })

  const importEPG = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/epg/import', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<ImportResult>
    },
    onSuccess: setEpgResult,
  })

  function handleFile(
    e: ChangeEvent<HTMLInputElement>,
    mutate: (f: File) => void,
  ) {
    const file = e.target.files?.[0]
    if (file) mutate(file)
    e.target.value = ''
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-white mb-8">Admin</h1>

      <div className="space-y-6">
        <ImportCard
          title="Import M3U Playlist"
          description="Upload an .m3u or .m3u8 file to create or update channels."
          accept=".m3u,.m3u8"
          loading={importM3U.isPending}
          result={m3uResult}
          error={importM3U.error?.message}
          onFile={f => importM3U.mutate(f)}
        />

        <ImportCard
          title="Import EPG (XMLTV)"
          description="Upload an XMLTV file to populate programme listings."
          accept=".xml,.xmltv"
          loading={importEPG.isPending}
          result={epgResult}
          error={importEPG.error?.message}
          onFile={f => importEPG.mutate(f)}
        />
      </div>
    </div>
  )
}

interface ImportCardProps {
  title: string
  description: string
  accept: string
  loading: boolean
  result: ImportResult | null
  error?: string
  onFile: (f: File) => void
}

function ImportCard({ title, description, accept, loading, result, error, onFile }: ImportCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-5">
      <h2 className="text-white font-medium mb-1">{title}</h2>
      <p className="text-gray-400 text-sm mb-4">{description}</p>

      <label className={`inline-block cursor-pointer bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg transition-colors ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {loading ? 'Importing…' : 'Choose file'}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
            e.target.value = ''
          }}
        />
      </label>

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      {result && (
        <div className="mt-3 text-sm space-y-1">
          <p className="text-green-400">Import complete</p>
          <p className="text-gray-400">Channels created: {result.channelsCreated} · updated: {result.channelsUpdated} · categories: {result.categoriesCreated}</p>
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="text-yellow-400 cursor-pointer">{result.errors.length} warning{result.errors.length > 1 ? 's' : ''}</summary>
              <ul className="mt-1 space-y-0.5 text-gray-500 text-xs">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
