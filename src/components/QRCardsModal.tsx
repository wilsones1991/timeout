'use client'

import { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import { generateQRCodeDataURL } from '@/lib/qrcode'

type Student = {
  id: string
  firstName: string
  lastName: string
  cardId: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  students: Student[]
  classroomName: string
}

type QRCardData = {
  student: Student
  qrDataUrl: string
}

// Card dimensions in inches (standard business card)
const CARD_WIDTH_IN = 3.5
const CARD_HEIGHT_IN = 2

// PDF page dimensions (Letter size)
const PAGE_WIDTH_IN = 8.5

// Margins
const MARGIN_IN = 0.5

// Cards per page calculation
const CARDS_PER_ROW = 2
const CARDS_PER_COL = 5
const CARDS_PER_PAGE = CARDS_PER_ROW * CARDS_PER_COL

export default function QRCardsModal({ isOpen, onClose, students, classroomName }: Props) {
  const [qrCards, setQRCards] = useState<QRCardData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadQRCodes() {
      if (!isOpen || students.length === 0) return

      setIsLoading(true)
      try {
        const cards = await Promise.all(
          students.map(async (student) => ({
            student,
            qrDataUrl: await generateQRCodeDataURL(student.cardId)
          }))
        )
        setQRCards(cards)
        setSelectedStudents(new Set(students.map(s => s.id)))
      } catch (err) {
        console.error('Failed to generate QR codes:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadQRCodes()
  }, [isOpen, students])

  function toggleStudent(studentId: string) {
    setSelectedStudents(prev => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  function selectAll() {
    setSelectedStudents(new Set(students.map(s => s.id)))
  }

  function selectNone() {
    setSelectedStudents(new Set())
  }

  async function generatePDF() {
    const selectedCards = qrCards.filter(card => selectedStudents.has(card.student.id))
    if (selectedCards.length === 0) return

    setIsGeneratingPDF(true)

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
      })

      // Calculate positions for cards on the page
      const cardWidthPt = CARD_WIDTH_IN
      const cardHeightPt = CARD_HEIGHT_IN
      const startX = MARGIN_IN + (PAGE_WIDTH_IN - 2 * MARGIN_IN - CARDS_PER_ROW * cardWidthPt) / 2
      const startY = MARGIN_IN

      for (let i = 0; i < selectedCards.length; i++) {
        const { student, qrDataUrl } = selectedCards[i]
        const cardOnPage = i % CARDS_PER_PAGE
        const row = Math.floor(cardOnPage / CARDS_PER_ROW)
        const col = cardOnPage % CARDS_PER_ROW

        // Add new page if needed
        if (i > 0 && cardOnPage === 0) {
          pdf.addPage()
        }

        const x = startX + col * cardWidthPt
        const y = startY + row * cardHeightPt

        // Draw card border
        pdf.setDrawColor(200, 200, 200)
        pdf.setLineWidth(0.01)
        pdf.rect(x, y, cardWidthPt, cardHeightPt)

        // Add classroom name at top
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.text(classroomName, x + cardWidthPt / 2, y + 0.2, { align: 'center' })

        // Add QR code (centered)
        const qrSize = 1.2
        const qrX = x + (cardWidthPt - qrSize) / 2
        const qrY = y + 0.35
        pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

        // Add student name below QR code
        pdf.setFontSize(11)
        pdf.setTextColor(0, 0, 0)
        pdf.text(
          `${student.firstName} ${student.lastName}`,
          x + cardWidthPt / 2,
          y + cardHeightPt - 0.2,
          { align: 'center' }
        )
      }

      // Download the PDF
      const fileName = `${classroomName.replace(/[^a-z0-9]/gi, '_')}_QR_Cards.pdf`
      pdf.save(fileName)
    } catch (err) {
      console.error('Failed to generate PDF:', err)
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Generate QR Cards</h2>
            <p className="text-sm text-gray-500">{classroomName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {selectedStudents.size} of {students.length} selected
            </span>
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Select All
            </button>
            <button
              onClick={selectNone}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Select None
            </button>
          </div>
          <button
            onClick={generatePDF}
            disabled={isGeneratingPDF || selectedStudents.size === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded-md flex items-center gap-2"
          >
            {isGeneratingPDF ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="ml-3 text-gray-600">Generating QR codes...</span>
            </div>
          ) : qrCards.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No students to generate cards for.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {qrCards.map(({ student, qrDataUrl }) => (
                <div
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                    selectedStudents.has(student.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrDataUrl}
                      alt={`QR code for ${student.firstName} ${student.lastName}`}
                      className="w-24 h-24"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {student.firstName} {student.lastName}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {student.cardId.slice(0, 8)}...
                    </div>
                  </div>
                  {selectedStudents.has(student.id) && (
                    <div className="absolute top-2 right-2">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            Cards are formatted for standard business card paper (3.5&quot; x 2&quot;). Print 10 cards per page on Letter size paper.
          </p>
        </div>
      </div>
    </div>
  )
}
