'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Copy, Download, Eraser, FileText, LockKeyhole, Play, UploadCloud, X } from 'lucide-react'
import type { ToolDefinition } from '../lib/tools'
import { getPdfFields, type PdfField } from '../lib/pdf-fields'
import { runPdfTool, type PdfResult, type PdfValues } from '../lib/pdf-tools'
import { ThemeToggle } from './theme-toggle'
import { ToolIcon } from './tool-icon'
import { LanguageSwitcher } from './language-switcher'
import { useTranslations } from './i18n-provider'
import type { Dictionary } from '../lib/i18n'

type FieldValue = string | File | File[] | null

export function PdfWorkbench({ tool }: { tool: ToolDefinition }) {
  const { dict } = useTranslations()
  const tc = (name: string) => dict.categories[name as keyof Dictionary['categories']] ?? name
  const fields = useMemo(() => getPdfFields(tool.slug), [tool.slug])
  const [values, setValues] = useState<Record<string, FieldValue>>(() => {
    const initial: Record<string, FieldValue> = {}
    for (const field of fields) if (field.defaultValue !== undefined) initial[field.id] = field.defaultValue
    return initial
  })
  const [signatureData, setSignatureData] = useState<string>('')
  const [status, setStatus] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<PdfResult | null>(null)
  const [copied, setCopied] = useState(false)

  // Revoke object URLs when the result changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (result?.download?.blob) { /* blob URLs are created on demand below */ }
      result?.images?.forEach((image) => URL.revokeObjectURL(image.url))
    }
  }, [result])

  const setValue = (id: string, value: FieldValue) => setValues((current) => ({ ...current, [id]: value }))

  const run = async () => {
    setStatus({ type: 'info', message: dict.pdf.processing })
    setResult(null)
    setRunning(true)
    try {
      const payload: PdfValues = { ...values }
      if (signatureData) payload.signature_data = signatureData
      const output = await runPdfTool(tool.slug, payload, tool.slug)
      setResult(output)
      setStatus({ type: 'success', message: dict.pdf.completed })
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : dict.pdf.error })
    } finally {
      setRunning(false)
    }
  }

  const copyText = async () => {
    if (!result?.text) return
    await navigator.clipboard.writeText(result.text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <main className="workspace-page">
      <header className="workspace-nav shell">
        <a href="/" className="brand"><span>W</span> magicwebtools</a>
        <a href="/tools" className="back-link"><ArrowLeft size={15} /> {dict.common.allTools}</a>
        <div className="privacy-pill"><LockKeyhole size={13} /> {dict.pdf.runsInBrowser}</div><ThemeToggle /><LanguageSwitcher />
      </header>
      <div className="workspace-shell">
        <div className="workspace-breadcrumb">{tc(tool.category)} <span>/</span> {tool.name}</div>
        <section className="workspace-heading">
          <div><div className="tool-icon"><ToolIcon icon={tool.icon} size={22} /></div><h1>{tool.name}</h1><p>{tool.description}</p></div>
        </section>

        <section className="tool-panel pdf-panel">
          <form
            className="pdf-form"
            onSubmit={(event) => { event.preventDefault(); if (!running) run() }}
          >
            {fields.map((field) => (
              <PdfFieldControl
                key={field.id}
                field={field}
                value={values[field.id] ?? ''}
                onChange={(value) => setValue(field.id, value)}
                signatureData={signatureData}
                onSignatureChange={setSignatureData}
              />
            ))}
            <div className="panel-footer">
              <span><LockKeyhole size={13} /> {dict.pdf.processedLocally}</span>
              <button type="submit" className="primary-button" disabled={running}>
                <Play size={14} /> {running ? dict.common.processing : dict.common.runTool}
              </button>
            </div>
          </form>

          {status && (
            <div className={`pdf-status pdf-status-${status.type}`} role="status">{status.message}</div>
          )}

          {result && (
            <div className="pdf-result">
              {result.download && (
                <a className="primary-button" href={URL.createObjectURL(result.download.blob)} download={result.download.filename}>
                  <Download size={15} /> {dict.pdf.download} {result.download.filename}
                </a>
              )}
              {result.text !== undefined && (
                <div className="pdf-text-result">
                  <div className="editor-column">
                    <label className="editor-label">{dict.pdf.resultLabel} <button type="button" className="icon-button" onClick={copyText} title={dict.common.copyResult}>{copied ? <Check size={15} /> : <Copy size={15} />}</button></label>
                    <textarea value={result.text} readOnly spellCheck={false} />
                  </div>
                </div>
              )}
              {result.images && result.images.length > 0 && (
                <div className="pdf-image-grid">
                  {result.images.map((image, index) => (
                    <figure key={index}><img src={image.url} alt={image.label} /><figcaption>{image.label}</figcaption></figure>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
        <div className="workspace-footnote"><LockKeyhole size={14} /> {dict.pdf.noAccountRequired} <span /> {dict.pdf.filesStay}</div>
      </div>
    </main>
  )
}

function PdfFieldControl({ field, value, onChange, signatureData, onSignatureChange }: {
  field: PdfField
  value: FieldValue
  onChange: (value: FieldValue) => void
  signatureData: string
  onSignatureChange: (value: string) => void
}) {
  const { dict } = useTranslations()
  const label = field.label + (field.optional ? ` (${dict.pdf.optional})` : '')

  switch (field.type) {
    case 'pdf_file':
    case 'file':
      return (
        <div className="tool-field">
          <label>{label}</label>
          <FileDropzone
            accept={field.accept}
            multiple={false}
            value={value instanceof File ? [value] : []}
            onChange={(files) => onChange(files[0] ?? null)}
          />
          {field.help && <small className="field-help">{field.help}</small>}
        </div>
      )
    case 'pdf_files':
    case 'image_files':
      return (
        <div className="tool-field">
          <label>{label}</label>
          <FileDropzone
            accept={field.accept}
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(files) => onChange(files)}
          />
          {field.help && <small className="field-help">{field.help}</small>}
        </div>
      )
    case 'text':
    case 'password':
      return (
        <div className="tool-field">
          <label>{label}</label>
          <input type={field.type === 'password' ? 'password' : 'text'} value={typeof value === 'string' ? value : ''} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} />
          {field.help && <small className="field-help">{field.help}</small>}
        </div>
      )
    case 'textarea':
      return (
        <div className="tool-field">
          <label>{label}</label>
          <textarea value={typeof value === 'string' ? value : ''} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} />
        </div>
      )
    case 'number':
      return (
        <div className="tool-field">
          <label>{label}</label>
          <input type="number" value={typeof value === 'string' ? value : ''} min={field.min} max={field.max} step={field.step} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} />
        </div>
      )
    case 'select':
      return (
        <div className="tool-field">
          <label>{label}</label>
          <select value={typeof value === 'string' ? value : field.defaultValue ?? ''} onChange={(event) => onChange(event.target.value)}>
            {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      )
    case 'signature':
      return (
        <SignatureField
          label={label}
          accept={field.accept}
          signatureData={signatureData}
          onSignatureChange={onSignatureChange}
          onFileChange={(file) => onChange(file)}
        />
      )
    default:
      return null
  }
}

function humanFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function FileDropzone({ accept, multiple, value, onChange }: {
  accept?: string
  multiple: boolean
  value: File[]
  onChange: (files: File[]) => void
}) {
  const { dict } = useTranslations()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const addFiles = (incoming: FileList | null) => {
    const list = Array.from(incoming ?? [])
    if (!list.length) return
    onChange(multiple ? [...value, ...list] : [list[0]])
  }

  const removeAt = (index: number) => {
    const next = value.filter((_, current) => current !== index)
    onChange(next)
    if (!next.length && inputRef.current) inputRef.current.value = ''
  }

  const openPicker = () => inputRef.current?.click()

  return (
    <div className="file-dropzone-wrap">
      <div
        className={`file-dropzone${dragging ? ' is-dragging' : ''}`}
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPicker() } }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files) }}
      >
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} hidden onChange={(event) => { addFiles(event.target.files); if (event.target) event.target.value = '' }} />
        <span className="file-dropzone-icon"><UploadCloud size={22} /></span>
        <strong>{dict.pdf.dropTitle}</strong>
        <span className="file-dropzone-hint">{dict.pdf.dropHint}</span>
      </div>

      {value.length > 0 && (
        <ul className="file-list">
          {value.map((file, index) => (
            <li key={`${file.name}-${index}`} className="file-list-item">
              <span className="file-list-icon"><FileText size={15} /></span>
              <span className="file-list-name">{file.name}</span>
              <span className="file-list-size">{humanFileSize(file.size)}</span>
              <button type="button" className="file-list-remove" onClick={() => removeAt(index)} aria-label={dict.pdf.remove} title={dict.pdf.remove}><X size={14} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SignatureField({ label, accept, onSignatureChange, onFileChange }: {
  label: string
  accept?: string
  signatureData: string
  onSignatureChange: (value: string) => void
  onFileChange: (file: File | null) => void
}) {
  const { dict } = useTranslations()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const hasInk = useRef(false)

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const bounds = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    }
  }

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    const canvas = canvasRef.current!
    const context = canvas.getContext('2d')!
    drawing.current = true
    hasInk.current = true
    canvas.setPointerCapture(event.pointerId)
    const position = point(event)
    context.beginPath()
    context.moveTo(position.x, position.y)
    context.lineWidth = 3
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#111111'
    context.lineTo(position.x + 0.01, position.y + 0.01)
    context.stroke()
  }

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    event.preventDefault()
    const context = canvasRef.current!.getContext('2d')!
    const position = point(event)
    context.lineTo(position.x, position.y)
    context.stroke()
  }

  const end = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    drawing.current = false
    if (canvasRef.current?.hasPointerCapture(event.pointerId)) canvasRef.current.releasePointerCapture(event.pointerId)
    if (hasInk.current) onSignatureChange(canvasRef.current!.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    hasInk.current = false
    onSignatureChange('')
  }

  return (
    <div className="tool-field">
      <label>{label}</label>
      <div className="signature-field">
        <canvas
          ref={canvasRef}
          width={480}
          height={160}
          className="signature-pad"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
        <div className="signature-controls">
          <button type="button" className="ghost-button" onClick={clear}><Eraser size={14} /> {dict.pdf.clear}</button>
          <label className="ghost-button signature-upload">
            {dict.pdf.uploadImage}
            <input type="file" accept={accept} hidden onChange={(event) => { const file = event.target.files?.[0] ?? null; onFileChange(file); if (file) onSignatureChange('') }} />
          </label>
        </div>
      </div>
      <small className="field-help">{dict.pdf.signatureHint}</small>
    </div>
  )
}
