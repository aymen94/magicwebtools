// Native TypeScript port of themes/altum/assets/js/pdf-tools/pdf_tools.js.
// Runs entirely in the browser using pdf-lib, pdfjs-dist and JSZip.

import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import JSZip from 'jszip'

// ---- Types -----------------------------------------------------------------

export type PdfImagePreview = { url: string; label: string }

export type PdfResult = {
  download?: { blob: Blob; filename: string }
  text?: string
  images?: PdfImagePreview[]
}

export type PdfValues = Record<string, string | File | File[] | null | undefined>

// ---- pdfjs (lazy loaded, worker configured once) ---------------------------

type PdfjsModule = typeof import('pdfjs-dist')
let pdfjsPromise: Promise<PdfjsModule> | null = null

async function getPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      return pdfjs
    })
  }
  return pdfjsPromise
}

// ---- Helpers ---------------------------------------------------------------

const standardPageSizes: Record<string, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
}

function asFile(value: PdfValues[string]): File | null {
  if (value instanceof File) return value
  if (Array.isArray(value)) return value[0] instanceof File ? value[0] : null
  return null
}

function asFiles(value: PdfValues[string]): File[] {
  if (Array.isArray(value)) return value.filter((item): item is File => item instanceof File)
  if (value instanceof File) return [value]
  return []
}

function str(values: PdfValues, id: string): string {
  const value = values[id]
  return typeof value === 'string' ? value : ''
}

function num(values: PdfValues, id: string, fallback = 0): number {
  const value = parseFloat(str(values, id))
  return Number.isFinite(value) ? value : fallback
}

function requirePdfFile(values: PdfValues): File {
  const file = asFile(values.pdf_file)
  if (!file) throw new Error('Select a PDF file.')
  return file
}

function requirePdfFiles(values: PdfValues): File[] {
  const files = asFiles(values.pdf_files)
  if (!files.length) throw new Error('Select one or more PDF files.')
  return files
}

const readArrayBuffer = (file: File) => file.arrayBuffer()
const readUint8Array = async (file: File) => new Uint8Array(await readArrayBuffer(file))
const loadPdfLibDocument = async (file: File) => PDFDocument.load(await readArrayBuffer(file))
function toBlob(bytes: Uint8Array, type: string): Blob {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy.buffer], { type })
}
const savePdf = async (doc: PDFDocument) => toBlob(await doc.save(), 'application/pdf')

const normalizeDegrees = (value: number) => ((value % 360) + 360) % 360

function parseRanges(value: string, totalPages: number, fallbackAll = false): number[] {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    if (fallbackAll) return Array.from({ length: totalPages }, (_, index) => index)
    throw new Error('Please enter valid page ranges.')
  }

  const pages: number[] = []
  for (const part of trimmed.split(',')) {
    const clean = part.trim()
    if (!clean) continue

    if (clean.includes('-')) {
      const [startRaw, endRaw] = clean.split('-')
      const start = parseInt(startRaw, 10)
      const end = parseInt(endRaw, 10)
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > totalPages) {
        throw new Error('Please enter valid page ranges.')
      }
      for (let page = start; page <= end; page++) pages.push(page - 1)
    } else {
      const page = parseInt(clean, 10)
      if (!Number.isInteger(page) || page < 1 || page > totalPages) {
        throw new Error('Please enter valid page ranges.')
      }
      pages.push(page - 1)
    }
  }

  if (!pages.length) throw new Error('Please enter valid page ranges.')
  return pages
}

const getPageRanges = (values: PdfValues, totalPages: number, fallbackAll = false) =>
  parseRanges(str(values, 'page_ranges'), totalPages, fallbackAll)

function getStandardPageSize(values: PdfValues, sizeId = 'page_size', orientationId = 'page_orientation'): [number, number] {
  const selectedSize = standardPageSizes[str(values, sizeId)] || standardPageSizes.a4
  const orientation = str(values, orientationId) || 'portrait'
  return orientation === 'landscape' ? [selectedSize[1], selectedSize[0]] : selectedSize
}

function getPageSizeLabel(width: number, height: number): string {
  for (const [name, [sizeWidth, sizeHeight]] of Object.entries(standardPageSizes)) {
    const portrait = Math.abs(width - sizeWidth) <= 3 && Math.abs(height - sizeHeight) <= 3
    const landscape = Math.abs(width - sizeHeight) <= 3 && Math.abs(height - sizeWidth) <= 3
    if (portrait || landscape) return name.toUpperCase()
  }
  return 'Custom'
}

function fitBox(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  return { width, height, x: (targetWidth - width) / 2, y: (targetHeight - height) / 2 }
}

function getPlacementPosition(pageWidth: number, pageHeight: number, objectWidth: number, objectHeight: number, position: string, margin = 36) {
  const left = margin
  const right = pageWidth - objectWidth - margin
  const bottom = margin
  const top = pageHeight - objectHeight - margin
  let x = (pageWidth - objectWidth) / 2
  let y = (pageHeight - objectHeight) / 2
  if (position.includes('left')) x = left
  if (position.includes('right')) x = right
  if (position.includes('top')) y = top
  if (position.includes('bottom')) y = bottom
  return {
    x: Math.max(0, Math.min(pageWidth - objectWidth, x)),
    y: Math.max(0, Math.min(pageHeight - objectHeight, y)),
  }
}

function getPageNumberPosition(page: { getSize(): { width: number; height: number } }, text: string, font: { widthOfTextAtSize(t: string, s: number): number }, fontSize: number, position: string) {
  const { width, height } = page.getSize()
  const textWidth = font.widthOfTextAtSize(text, fontSize)
  const centeredX = Math.max(0, (width - textWidth) / 2)
  const rightX = Math.max(0, width - textWidth - 36)
  switch (position) {
    case 'bottom_left': return { x: 36, y: 24 }
    case 'bottom_right': return { x: rightX, y: 24 }
    case 'top_left': return { x: 36, y: height - fontSize - 24 }
    case 'top_right': return { x: rightX, y: height - fontSize - 24 }
    case 'top_center': return { x: centeredX, y: height - fontSize - 24 }
    case 'bottom_center':
    default: return { x: centeredX, y: 24 }
  }
}

const formatDate = (date: Date | undefined) =>
  date instanceof Date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '-'

const formatKeywords = (keywords: string[] | string | undefined) =>
  Array.isArray(keywords) ? keywords.join(', ') : (keywords || '-')

// ---- Canvas / image helpers ------------------------------------------------

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The PDF could not be processed.'))), mimeType, quality)
  })
}

async function renderPageToCanvas(page: import('pdfjs-dist').PDFPageProxy, scale: number, grayscale = false) {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvasContext: context, viewport }).promise

  if (grayscale) {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    for (let index = 0; index < data.length; index += 4) {
      const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114
      data[index] = gray
      data[index + 1] = gray
      data[index + 2] = gray
    }
    context.putImageData(imageData, 0, 0)
  }

  return { canvas, viewport }
}

function getImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The image could not be read.')) }
    image.src = url
  })
}

async function imageToJpegArrayBuffer(file: File): Promise<ArrayBuffer> {
  const image = await getImageFromFile(file)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
  return blob.arrayBuffer()
}

async function imageToPngArrayBuffer(file: File): Promise<ArrayBuffer> {
  const image = await getImageFromFile(file)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await canvasToBlob(canvas, 'image/png')
  return blob.arrayBuffer()
}

function getSafeZipFilename(filename: string, usedFilenames: Set<string>): string {
  const sanitized = (filename || 'attachment')
    .split(/[\\/]/).pop()!
    .replace(/[\x00-\x1F\x7F?%*:|"<>]/g, '_')
  const clean = !sanitized || sanitized === '.' || sanitized === '..' ? 'attachment' : sanitized
  const extensionIndex = clean.lastIndexOf('.')
  const base = extensionIndex > 0 ? clean.slice(0, extensionIndex) : clean
  const extension = extensionIndex > 0 ? clean.slice(extensionIndex) : ''
  let unique = clean
  let suffix = 2
  while (usedFilenames.has(unique.toLowerCase())) {
    unique = `${base}-${suffix}${extension}`
    suffix++
  }
  usedFilenames.add(unique.toLowerCase())
  return unique
}

const getPdfJsDocument = async (file: File) => {
  const pdfjs = await getPdfjs()
  return pdfjs.getDocument({ data: new Uint8Array(await readArrayBuffer(file)) }).promise
}

async function createPdfFromPages(sourcePdf: PDFDocument, pageIndexes: number[]) {
  const outputPdf = await PDFDocument.create()
  const copiedPages = await outputPdf.copyPages(sourcePdf, pageIndexes)
  copiedPages.forEach((page) => outputPdf.addPage(page))
  return outputPdf
}

// ---- Tool handlers ---------------------------------------------------------

type Handler = (values: PdfValues, name: string) => Promise<PdfResult>

const mergePdf: Handler = async (values, name) => {
  const files = requirePdfFiles(values)
  const outputPdf = await PDFDocument.create()
  for (const file of files) {
    const sourcePdf = await loadPdfLibDocument(file)
    const copiedPages = await outputPdf.copyPages(sourcePdf, sourcePdf.getPageIndices())
    copiedPages.forEach((page) => outputPdf.addPage(page))
  }
  return { download: { blob: await savePdf(outputPdf), filename: `${name}.pdf` } }
}

const splitPdf: Handler = async (values, name) => {
  const sourcePdf = await loadPdfLibDocument(requirePdfFile(values))
  const pages = getPageRanges(values, sourcePdf.getPageCount())
  const zip = new JSZip()
  for (const pageIndex of pages) {
    const outputPdf = await createPdfFromPages(sourcePdf, [pageIndex])
    zip.file(`${name}-page-${pageIndex + 1}.pdf`, await outputPdf.save())
  }
  return { download: { blob: await zip.generateAsync({ type: 'blob' }), filename: `${name}.zip` } }
}

const extractPdfPages: Handler = async (values, name) => {
  const sourcePdf = await loadPdfLibDocument(requirePdfFile(values))
  const outputPdf = await createPdfFromPages(sourcePdf, getPageRanges(values, sourcePdf.getPageCount()))
  return { download: { blob: await savePdf(outputPdf), filename: `${name}.pdf` } }
}

const removePdfPages: Handler = async (values, name) => {
  const sourcePdf = await loadPdfLibDocument(requirePdfFile(values))
  const removed = new Set(getPageRanges(values, sourcePdf.getPageCount()))
  const remaining = sourcePdf.getPageIndices().filter((index) => !removed.has(index))
  if (!remaining.length) throw new Error('Please enter valid page ranges.')
  const outputPdf = await createPdfFromPages(sourcePdf, remaining)
  return { download: { blob: await savePdf(outputPdf), filename: `${name}.pdf` } }
}

const reorderPdfPages: Handler = async (values, name) => {
  const sourcePdf = await loadPdfLibDocument(requirePdfFile(values))
  const outputPdf = await createPdfFromPages(sourcePdf, getPageRanges(values, sourcePdf.getPageCount()))
  return { download: { blob: await savePdf(outputPdf), filename: `${name}.pdf` } }
}

const rotatePdfPages: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  const rotation = parseInt(str(values, 'rotation') || '90', 10)
  const pageIndexes = new Set(getPageRanges(values, pdfDoc.getPageCount(), true))
  pdfDoc.getPages().forEach((page, index) => {
    if (!pageIndexes.has(index)) return
    page.setRotation(degrees(normalizeDegrees(page.getRotation().angle + rotation)))
  })
  return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
}

const addPdfPageNumbers: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontSize = 11
  const position = str(values, 'page_number_position') || 'bottom_center'
  const pages = pdfDoc.getPages()
  pages.forEach((page, index) => {
    const label = `${index + 1} / ${pages.length}`
    page.drawText(label, { ...getPageNumberPosition(page, label, font, fontSize, position), size: fontSize, font, color: rgb(0.25, 0.25, 0.25) })
  })
  return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
}

const addTextWatermarkToPdf: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  const text = str(values, 'watermark_text')
  if (!text.trim()) throw new Error('Please enter watermark text.')
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  pdfDoc.getPages().forEach((page) => {
    const { width, height } = page.getSize()
    const fontSize = Math.max(24, Math.min(width, height) / 10)
    const textWidth = font.widthOfTextAtSize(text, fontSize)
    page.drawText(text, { x: (width - textWidth) / 2, y: height / 2, size: fontSize, font, rotate: degrees(35), opacity: 0.18, color: rgb(0.75, 0.1, 0.1) })
  })
  return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
}

const addImageWatermarkToPdf: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  const imageFile = asFile(values.watermark_image)
  if (!imageFile) throw new Error('Select an image file.')
  const bytes = await readArrayBuffer(imageFile)
  const image = imageFile.type === 'image/png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
  pdfDoc.getPages().forEach((page) => {
    const { width, height } = page.getSize()
    const scale = Math.min(width / image.width, height / image.height) * 0.35
    const imageWidth = image.width * scale
    const imageHeight = image.height * scale
    page.drawImage(image, { x: (width - imageWidth) / 2, y: (height - imageHeight) / 2, width: imageWidth, height: imageHeight, opacity: 0.25 })
  })
  return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
}

const removePdfMetadata: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  const now = new Date()
  pdfDoc.setTitle('')
  pdfDoc.setAuthor('')
  pdfDoc.setSubject('')
  pdfDoc.setKeywords([])
  pdfDoc.setProducer('')
  pdfDoc.setCreator('')
  pdfDoc.setCreationDate(now)
  pdfDoc.setModificationDate(now)
  return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
}

const viewPdfMetadata: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  const lines = [
    `Title: ${pdfDoc.getTitle() || '-'}`,
    `Author: ${pdfDoc.getAuthor() || '-'}`,
    `Subject: ${pdfDoc.getSubject() || '-'}`,
    `Keywords: ${formatKeywords(pdfDoc.getKeywords())}`,
    `Creator: ${pdfDoc.getCreator() || '-'}`,
    `Producer: ${pdfDoc.getProducer() || '-'}`,
    `Creation date: ${formatDate(pdfDoc.getCreationDate())}`,
    `Modification date: ${formatDate(pdfDoc.getModificationDate())}`,
    `Pages: ${pdfDoc.getPageCount()}`,
  ]
  const text = lines.join('\n')
  return { text, download: { blob: new Blob([text], { type: 'text/plain' }), filename: `${name}.txt` } }
}

const editPdfMetadata: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  const keywords = str(values, 'metadata_keywords').split(',').map((keyword) => keyword.trim()).filter(Boolean)
  pdfDoc.setTitle(str(values, 'metadata_title'))
  pdfDoc.setAuthor(str(values, 'metadata_author'))
  pdfDoc.setSubject(str(values, 'metadata_subject'))
  pdfDoc.setKeywords(keywords)
  pdfDoc.setCreator(str(values, 'metadata_creator'))
  pdfDoc.setModificationDate(new Date())
  return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
}

const countPdfPages: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  const text = `Pages: ${pdfDoc.getPageCount()}`
  return { text, download: { blob: new Blob([text], { type: 'text/plain' }), filename: `${name}.txt` } }
}

const checkPdfPageSizes: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  const lines = pdfDoc.getPages().map((page, index) => {
    const { width, height } = page.getSize()
    const widthInches = width / 72
    const heightInches = height / 72
    const orientation = width > height ? 'Landscape' : 'Portrait'
    return [
      `Page ${index + 1}`,
      `Size: ${getPageSizeLabel(width, height)}`,
      `Dimensions: ${width.toFixed(2)} x ${height.toFixed(2)} pt`,
      `Inches: ${widthInches.toFixed(2)} x ${heightInches.toFixed(2)} in`,
      `Millimeters: ${(widthInches * 25.4).toFixed(2)} x ${(heightInches * 25.4).toFixed(2)} mm`,
      `Orientation: ${orientation}`,
    ].join('\n')
  })
  const text = lines.join('\n\n')
  return { text, download: { blob: new Blob([text], { type: 'text/plain' }), filename: `${name}.txt` } }
}

const cropPdfPages: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  const pageIndexes = new Set(getPageRanges(values, pdfDoc.getPageCount(), true))
  const top = num(values, 'crop_top', 0)
  const right = num(values, 'crop_right', 0)
  const bottom = num(values, 'crop_bottom', 0)
  const left = num(values, 'crop_left', 0)
  pdfDoc.getPages().forEach((page, index) => {
    if (!pageIndexes.has(index)) return
    const { width, height } = page.getSize()
    const croppedWidth = width - left - right
    const croppedHeight = height - top - bottom
    if (croppedWidth <= 0 || croppedHeight <= 0) throw new Error('Please enter valid crop margins.')
    if (typeof page.setCropBox === 'function') page.setCropBox(left, bottom, croppedWidth, croppedHeight)
    else page.setMediaBox(left, bottom, croppedWidth, croppedHeight)
  })
  return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
}

const resizePdfPages: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  const mode = str(values, 'resize_mode') || 'fit'
  const [targetWidth, targetHeight] = getStandardPageSize(values)
  pdfDoc.getPages().forEach((page) => {
    const { width, height } = page.getSize()
    if (mode === 'stretch') {
      page.scaleContent(targetWidth / width, targetHeight / height)
      page.scaleAnnotations(targetWidth / width, targetHeight / height)
      page.setSize(targetWidth, targetHeight)
      return
    }
    const scale = Math.min(targetWidth / width, targetHeight / height)
    const offsetX = (targetWidth - width * scale) / 2
    const offsetY = (targetHeight - height * scale) / 2
    page.scaleContent(scale, scale)
    page.scaleAnnotations(scale, scale)
    page.setSize(targetWidth, targetHeight)
    page.translateContent(offsetX, offsetY)
  })
  return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
}

const addBlankPagesToPdf: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  const pages = pdfDoc.getPages()
  const { width, height } = pages[0].getSize()
  const count = Math.max(1, Math.min(100, parseInt(str(values, 'blank_pages_count') || '1', 10)))
  const position = str(values, 'blank_pages_position') || 'end'
  const afterPage = Math.max(1, Math.min(pdfDoc.getPageCount(), parseInt(str(values, 'blank_pages_after') || '1', 10)))
  for (let index = 0; index < count; index++) {
    if (position === 'start') pdfDoc.insertPage(index, [width, height])
    else if (position === 'after') pdfDoc.insertPage(afterPage + index, [width, height])
    else pdfDoc.addPage([width, height])
  }
  return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
}

const duplicatePdfPages: Handler = async (values, name) => {
  const sourcePdf = await loadPdfLibDocument(requirePdfFile(values))
  const selectedPages = new Set(getPageRanges(values, sourcePdf.getPageCount()))
  const outputPdf = await PDFDocument.create()
  for (const pageIndex of sourcePdf.getPageIndices()) {
    const [page] = await outputPdf.copyPages(sourcePdf, [pageIndex])
    outputPdf.addPage(page)
    if (selectedPages.has(pageIndex)) {
      const [duplicatePage] = await outputPdf.copyPages(sourcePdf, [pageIndex])
      outputPdf.addPage(duplicatePage)
    }
  }
  return { download: { blob: await savePdf(outputPdf), filename: `${name}.pdf` } }
}

const reversePdfPages: Handler = async (values, name) => {
  const sourcePdf = await loadPdfLibDocument(requirePdfFile(values))
  const pageIndexes = sourcePdf.getPageIndices().reverse()
  const outputPdf = await createPdfFromPages(sourcePdf, pageIndexes)
  return { download: { blob: await savePdf(outputPdf), filename: `${name}.pdf` } }
}

const flattenPdfForms: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  pdfDoc.getForm().flatten()
  return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
}

const extractPdfText: Handler = async (values, name) => {
  const pdf = await getPdfJsDocument(requirePdfFile(values))
  const chunks: string[] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
    chunks.push(`Page ${pageNumber}\n${text}`)
  }
  const text = chunks.join('\n\n')
  return { text, download: { blob: new Blob([text], { type: 'text/plain' }), filename: `${name}.txt` } }
}

async function renderPdfPages(values: PdfValues, name: string, format: 'jpg' | 'png' | 'webp', previewOnly = false): Promise<PdfResult> {
  const pdf = await getPdfJsDocument(requirePdfFile(values))
  const scale = Math.max(1, Math.min(4, parseFloat(str(values, 'scale') || '2')))
  const zip = previewOnly ? null : new JSZip()
  const images: PdfImagePreview[] = []
  const mimeTypes = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
  const mimeType = mimeTypes[format] || mimeTypes.png
  const extension = format === 'jpg' ? 'jpg' : format

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const { canvas } = await renderPageToCanvas(page, scale)
    const blob = await canvasToBlob(canvas, mimeType, 0.92)
    if (zip) zip.file(`${name}-page-${pageNumber}.${extension}`, blob)
    images.push({ url: URL.createObjectURL(blob), label: `Page ${pageNumber}` })
  }

  const result: PdfResult = { images }
  if (zip) result.download = { blob: await zip.generateAsync({ type: 'blob' }), filename: `${name}.zip` }
  return result
}

const imagesToPdf: Handler = async (values, name) => {
  const files = asFiles(values.image_files)
  if (!files.length) throw new Error('Select one or more image files.')
  const pdfDoc = await PDFDocument.create()
  for (const file of files) {
    const bytes = await readArrayBuffer(file)
    const image = file.type === 'image/png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
    const page = pdfDoc.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  }
  return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
}

const webpToPdf: Handler = async (values, name) => {
  const files = asFiles(values.image_files)
  if (!files.length) throw new Error('Select one or more image files.')
  const pdfDoc = await PDFDocument.create()
  for (const file of files) {
    const bytes = await imageToJpegArrayBuffer(file)
    const image = await pdfDoc.embedJpg(bytes)
    const page = pdfDoc.addPage([image.width, image.height])
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
  }
  return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
}

async function rasterizePdfToPdf(values: PdfValues, name: string, grayscale = false): Promise<PdfResult> {
  const pdf = await getPdfJsDocument(requirePdfFile(values))
  const outputPdf = await PDFDocument.create()
  const scale = Math.max(0.5, Math.min(4, parseFloat(str(values, 'scale') || '1.5')))
  const quality = Math.max(0.01, Math.min(1, num(values, 'quality', 75) / 100))
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const { canvas, viewport } = await renderPageToCanvas(page, scale, grayscale)
    const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
    const image = await outputPdf.embedJpg(await blob.arrayBuffer())
    const outputPage = outputPdf.addPage([viewport.width / scale, viewport.height / scale])
    outputPage.drawImage(image, { x: 0, y: 0, width: viewport.width / scale, height: viewport.height / scale })
  }
  return { download: { blob: await savePdf(outputPdf), filename: `${name}.pdf` } }
}

const selectedPdfPagesToImages: Handler = async (values, name) => {
  const sourcePdf = await loadPdfLibDocument(requirePdfFile(values))
  const pageIndexes = getPageRanges(values, sourcePdf.getPageCount())
  const pdf = await getPdfJsDocument(requirePdfFile(values))
  const format = (str(values, 'image_format') || 'jpg') as 'jpg' | 'png' | 'webp'
  const scale = Math.max(1, Math.min(4, parseFloat(str(values, 'scale') || '2')))
  const zip = new JSZip()
  const mimeTypes = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
  const mimeType = mimeTypes[format] || mimeTypes.jpg
  const extension = format === 'jpg' ? 'jpg' : format
  const images: PdfImagePreview[] = []

  for (const pageIndex of pageIndexes) {
    const pageNumber = pageIndex + 1
    const page = await pdf.getPage(pageNumber)
    const { canvas } = await renderPageToCanvas(page, scale)
    const blob = await canvasToBlob(canvas, mimeType, 0.92)
    zip.file(`${name}-page-${pageNumber}.${extension}`, blob)
    images.push({ url: URL.createObjectURL(blob), label: `Page ${pageNumber}` })
  }

  return { images, download: { blob: await zip.generateAsync({ type: 'blob' }), filename: `${name}.zip` } }
}

const addPdfHeaderFooter: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  const headerText = str(values, 'header_text').trim()
  const footerText = str(values, 'footer_text').trim()
  const fontSize = Math.max(6, Math.min(72, parseInt(str(values, 'font_size') || '11', 10)))
  if (!headerText && !footerText) throw new Error('Please enter header or footer text.')
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  pdfDoc.getPages().forEach((page, index) => {
    const { width, height } = page.getSize()
    const replaceVariables = (value: string) => value.replaceAll('{page}', String(index + 1)).replaceAll('{total}', String(pdfDoc.getPageCount()))
    if (headerText) {
      const text = replaceVariables(headerText)
      const textWidth = font.widthOfTextAtSize(text, fontSize)
      page.drawText(text, { x: (width - textWidth) / 2, y: height - fontSize - 18, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) })
    }
    if (footerText) {
      const text = replaceVariables(footerText)
      const textWidth = font.widthOfTextAtSize(text, fontSize)
      page.drawText(text, { x: (width - textWidth) / 2, y: 18, size: fontSize, font, color: rgb(0.2, 0.2, 0.2) })
    }
  })
  return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
}

const addBatesNumbersToPdf: Handler = async (values, name) => {
  const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
  const pageIndexes = new Set(getPageRanges(values, pdfDoc.getPageCount(), true))
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const prefix = str(values, 'bates_prefix')
  const suffix = str(values, 'bates_suffix')
  const start = Math.max(0, Math.trunc(num(values, 'bates_start', 1)))
  const digits = Math.max(1, Math.min(12, Math.trunc(num(values, 'bates_digits', 6))))
  const fontSize = Math.max(6, Math.min(72, Math.trunc(num(values, 'font_size', 10))))
  const position = str(values, 'bates_position') || 'bottom_right'
  let sequence = start
  pdfDoc.getPages().forEach((page, index) => {
    if (!pageIndexes.has(index)) return
    const label = `${prefix}${String(sequence).padStart(digits, '0')}${suffix}`
    page.drawText(label, { ...getPageNumberPosition(page, label, font, fontSize, position), size: fontSize, font, color: rgb(0.15, 0.15, 0.15) })
    sequence++
  })
  return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
}

const addLetterheadToPdf: Handler = async (values, name) => {
  const baseFile = requirePdfFile(values)
  const overlayFile = asFile(values.overlay_pdf)
  if (!overlayFile) throw new Error('Select an overlay PDF file.')
  const baseBytes = await readArrayBuffer(baseFile)
  const overlayBytes = await readArrayBuffer(overlayFile)
  const basePdf = await PDFDocument.load(baseBytes)
  const overlayPdf = await PDFDocument.load(overlayBytes)
  if (!basePdf.getPageCount() || !overlayPdf.getPageCount()) throw new Error('The PDF files could not be combined.')

  const outputPdf = await PDFDocument.create()
  const overlayPages = await outputPdf.embedPdf(overlayBytes, overlayPdf.getPageIndices())
  const layer = str(values, 'overlay_layer') || 'foreground'
  const pageMode = str(values, 'overlay_page_mode') || 'repeat_first'
  const opacity = Math.max(0.01, Math.min(1, num(values, 'overlay_opacity', 100) / 100))

  if (layer === 'foreground') {
    const copiedPages = await outputPdf.copyPages(basePdf, basePdf.getPageIndices())
    copiedPages.forEach((page) => outputPdf.addPage(page))
    outputPdf.getPages().forEach((page, index) => {
      const { width, height } = page.getSize()
      const overlayIndex = pageMode === 'match_pages' ? Math.min(index, overlayPages.length - 1) : 0
      page.drawPage(overlayPages[overlayIndex], { x: 0, y: 0, width, height, opacity })
    })
  } else {
    const basePages = await outputPdf.embedPdf(baseBytes, basePdf.getPageIndices())
    basePdf.getPages().forEach((basePage, index) => {
      const { width, height } = basePage.getSize()
      const outputPage = outputPdf.addPage([width, height])
      const overlayIndex = pageMode === 'match_pages' ? Math.min(index, overlayPages.length - 1) : 0
      outputPage.drawPage(overlayPages[overlayIndex], { x: 0, y: 0, width, height, opacity })
      outputPage.drawPage(basePages[index], { x: 0, y: 0, width, height })
    })
  }

  return { download: { blob: await savePdf(outputPdf), filename: `${name}.pdf` } }
}

const addPdfMargins: Handler = async (values, name) => {
  const sourcePdf = await loadPdfLibDocument(requirePdfFile(values))
  const outputPdf = await PDFDocument.create()
  const margin = Math.max(0, Math.min(300, num(values, 'margin_size', 36)))
  for (const sourcePage of sourcePdf.getPages()) {
    const { width, height } = sourcePage.getSize()
    const embeddedPage = await outputPdf.embedPage(sourcePage)
    const outputPage = outputPdf.addPage([width + margin * 2, height + margin * 2])
    outputPage.drawPage(embeddedPage, { x: margin, y: margin, width, height })
  }
  return { download: { blob: await savePdf(outputPdf), filename: `${name}.pdf` } }
}

function drawEmbeddedPageInCell(outputPage: import('pdf-lib').PDFPage, embeddedPage: import('pdf-lib').PDFEmbeddedPage, x: number, y: number, width: number, height: number) {
  const fitted = fitBox(embeddedPage.width, embeddedPage.height, width, height)
  outputPage.drawPage(embeddedPage, { x: x + fitted.x, y: y + fitted.y, width: fitted.width, height: fitted.height })
}

const nUpPdf: Handler = async (values, name) => {
  const sourcePdf = await loadPdfLibDocument(requirePdfFile(values))
  const outputPdf = await PDFDocument.create()
  const nUpCount = parseInt(str(values, 'n_up_count') || '2', 10) === 4 ? 4 : 2
  const [pageWidth, pageHeight] = getStandardPageSize(values, 'output_page_size', 'output_page_orientation')
  const columns = nUpCount === 4 ? 2 : 1
  const rows = 2
  const cellWidth = pageWidth / columns
  const cellHeight = pageHeight / rows
  const embeddedPages: import('pdf-lib').PDFEmbeddedPage[] = []
  for (const sourcePage of sourcePdf.getPages()) embeddedPages.push(await outputPdf.embedPage(sourcePage))

  for (let index = 0; index < embeddedPages.length; index += nUpCount) {
    const outputPage = outputPdf.addPage([pageWidth, pageHeight])
    for (let cellIndex = 0; cellIndex < nUpCount; cellIndex++) {
      const embeddedPage = embeddedPages[index + cellIndex]
      if (!embeddedPage) continue
      const column = cellIndex % columns
      const row = Math.floor(cellIndex / columns)
      const x = column * cellWidth
      const y = pageHeight - (row + 1) * cellHeight
      drawEmbeddedPageInCell(outputPage, embeddedPage, x, y, cellWidth, cellHeight)
    }
  }
  return { download: { blob: await savePdf(outputPdf), filename: `${name}.pdf` } }
}

const bookletPdf: Handler = async (values, name) => {
  const sourcePdf = await loadPdfLibDocument(requirePdfFile(values))
  const outputPdf = await PDFDocument.create()
  const baseSize = standardPageSizes[str(values, 'output_page_size')] || standardPageSizes.a4
  const pageWidth = baseSize[1]
  const pageHeight = baseSize[0]
  const cellWidth = pageWidth / 2
  const embeddedPages: import('pdf-lib').PDFEmbeddedPage[] = []
  for (const sourcePage of sourcePdf.getPages()) embeddedPages.push(await outputPdf.embedPage(sourcePage))

  const originalPageCount = embeddedPages.length
  const totalPages = Math.ceil(originalPageCount / 4) * 4
  const getEmbeddedPage = (pageNumber: number) => (pageNumber <= originalPageCount ? embeddedPages[pageNumber - 1] : null)

  for (let sheet = 0; sheet < totalPages / 4; sheet++) {
    const spreads = [
      [totalPages - sheet * 2, 1 + sheet * 2],
      [2 + sheet * 2, totalPages - sheet * 2 - 1],
    ]
    for (const spread of spreads) {
      const outputPage = outputPdf.addPage([pageWidth, pageHeight])
      const leftPage = getEmbeddedPage(spread[0])
      const rightPage = getEmbeddedPage(spread[1])
      if (leftPage) drawEmbeddedPageInCell(outputPage, leftPage, 0, 0, cellWidth, pageHeight)
      if (rightPage) drawEmbeddedPageInCell(outputPage, rightPage, cellWidth, 0, cellWidth, pageHeight)
    }
  }
  return { download: { blob: await savePdf(outputPdf), filename: `${name}.pdf` } }
}

const pdfContactSheet: Handler = async (values, name) => {
  const pdf = await getPdfJsDocument(requirePdfFile(values))
  const outputPdf = await PDFDocument.create()
  const [pageWidth, pageHeight] = getStandardPageSize(values, 'output_page_size', 'output_page_orientation')
  const columns = Math.max(2, Math.min(5, parseInt(str(values, 'contact_sheet_columns') || '3', 10)))
  const margin = 24
  const gap = 12
  const captionHeight = 16
  const cellWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns
  const cellHeight = cellWidth * 1.35
  const rows = Math.max(1, Math.floor((pageHeight - margin * 2) / (cellHeight + captionHeight + gap)))
  const font = await outputPdf.embedFont(StandardFonts.Helvetica)
  let outputPage: import('pdf-lib').PDFPage | null = null

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const cellIndex = (pageNumber - 1) % (columns * rows)
    if (cellIndex === 0) outputPage = outputPdf.addPage([pageWidth, pageHeight])
    const sourcePage = await pdf.getPage(pageNumber)
    const { canvas } = await renderPageToCanvas(sourcePage, 0.35)
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.82)
    const image = await outputPdf.embedJpg(await blob.arrayBuffer())
    const column = cellIndex % columns
    const row = Math.floor(cellIndex / columns)
    const x = margin + column * (cellWidth + gap)
    const y = pageHeight - margin - (row + 1) * (cellHeight + captionHeight + gap) + captionHeight + gap
    const fitted = fitBox(image.width, image.height, cellWidth, cellHeight)
    const caption = `Page ${pageNumber}`
    const captionWidth = font.widthOfTextAtSize(caption, 9)
    outputPage!.drawImage(image, { x: x + fitted.x, y: y + fitted.y, width: fitted.width, height: fitted.height })
    outputPage!.drawText(caption, { x: x + (cellWidth - captionWidth) / 2, y: y - captionHeight, size: 9, font, color: rgb(0.25, 0.25, 0.25) })
  }
  return { download: { blob: await savePdf(outputPdf), filename: `${name}.pdf` } }
}

const signPdf: Handler = async (values, name) => {
  const signatureFile = asFile(values.signature_image)
  const signatureDataUrl = typeof values.signature_data === 'string' ? values.signature_data : ''
  if (!signatureFile && !signatureDataUrl) throw new Error('Draw or upload a signature.')
  try {
    const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
    const pageIndexes = new Set(getPageRanges(values, pdfDoc.getPageCount(), true))
    let signatureBytes: ArrayBuffer
    if (signatureFile) {
      signatureBytes = await imageToPngArrayBuffer(signatureFile)
    } else {
      const response = await fetch(signatureDataUrl)
      signatureBytes = await (await response.blob()).arrayBuffer()
    }
    const signature = await pdfDoc.embedPng(signatureBytes)
    const requestedWidth = Math.max(36, Math.min(600, num(values, 'signature_width', 144)))
    const position = str(values, 'signature_position') || 'bottom_right'
    pdfDoc.getPages().forEach((page, index) => {
      if (!pageIndexes.has(index)) return
      const { width: pageWidth, height: pageHeight } = page.getSize()
      const maximumWidth = Math.max(1, pageWidth - 72)
      const maximumHeight = Math.max(1, pageHeight - 72)
      const scale = Math.min(requestedWidth / signature.width, maximumWidth / signature.width, maximumHeight / signature.height)
      const width = signature.width * scale
      const height = signature.height * scale
      page.drawImage(signature, { ...getPlacementPosition(pageWidth, pageHeight, width, height, position), width, height })
    })
    return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
  } catch (error) {
    console.error(error)
    throw new Error('The signature could not be added. Password-protected or damaged PDFs and unreadable images are not supported.')
  }
}

const addPdfAttachments: Handler = async (values, name) => {
  const attachmentFiles = asFiles(values.attachment_files)
  if (!attachmentFiles.length) throw new Error('Select one or more files.')
  try {
    const pdfDoc = await loadPdfLibDocument(requirePdfFile(values))
    const description = str(values, 'attachment_description').trim()
    for (const file of attachmentFiles) {
      const options: { mimeType: string; description?: string } = { mimeType: file.type || 'application/octet-stream' }
      if (description) options.description = description
      await pdfDoc.attach(await readUint8Array(file), file.name || 'attachment', options)
    }
    return { download: { blob: await savePdf(pdfDoc), filename: `${name}.pdf` } }
  } catch (error) {
    console.error(error)
    throw new Error('The files could not be attached to the PDF.')
  }
}

const extractPdfAttachments: Handler = async (values, name) => {
  try {
    const pdf = await getPdfJsDocument(requirePdfFile(values))
    const attachments = await pdf.getAttachments() as Record<string, { filename?: string; content: Uint8Array }> | null
    if (!attachments || !Object.keys(attachments).length) throw new Error('No embedded attachments were found.')
    const zip = new JSZip()
    const filenames: string[] = []
    const usedFilenames = new Set<string>()
    for (const [key, attachment] of Object.entries(attachments)) {
      const filename = getSafeZipFilename(attachment.filename || key, usedFilenames)
      zip.file(filename, attachment.content)
      filenames.push(filename)
    }
    return { text: filenames.join('\n'), download: { blob: await zip.generateAsync({ type: 'blob' }), filename: `${name}.zip` } }
  } catch (error) {
    if (error instanceof Error && error.message === 'No embedded attachments were found.') throw error
    console.error(error)
    throw new Error('The PDF attachments could not be extracted.')
  }
}

const removeBlankPdfPages: Handler = async (values, name) => {
  const file = requirePdfFile(values)
  const sourcePdf = await loadPdfLibDocument(file)
  const pdf = await getPdfJsDocument(file)
  const threshold = Math.max(0, Math.min(10, num(values, 'blank_page_threshold', 0.1)))
  const blankPageIndexes: number[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const { canvas } = await renderPageToCanvas(page, 0.35)
    const context = canvas.getContext('2d')!
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data
    const sampleStep = 4
    let samples = 0
    let inkPixels = 0
    for (let y = 0; y < canvas.height; y += sampleStep) {
      for (let x = 0; x < canvas.width; x += sampleStep) {
        const offset = (y * canvas.width + x) * 4
        const alpha = data[offset + 3]
        const brightness = (data[offset] + data[offset + 1] + data[offset + 2]) / 3
        samples++
        if (alpha > 16 && brightness < 245) inkPixels++
      }
    }
    const inkCoverage = samples ? (inkPixels / samples) * 100 : 0
    if (inkCoverage <= threshold) blankPageIndexes.push(pageNumber - 1)
  }

  if (!blankPageIndexes.length) throw new Error('No blank pages were detected.')
  if (blankPageIndexes.length === sourcePdf.getPageCount()) throw new Error('All pages were detected as blank.')

  const blankPages = new Set(blankPageIndexes)
  const remainingPages = sourcePdf.getPageIndices().filter((index) => !blankPages.has(index))
  const outputPdf = await createPdfFromPages(sourcePdf, remainingPages)
  return {
    text: `Removed pages: ${blankPageIndexes.map((index) => index + 1).join(', ')}`,
    download: { blob: await savePdf(outputPdf), filename: `${name}.pdf` },
  }
}

const passwordUnsupported: Handler = async () => {
  throw new Error('Password protection requires the qpdf WebAssembly module, which is not bundled in this build. Use the original tool for encrypting or decrypting PDFs.')
}

// ---- Handler registry ------------------------------------------------------

const handlers: Record<string, Handler> = {
  merge_pdf: mergePdf,
  split_pdf: splitPdf,
  extract_pdf_pages: extractPdfPages,
  remove_pdf_pages: removePdfPages,
  reorder_pdf_pages: reorderPdfPages,
  rotate_pdf_pages: rotatePdfPages,
  add_pdf_page_numbers: addPdfPageNumbers,
  add_text_watermark_to_pdf: addTextWatermarkToPdf,
  add_image_watermark_to_pdf: addImageWatermarkToPdf,
  sign_pdf: signPdf,
  add_pdf_attachments: addPdfAttachments,
  extract_pdf_attachments: extractPdfAttachments,
  protect_pdf_with_password: passwordUnsupported,
  remove_pdf_password: passwordUnsupported,
  remove_pdf_metadata: removePdfMetadata,
  pdf_metadata_viewer: viewPdfMetadata,
  edit_pdf_metadata: editPdfMetadata,
  pdf_page_counter: countPdfPages,
  pdf_page_size_checker: checkPdfPageSizes,
  crop_pdf_pages: cropPdfPages,
  resize_pdf_pages: resizePdfPages,
  add_blank_pages_to_pdf: addBlankPagesToPdf,
  remove_blank_pdf_pages: removeBlankPdfPages,
  duplicate_pdf_pages: duplicatePdfPages,
  reverse_pdf_pages: reversePdfPages,
  flatten_pdf_forms: flattenPdfForms,
  extract_pdf_text: extractPdfText,
  pdf_to_jpg: (values, name) => renderPdfPages(values, name, 'jpg', false),
  pdf_to_png: (values, name) => renderPdfPages(values, name, 'png', false),
  pdf_to_webp: (values, name) => renderPdfPages(values, name, 'webp', false),
  pdf_selected_pages_to_images: selectedPdfPagesToImages,
  images_to_pdf: imagesToPdf,
  webp_to_pdf: webpToPdf,
  jpg_to_pdf: imagesToPdf,
  png_to_pdf: imagesToPdf,
  compress_pdf: (values, name) => rasterizePdfToPdf(values, name, false),
  grayscale_pdf: (values, name) => rasterizePdfToPdf(values, name, true),
  add_pdf_header_footer: addPdfHeaderFooter,
  add_bates_numbers_to_pdf: addBatesNumbersToPdf,
  add_letterhead_to_pdf: addLetterheadToPdf,
  add_pdf_margins: addPdfMargins,
  pdf_n_up: nUpPdf,
  pdf_booklet: bookletPdf,
  pdf_contact_sheet: pdfContactSheet,
  pdf_viewer: (values, name) => renderPdfPages(values, name, 'png', true),
}

export function isPdfTool(slug: string): boolean {
  return slug in handlers
}

export async function runPdfTool(slug: string, values: PdfValues, downloadName?: string): Promise<PdfResult> {
  const handler = handlers[slug]
  if (!handler) throw new Error('Something went wrong.')
  return handler(values, downloadName || slug)
}
