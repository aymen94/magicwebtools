'use client'

import { useCallback, useRef, useState } from 'react'
import { LockKeyhole, UploadCloud } from 'lucide-react'
import type { ToolDefinition } from '../lib/tools'
import { useTranslations } from './i18n-provider'

type ImageToolSlug = 'exif_reader' | 'color_picker' | 'qr_code_reader' | 'barcode_reader' | 'file_mime_type_checker'

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// Read the leading bytes of a file and detect its true MIME type from magic numbers.
async function detectMimeType(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const hex = Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('')
  const ascii = String.fromCharCode(...buffer)
  const signatures: Array<[RegExp | ((h: string, a: string) => boolean), string]> = [
    [(h) => h.startsWith('ffd8ff'), 'image/jpeg'],
    [(h) => h.startsWith('89504e47'), 'image/png'],
    [(h) => h.startsWith('47494638'), 'image/gif'],
    [(h) => h.startsWith('424d'), 'image/bmp'],
    [(h, a) => h.startsWith('52494646') && a.slice(8, 12) === 'WEBP', 'image/webp'],
    [(h) => h.startsWith('25504446'), 'application/pdf'],
    [(h) => h.startsWith('504b0304'), 'application/zip (or docx/xlsx/pptx)'],
    [(h) => h.startsWith('1f8b'), 'application/gzip'],
    [(h) => h.startsWith('4749463837') || h.startsWith('4749463839'), 'image/gif'],
    [(h) => h.startsWith('000000') && ascii.includes('ftyp'), 'video/mp4'],
    [(h) => h.startsWith('4f676753'), 'audio/ogg'],
    [(h) => h.startsWith('494433') || h.startsWith('fffb'), 'audio/mpeg'],
  ]
  for (const [test, type] of signatures) {
    const matched = typeof test === 'function' ? test(hex, ascii) : test.test(hex)
    if (matched) return type
  }
  return file.type || 'unknown'
}

export function ImageToolWorkbench({ tool }: { tool: ToolDefinition }) {
  const { dict } = useTranslations()
  const slug = tool.slug as ImageToolSlug
  const isColorPicker = slug === 'color_picker'
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [output, setOutput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [color, setColor] = useState('#2dd4bf')

  const accept = slug === 'file_mime_type_checker' ? '*/*' : 'image/*'

  const process = useCallback(async (source: File) => {
    setBusy(true)
    setError('')
    setOutput('')
    try {
      if (slug === 'file_mime_type_checker') {
        const detected = await detectMimeType(source)
        setOutput([
          `File name: ${source.name}`,
          `Size: ${humanSize(source.size)}`,
          `Reported type: ${source.type || 'unknown'}`,
          `Detected type: ${detected}`,
        ].join('\n'))
        return
      }

      if (slug === 'exif_reader') {
        const exifr = await import('exifr')
        const data = await exifr.parse(source, true).catch(() => null)
        if (!data || Object.keys(data).length === 0) { setOutput(dict.imageTools.noExif); return }
        const lines = Object.entries(data)
          .filter(([, value]) => value !== undefined && value !== null && typeof value !== 'object')
          .map(([key, value]) => `${key}: ${value}`)
        setOutput(lines.length ? lines.join('\n') : dict.imageTools.noExif)
        return
      }

      // qr_code_reader / barcode_reader
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const url = URL.createObjectURL(source)
      try {
        const result = await reader.decodeFromImageUrl(url)
        setOutput(`${dict.imageTools.decoded}: ${result.getBarcodeFormat?.() ?? ''}\n${result.getText()}`)
      } catch {
        setError(dict.imageTools.noCode)
      } finally {
        URL.revokeObjectURL(url)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : dict.workbench.unableToProcess)
    } finally {
      setBusy(false)
    }
  }, [slug, dict])

  const handleFile = useCallback((next: File | undefined) => {
    if (!next) return
    setFile(next)
    setPreviewUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return next.type.startsWith('image/') ? URL.createObjectURL(next) : '' })
    void process(next)
  }, [process])

  const rgb = (() => {
    const normalized = color.replace('#', '')
    const [r, g, b] = [0, 2, 4].map((offset) => parseInt(normalized.slice(offset, offset + 2), 16))
    return { r, g, b }
  })()

  if (isColorPicker) {
    return (
      <>
        <section className="workspace-heading">
          <div><div className="tool-icon" /><h1>{tool.name}</h1><p>{tool.description}</p></div>
        </section>
        <section className="tool-panel">
          <div className="color-picker-panel">
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label={tool.name} className="color-input" />
            <div className="color-swatch" style={{ background: color }} />
            <div className="color-values">
              <div><span>HEX</span><strong>{color.toUpperCase()}</strong></div>
              <div><span>RGB</span><strong>rgb({rgb.r}, {rgb.g}, {rgb.b})</strong></div>
              <div><span>RGBA</span><strong>rgba({rgb.r}, {rgb.g}, {rgb.b}, 1)</strong></div>
            </div>
          </div>
        </section>
        <div className="workspace-footnote"><LockKeyhole size={14} /> {dict.workbench.noAccountRequired} <span /> {dict.workbench.inputStays}</div>
      </>
    )
  }

  return (
    <>
      <section className="workspace-heading">
        <div><div className="tool-icon" /><h1>{tool.name}</h1><p>{tool.description}</p></div>
      </section>
      <section className="tool-panel upload-panel" style={{ maxWidth: '100%' }}>
        <div
          className={`drop-zone${dragging ? ' is-dragging' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); handleFile(event.dataTransfer.files[0]) }}
        >
          <input ref={inputRef} type="file" accept={accept} onChange={(event) => handleFile(event.target.files?.[0])} />
          <UploadCloud size={26} />
          <strong>{file ? file.name : dict.imageTools.dropFile}</strong>
          <span>{file ? humanSize(file.size) : dict.imageTools.processedInBrowser}</span>
        </div>

        {previewUrl && <div className="image-tool-preview"><img src={previewUrl} alt={file?.name ?? ''} /></div>}
        {busy && <p className="optimizer-busy">{dict.common.processing}</p>}
        {error && <p className="optimizer-error">{error}</p>}
        {output && <textarea className="image-tool-output" value={output} readOnly spellCheck={false} />}
      </section>
      <div className="workspace-footnote"><LockKeyhole size={14} /> {dict.workbench.noAccountRequired} <span /> {dict.imageTools.filesStay}</div>
    </>
  )
}
