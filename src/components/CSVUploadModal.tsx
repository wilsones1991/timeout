'use client'

import { useState, useRef } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onUpload: (students: { firstName: string; lastName: string }[]) => Promise<{ created: number; errors: { row: number; error: string }[] }>
}

export default function CSVUploadModal({ isOpen, onClose, onUpload }: Props) {
  const [csvText, setCsvText] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; errors: { row: number; error: string }[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function parseCSV(text: string): { firstName: string; lastName: string }[] {
    const lines = text.trim().split('\n')
    const students: { firstName: string; lastName: string }[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Skip header row if it looks like one
      if (i === 0 && line.toLowerCase().includes('first') && line.toLowerCase().includes('last')) {
        continue
      }

      // Parse CSV line (handle quoted values)
      const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || []
      const cleaned = values.map(v => v.replace(/^"|"$/g, '').trim())

      if (cleaned.length >= 2) {
        students.push({
          firstName: cleaned[0],
          lastName: cleaned[1]
        })
      }
    }

    return students
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvText(text)
    }
    reader.readAsText(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)

    const students = parseCSV(csvText)

    if (students.length === 0) {
      setError('No valid student data found. Please check your CSV format.')
      return
    }

    setIsLoading(true)

    try {
      const uploadResult = await onUpload(students)
      setResult(uploadResult)

      if (uploadResult.errors.length === 0) {
        // Auto-close after successful upload with no errors
        setTimeout(() => {
          handleClose()
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload students')
    } finally {
      setIsLoading(false)
    }
  }

  function handleClose() {
    setCsvText('')
    setError('')
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900">Import Students from CSV</h2>

        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-4">
            Upload a CSV file with student names. The file should have two columns:
            <strong> First Name</strong> and <strong>Last Name</strong>.
          </p>

          <div className="bg-gray-50 rounded-md p-3 mb-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Example format:</p>
            <pre className="text-xs text-gray-700">
              First Name,Last Name{'\n'}
              John,Smith{'\n'}
              Jane,Doe{'\n'}
              Alex,Johnson
            </pre>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {result && (
              <div className={`mb-4 px-4 py-3 rounded-md text-sm ${
                result.errors.length > 0
                  ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}>
                <p className="font-medium">
                  Successfully added {result.created} student{result.created !== 1 ? 's' : ''}!
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Errors:</p>
                    <ul className="list-disc list-inside">
                      {result.errors.map((err, i) => (
                        <li key={i}>Row {err.row}: {err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload CSV File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-light file:text-primary hover:file:bg-primary-lighter"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or paste CSV data directly
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="First Name,Last Name&#10;John,Smith&#10;Jane,Doe"
                rows={6}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary text-gray-900 text-sm font-mono"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                {result ? 'Close' : 'Cancel'}
              </button>
              {!result && (
                <button
                  type="submit"
                  disabled={isLoading || !csvText.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Uploading...' : 'Import Students'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
