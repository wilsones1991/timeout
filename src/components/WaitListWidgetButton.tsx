'use client'

type Props = {
  classroomId: string
}

export default function WaitListWidgetButton({ classroomId }: Props) {
  function openWidget() {
    window.open(
      `/classroom/${classroomId}/waitlist-widget`,
      'waitlist',
      'width=600,height=800,menubar=no,toolbar=no,location=no,status=no'
    )
  }

  return (
    <button
      onClick={openWidget}
      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      Wait List
    </button>
  )
}
