'use client'

import { useState } from 'react'
import { Check, Copy, LockKeyhole, Play } from 'lucide-react'
import type { ToolDefinition } from '../lib/tools'
import { getCheckerFields } from '../lib/checker-fields'
import { useTranslations } from './i18n-provider'

type CheckerResult = { text: string; rows?: { label: string; value: string }[] }

export function CheckerWorkbench({ tool }: { tool: ToolDefinition }) {
  const { dict } = useTranslations()
  const fields = getCheckerFields(tool.slug)
  const [values, setValues] = useState<Record<string, string>>({})
  const [result, setResult] = useState<CheckerResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const setValue = (id: string, value: string) => setValues((current) => ({ ...current, [id]: value }))

  const run = async () => {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const response = await fetch(`/api/checker/${tool.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || dict.checker.error)
      setResult(data as CheckerResult)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : dict.checker.error)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!result?.text) return
    await navigator.clipboard.writeText(result.text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <>
      <section className="workspace-heading">
        <div><div className="tool-icon" /><h1>{tool.name}</h1><p>{tool.description}</p></div>
      </section>
      <section className="tool-panel">
        <form className="checker-form" onSubmit={(event) => { event.preventDefault(); if (!busy) run() }}>
          {fields.map((field) => (
            <div className="tool-field" key={field.id}>
              <label>{dict.checker.fields[field.labelKey]}</label>
              <input
                type={field.type}
                value={values[field.id] ?? ''}
                placeholder={field.placeholder}
                onChange={(event) => setValue(field.id, event.target.value)}
                inputMode={field.type === 'number' ? 'numeric' : undefined}
              />
            </div>
          ))}
          <div className="panel-footer">
            <span><LockKeyhole size={13} /> {dict.checker.runsOnServer}</span>
            <button type="submit" className="primary-button" disabled={busy}>
              <Play size={14} /> {busy ? dict.common.processing : dict.checker.check}
            </button>
          </div>
        </form>

        {error && <div className="pdf-status pdf-status-error" role="alert">{error}</div>}

        {result && (
          <div className="checker-result">
            {result.rows && result.rows.length > 0 ? (
              <table className="checker-table">
                <tbody>
                  {result.rows.map((row, index) => (
                    <tr key={index}><th>{row.label}</th><td>{row.value}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="checker-text-head">
                <span>{dict.workbench.resultLabel}</span>
                <button type="button" className="icon-button" onClick={copy} title={dict.common.copyResult}>{copied ? <Check size={15} /> : <Copy size={15} />}</button>
              </div>
            )}
            <textarea className="image-tool-output" value={result.text} readOnly spellCheck={false} />
          </div>
        )}
      </section>
      <div className="workspace-footnote"><LockKeyhole size={14} /> {dict.workbench.noAccountRequired} <span /> {dict.checker.privacyNote}</div>
    </>
  )
}
