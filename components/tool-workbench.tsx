'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Copy, ExternalLink, LockKeyhole, Play, RotateCcw } from 'lucide-react'
import type { ToolDefinition } from '../lib/tools'
import { convertUnits, formatConverted, resolveConverter } from '../lib/converters'
import { canRunInBrowser, legacyToolUrl, runBrowserTool } from '../lib/tool-runner'
import { isAsyncTool, runAsyncTool } from '../lib/async-tools'
import { isCheckerTool } from '../lib/checker-fields'
import { ImageOptimizer } from './image-optimizer'
import { ImageToolWorkbench } from './image-tool-workbench'
import { CheckerWorkbench } from './checker-workbench'
import { PdfWorkbench } from './pdf-workbench'
import { ThemeToggle } from './theme-toggle'
import { ToolIcon } from './tool-icon'
import { LanguageSwitcher } from './language-switcher'
import { useTranslations } from './i18n-provider'
import type { Dictionary } from '../lib/i18n'

// Numeric single-value tools that should use a number input instead of a textarea.
const numericInputTools = new Set(['number_to_roman_numerals', 'number_to_words_converter'])

// Image/file tools handled by the dedicated ImageToolWorkbench (file upload based).
const imageToolSlugs = new Set(['exif_reader', 'color_picker', 'qr_code_reader', 'barcode_reader', 'file_mime_type_checker'])

export function ToolWorkbench({ tool }: { tool: ToolDefinition }) {
  const { dict } = useTranslations()
  const tc = (name: string) => dict.categories[name as keyof Dictionary['categories']] ?? name
  const converter = useMemo(() => resolveConverter(tool.slug), [tool.slug])
  const isImageOptimizer = tool.slug === 'image_optimizer'
  const isTextToSpeech = tool.slug === 'text_to_speech'
  const isImageTool = imageToolSlugs.has(tool.slug)
  const isChecker = isCheckerTool(tool.slug)
  const isNumeric = numericInputTools.has(tool.slug)
  const runsLocally = Boolean(converter) || isImageOptimizer || isTextToSpeech || isImageTool || isChecker || canRunInBrowser(tool.slug)
  const isPdfTool = tool.category === 'PDF tools'
  const legacyUrl = legacyToolUrl(tool.slug)

  if (isPdfTool) return <PdfWorkbench tool={tool} />

  return (
    <main className="workspace-page">
      <header className="workspace-nav shell">
        <a href="/" className="brand"><span>W</span> magicwebtools</a>
        <a href="/tools" className="back-link"><ArrowLeft size={15} /> {dict.common.allTools}</a>
        <div className="privacy-pill"><LockKeyhole size={13} /> {isChecker ? dict.checker.runsOnServer : runsLocally ? dict.workbench.runsInBrowser : dict.workbench.originalTool}</div><ThemeToggle /><LanguageSwitcher />
      </header>
      <div className="workspace-shell">
        <div className="workspace-breadcrumb">{tc(tool.category)} <span>/</span> {tool.name}</div>
        {converter
          ? <ConverterWorkbench tool={tool} units={converter.units} defaultFrom={converter.from} defaultTo={converter.to} />
          : isImageOptimizer
            ? <PanelHeading tool={tool} actions={null}><ImageOptimizer /></PanelHeading>
            : isImageTool
            ? <ImageToolWorkbench tool={tool} />
            : isChecker
            ? <CheckerWorkbench tool={tool} />
            : isTextToSpeech
              ? <TextToSpeechWorkbench tool={tool} />
              : isNumeric
                ? <NumberWorkbench tool={tool} />
                : runsLocally
                  ? <TextWorkbench tool={tool} />
                  : <LegacyPanel tool={tool} legacyUrl={legacyUrl} isPdfTool={isPdfTool} />}
      </div>
    </main>
  )
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = async (value: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return { copied, copy }
}

function PanelHeading({ tool, actions, children }: { tool: ToolDefinition; actions: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <section className="workspace-heading">
        <div><div className="tool-icon"><ToolIcon icon={tool.icon} size={22} /></div><h1>{tool.name}</h1><p>{tool.description}</p></div>
        <div className="workspace-actions">{actions}</div>
      </section>
      {children}
    </>
  )
}

function ConverterWorkbench({ tool, units, defaultFrom, defaultTo }: { tool: ToolDefinition; units: { id: string; label: string }[]; defaultFrom: string; defaultTo: string }) {
  const { dict } = useTranslations()
  const [amount, setAmount] = useState('1')
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const { copied, copy } = useCopy()

  const result = useMemo(() => {
    const value = Number(amount)
    if (amount.trim() === '' || !Number.isFinite(value)) return dict.workbench.enterValidNumber
    try {
      return formatConverted(convertUnits(from, to, value))
    } catch {
      return dict.workbench.unsupportedConversion
    }
  }, [amount, from, to, dict])

  const swap = () => { setFrom(to); setTo(from) }
  const reset = () => { setAmount('1'); setFrom(defaultFrom); setTo(defaultTo) }

  return (
    <PanelHeading tool={tool} actions={<>
      <button className="icon-button" onClick={reset} title={dict.common.reset} aria-label={dict.common.reset}><RotateCcw size={16} /></button>
      <button className="icon-button" onClick={() => copy(result)} title={dict.common.copyResult} aria-label={dict.common.copyResult}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
    </>}>
      <section className="tool-panel length-panel">
        <div className="tool-field"><label>{dict.workbench.amount}</label><input type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
        <div className="tool-field"><label>{dict.workbench.from}</label><select value={from} onChange={(event) => setFrom(event.target.value)}>{units.map((unit) => <option value={unit.id} key={unit.id}>{unit.label}</option>)}</select></div>
        <button type="button" className="conversion-arrow" onClick={swap} title={dict.common.swapUnits} aria-label={dict.common.swapUnits}>&#8644;</button>
        <div className="tool-field"><label>{dict.workbench.to}</label><select value={to} onChange={(event) => setTo(event.target.value)}>{units.map((unit) => <option value={unit.id} key={unit.id}>{unit.label}</option>)}</select></div>
        <div className="answer"><span>{dict.workbench.result}</span><strong>{result}</strong></div>
      </section>
      <div className="workspace-footnote"><LockKeyhole size={14} /> {dict.workbench.noAccountRequired} <span /> {dict.workbench.inputStays}</div>
    </PanelHeading>
  )
}

function NumberWorkbench({ tool }: { tool: ToolDefinition }) {
  const { dict } = useTranslations()
  const [value, setValue] = useState('')
  const { copied, copy } = useCopy()

  const result = useMemo(() => {
    if (value.trim() === '') return ''
    try {
      return runBrowserTool(tool.slug, value)
    } catch (error) {
      return `${dict.workbench.errorPrefix}: ${error instanceof Error ? error.message : dict.workbench.unableToProcess}`
    }
  }, [value, tool.slug, dict])

  return (
    <PanelHeading tool={tool} actions={<>
      <button className="icon-button" onClick={() => setValue('')} title={dict.common.reset} aria-label={dict.common.reset}><RotateCcw size={16} /></button>
      <button className="icon-button" onClick={() => copy(result)} title={dict.common.copyResult} aria-label={dict.common.copyResult} disabled={!result}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
    </>}>
      <section className="tool-panel number-panel">
        <div className="tool-field"><label>{dict.workbench.number}</label><input type="number" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} placeholder={dict.workbench.enterNumber} /></div>
        <div className="answer"><span>{dict.workbench.result}</span><strong>{result || '—'}</strong></div>
      </section>
      <div className="workspace-footnote"><LockKeyhole size={14} /> {dict.workbench.noAccountRequired} <span /> {dict.workbench.inputStays}</div>
    </PanelHeading>
  )
}

function TextWorkbench({ tool }: { tool: ToolDefinition }) {
  const { dict } = useTranslations()
  const [input, setInput] = useState('')
  const [runId, setRunId] = useState(0)
  const [asyncOutput, setAsyncOutput] = useState('')
  const { copied, copy } = useCopy()
  const isAsync = isAsyncTool(tool.slug)

  const syncOutput = useMemo(() => {
    if (isAsync) return ''
    try {
      return runBrowserTool(tool.slug, input)
    } catch (error) {
      return `${dict.workbench.errorPrefix}: ${error instanceof Error ? error.message : dict.workbench.unableToProcess}`
    }
  }, [input, runId, tool.slug, dict, isAsync])

  useEffect(() => {
    if (!isAsync) return
    let cancelled = false
    if (!input) { setAsyncOutput(''); return }
    runAsyncTool(tool.slug, input)
      .then((value) => { if (!cancelled) setAsyncOutput(value) })
      .catch((error) => { if (!cancelled) setAsyncOutput(`${dict.workbench.errorPrefix}: ${error instanceof Error ? error.message : dict.workbench.unableToProcess}`) })
    return () => { cancelled = true }
  }, [input, runId, tool.slug, dict, isAsync])

  const output = isAsync ? asyncOutput : syncOutput

  return (
    <PanelHeading tool={tool} actions={<>
      <button className="icon-button" onClick={() => { setInput(''); setRunId((value) => value + 1) }} title={dict.common.reset} aria-label={dict.common.reset}><RotateCcw size={16} /></button>
      <button className="icon-button" onClick={() => copy(output)} title={dict.common.copyResult} aria-label={dict.common.copyResult} disabled={!output}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
    </>}>
      <section className="tool-panel editor-panel">
        <div className="editor-grid">
          <div className="editor-column"><label className="editor-label" htmlFor="tool-input">{dict.workbench.inputLabel} <span>{dict.workbench.editable}</span></label><textarea id="tool-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder={dict.workbench.inputPlaceholder} spellCheck={false} /></div>
          <div className="editor-column"><label className="editor-label" htmlFor="tool-output">{dict.workbench.resultLabel} <span>{dict.workbench.readOnly}</span></label><textarea id="tool-output" value={output} readOnly placeholder={dict.workbench.resultPlaceholder} spellCheck={false} /></div>
        </div>
        <div className="panel-footer"><span><LockKeyhole size={13} /> {dict.workbench.processedLocally}</span><button className="primary-button" onClick={() => setRunId((value) => value + 1)}><Play size={14} /> {dict.common.runTool}</button></div>
      </section>
      <div className="workspace-footnote"><LockKeyhole size={14} /> {dict.workbench.noAccountRequired} <span /> {dict.workbench.inputStays}</div>
    </PanelHeading>
  )
}

function TextToSpeechWorkbench({ tool }: { tool: ToolDefinition }) {
  const { dict } = useTranslations()
  const [input, setInput] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voice, setVoice] = useState('')
  const [rate, setRate] = useState(1)
  const [pitch, setPitch] = useState(1)
  const [speaking, setSpeaking] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    if (!supported) return
    const load = () => {
      const list = window.speechSynthesis.getVoices()
      setVoices(list)
      setVoice((current) => current || list.find((item) => item.default)?.name || list[0]?.name || '')
    }
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [supported])

  const speak = () => {
    if (!supported || !input.trim()) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(input)
    const selected = voices.find((item) => item.name === voice)
    if (selected) utterance.voice = selected
    utterance.rate = rate
    utterance.pitch = pitch
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  const stop = () => { if (supported) window.speechSynthesis.cancel(); setSpeaking(false) }

  return (
    <PanelHeading tool={tool} actions={null}>
      <section className="tool-panel">
        {!supported && <div className="pdf-status pdf-status-error">{dict.pdf.error}</div>}
        <div className="editor-column" style={{ display: 'grid', gap: 8 }}>
          <label className="editor-label" htmlFor="tts-input">{dict.workbench.inputLabel}</label>
          <textarea id="tts-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder={dict.workbench.inputPlaceholder} spellCheck={false} />
        </div>
        <div className="tts-controls">
          <div className="tool-field"><label>{dict.tts.voice}</label><select value={voice} onChange={(event) => setVoice(event.target.value)}>{voices.map((item) => <option key={item.name} value={item.name}>{item.name} ({item.lang})</option>)}</select></div>
          <div className="tool-field"><label>{dict.tts.rate} ({rate.toFixed(1)})</label><input type="range" min={0.5} max={2} step={0.1} value={rate} onChange={(event) => setRate(Number(event.target.value))} /></div>
          <div className="tool-field"><label>{dict.tts.pitch} ({pitch.toFixed(1)})</label><input type="range" min={0} max={2} step={0.1} value={pitch} onChange={(event) => setPitch(Number(event.target.value))} /></div>
        </div>
        <div className="panel-footer">
          <span><LockKeyhole size={13} /> {dict.workbench.processedLocally}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {speaking
              ? <button className="ghost-button" onClick={stop}>{dict.tts.stop}</button>
              : <button className="primary-button" onClick={speak} disabled={!supported || !input.trim()}><Play size={14} /> {dict.tts.speak}</button>}
          </div>
        </div>
      </section>
      <div className="workspace-footnote"><LockKeyhole size={14} /> {dict.workbench.noAccountRequired} <span /> {dict.workbench.inputStays}</div>
    </PanelHeading>
  )
}

function LegacyPanel({ tool, legacyUrl, isPdfTool }: { tool: ToolDefinition; legacyUrl: string | null; isPdfTool: boolean }) {
  const { dict } = useTranslations()
  return (
    <PanelHeading tool={tool} actions={null}>
      <section className="legacy-tool-panel">
        <div className="legacy-tool-icon"><ExternalLink size={24} /></div>
        <div><p className="eyebrow">{isPdfTool ? dict.legacy.pdfEyebrow : dict.legacy.continueEyebrow}</p><h2>{legacyUrl ? (isPdfTool ? dict.legacy.pdfHeading : dict.legacy.openHeading) : dict.legacy.notConnectedHeading}</h2><p>{legacyUrl ? (isPdfTool ? dict.legacy.pdfBody : dict.legacy.openBody) : dict.legacy.notConnectedBody}</p></div>
        {legacyUrl ? <a className="primary-button" href={legacyUrl} target="_blank" rel="noreferrer">{isPdfTool ? dict.legacy.continuePdf : `${dict.legacy.open} ${tool.name}`}<ExternalLink size={15} /></a> : <span className="primary-button is-disabled" aria-disabled="true">{dict.legacy.unavailable}</span>}
      </section>
    </PanelHeading>
  )
}
