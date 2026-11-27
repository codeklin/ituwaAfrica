'use client'

import { useRef, useState, useTransition } from 'react'
import { CheckCircle, ChevronDown, ChevronUp, Send } from 'lucide-react'
import { submitChallengeAction } from '@/app/actions/progress'

interface ChallengeSubmitFormProps {
  practiceId: string
  initialResponse: string | null
}

export default function ChallengeSubmitForm({
  practiceId,
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
    return (
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
