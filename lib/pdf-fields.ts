// Per-tool form field definitions for the native PDF tools.
// Mirrors the inputs the original PHP pdf_tools.js reads by element id.

export type PdfFieldType =
  | 'pdf_file'        // single PDF file input
  | 'pdf_files'       // multiple PDF file input
  | 'image_files'     // multiple image file input
  | 'file'            // a single generic file input (id supplied)
  | 'text'
  | 'textarea'
  | 'number'
  | 'password'
  | 'select'
  | 'signature'       // signature pad + optional upload

export type PdfField = {
  id: string
  type: PdfFieldType
  label: string
  placeholder?: string
  optional?: boolean
  accept?: string
  min?: number
  max?: number
  step?: number
  defaultValue?: string
  help?: string
  options?: { value: string; label: string }[]
}

const positionOptions = [
  { value: 'bottom_center', label: 'Bottom center' },
  { value: 'bottom_right', label: 'Bottom right' },
  { value: 'bottom_left', label: 'Bottom left' },
  { value: 'top_center', label: 'Top center' },
  { value: 'top_right', label: 'Top right' },
  { value: 'top_left', label: 'Top left' },
]

const signaturePositionOptions = [
  { value: 'bottom_right', label: 'Bottom right' },
  { value: 'bottom_left', label: 'Bottom left' },
  { value: 'bottom_center', label: 'Bottom center' },
  { value: 'top_right', label: 'Top right' },
  { value: 'top_left', label: 'Top left' },
  { value: 'center', label: 'Center' },
]

const pageSizeOptions = [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
  { value: 'legal', label: 'Legal' },
]

const orientationOptions = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
]

const imageFormatOptions = [
  { value: 'jpg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
]

const pdfFile = (): PdfField => ({ id: 'pdf_file', type: 'pdf_file', label: 'PDF file', accept: 'application/pdf' })
const pageRanges = (optional = false): PdfField => ({ id: 'page_ranges', type: 'text', label: 'Page ranges', placeholder: 'e.g. 1-3, 5, 8', optional, help: optional ? 'Leave empty to apply to all pages.' : 'Use ranges like 1-3, 5, 8.' })

export const pdfToolFields: Record<string, PdfField[]> = {
  merge_pdf: [{ id: 'pdf_files', type: 'pdf_files', label: 'PDF files', accept: 'application/pdf' }],
  split_pdf: [pdfFile(), pageRanges()],
  extract_pdf_pages: [pdfFile(), pageRanges()],
  remove_pdf_pages: [pdfFile(), pageRanges()],
  reorder_pdf_pages: [pdfFile(), { ...pageRanges(), id: 'page_ranges', label: 'Page order', placeholder: 'e.g. 3, 1, 2', help: 'List every page in the order you want.' }],
  rotate_pdf_pages: [
    pdfFile(),
    pageRanges(true),
    { id: 'rotation', type: 'select', label: 'Rotation', defaultValue: '90', options: [
      { value: '90', label: '90° clockwise' },
      { value: '180', label: '180°' },
      { value: '270', label: '270° clockwise' },
    ] },
  ],
  add_pdf_page_numbers: [
    pdfFile(),
    { id: 'page_number_position', type: 'select', label: 'Position', defaultValue: 'bottom_center', options: positionOptions },
  ],
  add_text_watermark_to_pdf: [pdfFile(), { id: 'watermark_text', type: 'text', label: 'Watermark text', placeholder: 'CONFIDENTIAL' }],
  add_image_watermark_to_pdf: [pdfFile(), { id: 'watermark_image', type: 'file', label: 'Watermark image', accept: 'image/png,image/jpeg' }],
  remove_pdf_metadata: [pdfFile()],
  pdf_metadata_viewer: [pdfFile()],
  edit_pdf_metadata: [
    pdfFile(),
    { id: 'metadata_title', type: 'text', label: 'Title', optional: true },
    { id: 'metadata_author', type: 'text', label: 'Author', optional: true },
    { id: 'metadata_subject', type: 'text', label: 'Subject', optional: true },
    { id: 'metadata_keywords', type: 'text', label: 'Keywords', optional: true, placeholder: 'comma, separated, keywords' },
    { id: 'metadata_creator', type: 'text', label: 'Creator', optional: true },
  ],
  pdf_page_counter: [pdfFile()],
  pdf_page_size_checker: [pdfFile()],
  crop_pdf_pages: [
    pdfFile(),
    pageRanges(true),
    { id: 'crop_top', type: 'number', label: 'Top', defaultValue: '0', min: 0 },
    { id: 'crop_right', type: 'number', label: 'Right', defaultValue: '0', min: 0 },
    { id: 'crop_bottom', type: 'number', label: 'Bottom', defaultValue: '0', min: 0 },
    { id: 'crop_left', type: 'number', label: 'Left', defaultValue: '0', min: 0 },
  ],
  resize_pdf_pages: [
    pdfFile(),
    { id: 'resize_mode', type: 'select', label: 'Resize mode', defaultValue: 'fit', options: [
      { value: 'fit', label: 'Fit' },
      { value: 'stretch', label: 'Stretch' },
    ] },
    { id: 'page_size', type: 'select', label: 'Page size', defaultValue: 'a4', options: pageSizeOptions },
    { id: 'page_orientation', type: 'select', label: 'Orientation', defaultValue: 'portrait', options: orientationOptions },
  ],
  add_blank_pages_to_pdf: [
    pdfFile(),
    { id: 'blank_pages_count', type: 'number', label: 'Blank pages', defaultValue: '1', min: 1, max: 100 },
    { id: 'blank_pages_position', type: 'select', label: 'Position', defaultValue: 'end', options: [
      { value: 'end', label: 'End' },
      { value: 'start', label: 'Start' },
      { value: 'after', label: 'After page' },
    ] },
    { id: 'blank_pages_after', type: 'number', label: 'After page number', defaultValue: '1', min: 1, optional: true },
  ],
  duplicate_pdf_pages: [pdfFile(), pageRanges()],
  reverse_pdf_pages: [pdfFile()],
  flatten_pdf_forms: [pdfFile()],
  extract_pdf_text: [pdfFile()],
  pdf_to_jpg: [pdfFile(), { id: 'scale', type: 'number', label: 'Scale', defaultValue: '2', min: 1, max: 4, step: 0.5 }],
  pdf_to_png: [pdfFile(), { id: 'scale', type: 'number', label: 'Scale', defaultValue: '2', min: 1, max: 4, step: 0.5 }],
  pdf_to_webp: [pdfFile(), { id: 'scale', type: 'number', label: 'Scale', defaultValue: '2', min: 1, max: 4, step: 0.5 }],
  pdf_selected_pages_to_images: [
    pdfFile(),
    pageRanges(),
    { id: 'image_format', type: 'select', label: 'Image format', defaultValue: 'jpg', options: imageFormatOptions },
    { id: 'scale', type: 'number', label: 'Scale', defaultValue: '2', min: 1, max: 4, step: 0.5 },
  ],
  images_to_pdf: [{ id: 'image_files', type: 'image_files', label: 'Image files', accept: 'image/png,image/jpeg' }],
  webp_to_pdf: [{ id: 'image_files', type: 'image_files', label: 'WebP files', accept: 'image/webp' }],
  jpg_to_pdf: [{ id: 'image_files', type: 'image_files', label: 'JPG files', accept: 'image/jpeg' }],
  png_to_pdf: [{ id: 'image_files', type: 'image_files', label: 'PNG files', accept: 'image/png' }],
  compress_pdf: [
    pdfFile(),
    { id: 'scale', type: 'number', label: 'Scale', defaultValue: '1.5', min: 0.5, max: 4, step: 0.5 },
    { id: 'quality', type: 'number', label: 'Quality', defaultValue: '75', min: 1, max: 100 },
  ],
  grayscale_pdf: [
    pdfFile(),
    { id: 'scale', type: 'number', label: 'Scale', defaultValue: '1.5', min: 0.5, max: 4, step: 0.5 },
    { id: 'quality', type: 'number', label: 'Quality', defaultValue: '75', min: 1, max: 100 },
  ],
  add_pdf_header_footer: [
    pdfFile(),
    { id: 'header_text', type: 'text', label: 'Header text', optional: true, placeholder: 'Use {page} and {total}' },
    { id: 'footer_text', type: 'text', label: 'Footer text', optional: true, placeholder: 'Use {page} and {total}' },
    { id: 'font_size', type: 'number', label: 'Font size', defaultValue: '11', min: 6, max: 72 },
  ],
  add_pdf_margins: [pdfFile(), { id: 'margin_size', type: 'number', label: 'Margin size', defaultValue: '36', min: 0, max: 300 }],
  pdf_n_up: [
    pdfFile(),
    { id: 'n_up_count', type: 'select', label: 'Pages per sheet', defaultValue: '2', options: [
      { value: '2', label: '2 pages' },
      { value: '4', label: '4 pages' },
    ] },
    { id: 'output_page_size', type: 'select', label: 'Page size', defaultValue: 'a4', options: pageSizeOptions },
    { id: 'output_page_orientation', type: 'select', label: 'Orientation', defaultValue: 'portrait', options: orientationOptions },
  ],
  pdf_booklet: [
    pdfFile(),
    { id: 'output_page_size', type: 'select', label: 'Page size', defaultValue: 'a4', options: pageSizeOptions },
  ],
  pdf_contact_sheet: [
    pdfFile(),
    { id: 'contact_sheet_columns', type: 'number', label: 'Columns', defaultValue: '3', min: 2, max: 5 },
    { id: 'output_page_size', type: 'select', label: 'Page size', defaultValue: 'a4', options: pageSizeOptions },
    { id: 'output_page_orientation', type: 'select', label: 'Orientation', defaultValue: 'portrait', options: orientationOptions },
  ],
  pdf_viewer: [pdfFile(), { id: 'scale', type: 'number', label: 'Scale', defaultValue: '2', min: 1, max: 4, step: 0.5 }],
  sign_pdf: [
    pdfFile(),
    pageRanges(true),
    { id: 'signature_image', type: 'signature', label: 'Signature', optional: true, accept: 'image/png' },
    { id: 'signature_position', type: 'select', label: 'Signature position', defaultValue: 'bottom_right', options: signaturePositionOptions },
    { id: 'signature_width', type: 'number', label: 'Signature width', defaultValue: '144', min: 36, max: 600 },
  ],
  add_pdf_attachments: [
    pdfFile(),
    { id: 'attachment_files', type: 'file', label: 'Files to attach', accept: '*/*' },
    { id: 'attachment_description', type: 'text', label: 'Attachment description', optional: true },
  ],
  extract_pdf_attachments: [pdfFile()],
  remove_blank_pdf_pages: [pdfFile(), { id: 'blank_page_threshold', type: 'number', label: 'Maximum ink coverage', defaultValue: '0.1', min: 0, max: 10, step: 0.1 }],
  add_bates_numbers_to_pdf: [
    pdfFile(),
    pageRanges(true),
    { id: 'bates_prefix', type: 'text', label: 'Prefix', optional: true },
    { id: 'bates_suffix', type: 'text', label: 'Suffix', optional: true },
    { id: 'bates_start', type: 'number', label: 'Starting number', defaultValue: '1', min: 0 },
    { id: 'bates_digits', type: 'number', label: 'Number of digits', defaultValue: '6', min: 1, max: 12 },
    { id: 'font_size', type: 'number', label: 'Font size', defaultValue: '10', min: 6, max: 72 },
    { id: 'bates_position', type: 'select', label: 'Position', defaultValue: 'bottom_right', options: positionOptions },
  ],
  add_letterhead_to_pdf: [
    pdfFile(),
    { id: 'overlay_pdf', type: 'file', label: 'Letterhead or overlay template PDF', accept: 'application/pdf' },
    { id: 'overlay_layer', type: 'select', label: 'Layer', defaultValue: 'foreground', options: [
      { value: 'foreground', label: 'Foreground' },
      { value: 'background', label: 'Background' },
    ] },
    { id: 'overlay_page_mode', type: 'select', label: 'Overlay pages', defaultValue: 'repeat_first', options: [
      { value: 'repeat_first', label: 'Repeat first page' },
      { value: 'match_pages', label: 'Match pages, repeat last' },
    ] },
    { id: 'overlay_opacity', type: 'number', label: 'Opacity', defaultValue: '100', min: 1, max: 100 },
  ],
  protect_pdf_with_password: [
    pdfFile(),
    { id: 'pdf_password', type: 'password', label: 'New PDF password' },
    { id: 'pdf_password_repeat', type: 'password', label: 'Repeat PDF password' },
  ],
  remove_pdf_password: [
    pdfFile(),
    { id: 'pdf_password', type: 'password', label: 'Current PDF password' },
  ],
}

export function getPdfFields(slug: string): PdfField[] {
  return pdfToolFields[slug] ?? [pdfFile()]
}
