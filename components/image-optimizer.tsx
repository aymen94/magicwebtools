'use client'

import { useCallback, useRef, useState } from 'react'
import { Download, ImageDown, LockKeyhole, RotateCcw, UploadCloud } from 'lucide-react'

type OutputFormat = 'image/jpeg' | 'image/webp' | 'image/png'

type Result = {
  url: string
  blob: Blob
  width: number
  height: number
  name: string
}

const formatLabels: Record<OutputFormat, string> = {
  'image/jpeg': 'JPEG',
  'image/webp': 'WebP',
  'image/png': 'PNG',
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function extensionFor(format: OutputFormat) {
  return format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png'
}

/**
 * Fully client-side image compressor. The original PHP Image Optimizer plugin compressed
 * uploads on the server; this runs entirely in the browser using a canvas, so files never leave the device.
 */
export function ImageOptimizer() {
  const [file, setFile] = useState<File | null>(null)
  const [quality, setQuality] = useState(0.7)
  const [maxWidth, setMaxWidth] = useState(2000)
  const [format, setFormat] = useState<OutputFormat>('image/jpeg')
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const optimize = useCallback(async (source: File, q: number, mw: number, fmt: OutputFormat) => {
    setBusy(true)
    setError('')
    try {
      const bitmap = await createImageBitmap(source)
      const scale = mw > 0 && bitmap.width > mw ? mw / bitmap.width : 1
      const width = Math.round(bitmap.width * scale)
      const height = Math.round(bitmap.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas is not supported in this browser.')
      if (fmt === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height) }
      context.drawImage(bitmap, 0, 0, width, height)
      bitmap.close()
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, fmt, fmt === 'image/png' ? undefined : q))
      if (!blob) throw new Error('Could not encode the optimized image.')
      const baseName = source.name.replace(/\.[^.]+$/, '') || 'image'
      setResult((previous) => {
        if (previous) URL.revokeObjectURL(previous.url)
        return { url: URL.createObjectURL(blob), blob, width, height, name: `${baseName}-optimized.${extensionFor(fmt)}` }
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to optimize this image.')
      setResult(null)
    } finally {
      setBusy(false)
    }
  }, [])

  const handleFile = useCallback((next: File | undefined) => {
    if (!next) return
    if (!next.type.startsWith('image/')) { setError('Please choose an image file.'); return }
    setFile(next)
    void optimize(next, quality, maxWidth, format)
  }, [optimize, quality, maxWidth, format])

  const rerun = (q: number, mw: number, fmt: OutputFormat) => { if (file) void optimize(file, q, mw, fmt) }

  const reset = () => {
    setFile(null)
    setResult((previous) => { if (previous) URL.revokeObjectURL(previous.url); return null })
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const savings = result && file ? 1 - result.blob.size / file.size : 0

  return (
    <>
      <section className="workspace-actions" style={{ justifyContent: 'flex-end', marginBottom: 14 }}>
        {file && <button className="icon-button" onClick={reset} title="Reset" aria-label="Reset"><RotateCcw size={16} /></button>}
      </section>
      <section className="tool-panel upload-panel" style={{ maxWidth: '100%' }}>
        <div
          className={`drop-zone${dragging ? ' is-dragging' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); handleFile(event.dataTransfer.files[0]) }}
        >
          <input ref={inputRef} type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0])} />
          <UploadCloud size={26} />
          <strong>{file ? file.name : 'Drop an image or click to upload'}</strong>
          <span>{file ? `${humanSize(file.size)} original` : 'PNG, JPG, WebP, GIF · processed in your browser'}</span>
        </div>

        <div className="optimizer-controls">
          <div className="tool-field">
            <label>Quality · {Math.round(quality * 100)}%</label>
            <input type="range" min={0.1} max={1} step={0.05} value={quality} disabled={format === 'image/png'}
              onChange={(event) => { const q = Number(event.target.value); setQuality(q); rerun(q, maxWidth, format) }} />
          </div>
          <div className="tool-field">
            <label>Max width (px)</label>
            <input type="number" min={0} value={maxWidth}
              onChange={(event) => { const mw = Number(event.target.value); setMaxWidth(mw); rerun(quality, mw, format) }} />
          </div>
          <div className="tool-field">
            <label>Output format</label>
            <select value={format} onChange={(event) => { const fmt = event.target.value as OutputFormat; setFormat(fmt); rerun(quality, maxWidth, fmt) }}>
              {Object.entries(formatLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="optimizer-error">{error}</p>}

        {result && file && (
          <div className="optimizer-result">
            <img src={result.url} alt="Optimized preview" />
            <div className="optimizer-stats">
              <div><span>Original</span><strong>{humanSize(file.size)}</strong></div>
              <div><span>Optimized</span><strong>{humanSize(result.blob.size)}</strong></div>
              <div><span>Saved</span><strong className={savings >= 0 ? 'is-good' : 'is-bad'}>{(savings * 100).toFixed(1)}%</strong></div>
              <div><span>Dimensions</span><strong>{result.width}×{result.height}</strong></div>
              <div><span>Format</span><strong>{formatLabels[format]}</strong></div>
            </div>
            <a className="primary-button" href={result.url} download={result.name}><Download size={15} /> Download optimized</a>
          </div>
        )}

        {busy && <p className="optimizer-busy"><ImageDown size={14} /> Optimizing…</p>}
      </section>
      <div className="workspace-footnote"><LockKeyhole size={14} /> No account required <span /> Images are compressed locally and never uploaded</div>
    </>
  )
}
