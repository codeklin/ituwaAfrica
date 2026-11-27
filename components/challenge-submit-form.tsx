'use client'

import { useRef, useState, useTransition } from 'react'
import { CheckCircle, ChevronDown, ChevronUp, MessageCircle, Send } from 'lucide-react'
import { submitChallengeAction } from '@/app/actions/progress'

const WHATSAPP_NUMBER = '2347018643642'

interface ChallengeSubmitFormProps {
  practiceId: string
  practiceTitle: string
  initialResponse: string | null
}

export default function ChallengeSubmitForm({
  practiceId,
  practiceTitle,
  initialResponse,
}: ChallengeSubmitFormProps) {
  const [open, setOpen] = useState(!initialResponse)
  const [value, setValue] = useState(initialResponse ?? '')
  const [submitted, setSubmitted] = useState(!!initialResponse)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleToggle() {
    setOpen((prev) => !prev)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await submitChallengeAction({
        practiceId,
        response: value,
      })
      if (result.success) {
        setSubmitted(true)
        setOpen(false)
      } else {
        setError(result.error ?? 'Something went wrong. Please try again.')
      }
    })
  }

  if (submitted && !open) {
    const waMessage = encodeURIComponent(
      `Hi ituwaAfrica, I just completed the "${practiceTitle}" practice challenge:\n\n${value}`
    )
    const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`

    return (
      <div className="challenge-submitted-wrap">
        <div className="challenge-submitted-state">
          <div className="challenge-submitted-pill">
            <CheckCircle size={15} aria-hidden="true" />
            <span>Practice submitted</span>
          </div>
          <button
            type="button"
            className="challenge-edit-btn"
            onClick={handleToggle}
            aria-expanded={false}
          >
            Edit response <ChevronDown size={13} />
          </button>
        </div>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="challenge-share-wa-link"
        >
          <MessageCircle size={14} aria-hidden="true" />
          <span>Share your output on WhatsApp</span>
        </a>
      </div>
    )
  }

  return (
    <form className="challenge-submit-form" onSubmit={handleSubmit}>
      {submitted && (
        <div className="challenge-edit-header">
          <span className="challenge-submitted-pill">
            <CheckCircle size={13} aria-hidden="true" /> Submitted
          </span>
          <button
            type="button"
            className="challenge-edit-btn"
            onClick={handleToggle}
          >
            Collapse <ChevronUp size={13} />
          </button>
        </div>
      )}
      <label htmlFor={`response-${practiceId}`} className="challenge-textarea-label">
        Write your practice output below
      </label>
      <textarea
        id={`response-${practiceId}`}
        ref={textareaRef}
        className="challenge-textarea"
        placeholder="Describe what you did, what AI helped you produce, or paste the output here. Minimum 10 characters."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        maxLength={4000}
        required
        disabled={isPending}
        aria-describedby={error ? `error-${practiceId}` : undefined}
      />
      <div className="challenge-form-footer">
        <span className="challenge-char-count">{value.length} / 4000</span>
        {error && (
          <p id={`error-${practiceId}`} className="challenge-form-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="challenge-submit-btn"
          disabled={isPending || value.trim().length < 10}
        >
          {isPending ? (
            'Saving...'
          ) : (
            <>
              <Send size={14} aria-hidden="true" />
              {submitted ? 'Update response' : 'Submit practice'}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
