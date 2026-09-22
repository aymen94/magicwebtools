// Canonical site origin used for metadata, sitemaps and structured data.
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://magicwebtools.app').replace(/\/$/, '')

export type ToolMode = 'converter' | 'text' | 'developer' | 'generator' | 'browser' | 'backend' | 'system'
export type ToolIconName = 'ruler' | 'text' | 'convert' | 'code' | 'generate' | 'check' | 'image' | 'pdf' | 'system'

export type ToolDefinition = {
  slug: string
  name: string
  description: string
  category: string
  mode: ToolMode
  icon: ToolIconName
  input: 'text' | 'file' | 'length' | 'backend' | 'system'
  browserReady?: boolean
  // Tools that link to a dedicated page instead of the generic workbench.
  href?: string
}

const friendlyDescriptions: Partial<Record<string, string>> = {
  merge_pdf: 'Combine multiple PDF files into one document.',
  split_pdf: 'Split one PDF into separate documents.',
  extract_pdf_pages: 'Save only the pages you need from a PDF.',
  remove_pdf_pages: 'Remove selected pages from a PDF document.',
  reorder_pdf_pages: 'Put PDF pages in the order you want.',
  rotate_pdf_pages: 'Turn PDF pages to the correct orientation.',
  compress_pdf: 'Reduce a PDF file size for easier sharing.',
  pdf_to_jpg: 'Turn PDF pages into JPG images.',
  pdf_to_png: 'Turn PDF pages into PNG images.',
  images_to_pdf: 'Create one PDF document from your images.',
  sign_pdf: 'Add your signature to a PDF document.',
  image_optimizer: 'Make an image file smaller while keeping it clear.',
  password_generator: 'Create a strong password you can use right away.',
  json_validator_beautifier: 'Check JSON for errors and make it easier to read.',
}

function getDescription(slug: string, category: string) {
  if (friendlyDescriptions[slug]) return friendlyDescriptions[slug]
  if (category === 'PDF tools') return 'Make a quick change to your PDF document.'
  if (category === 'Image tools') return 'Upload an image and make the change you need.'
  if (category === 'Checker tools') return 'Check a website, address, or file for useful details.'
  if (category === 'Unit converter tools') return 'Convert a measurement from one unit to another.'
  return `Use this ${category.toLowerCase()} tool quickly and privately.`
}

const makeTools = (category: string, mode: ToolMode, icon: ToolIconName, slugs: string[], input: ToolDefinition['input'] = mode === 'backend' ? 'backend' : mode === 'converter' ? 'text' : 'text') => slugs.map((slug) => ({
  slug,
  name: slug.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
  description: getDescription(slug, category),
  category,
  mode,
  icon,
  input,
  browserReady: mode !== 'backend',
}))

const converterPairs = (units: string[]) => units.flatMap((from) => units.filter((to) => to !== from).map((to) => `${from}_to_${to}`))
const generatedConverters = [
  ...converterPairs(['milligrams', 'grams', 'kilograms', 'metric_tons', 'ounces', 'pounds', 'stones']),
  ...converterPairs(['milliliters', 'liters', 'cubic_meters', 'teaspoons', 'tablespoons', 'fluid_ounces', 'cups', 'pints', 'quarts', 'gallons']),
  ...converterPairs(['square_millimeters', 'square_centimeters', 'square_meters', 'square_kilometers', 'square_inches', 'square_feet', 'square_yards', 'acres', 'hectares']),
  ...converterPairs(['newtons', 'kilonewtons', 'dynes', 'pound_force', 'kilogram_force']),
  ...converterPairs(['pascals', 'kilopascals', 'megapascals', 'bars', 'atmospheres', 'psi', 'torr']),
  ...converterPairs(['joules', 'kilojoules', 'calories', 'kilocalories', 'watt_hours', 'kilowatt_hours', 'electronvolts']),
  ...converterPairs(['watts', 'kilowatts', 'megawatts', 'horsepower']),
  ...converterPairs(['meters_per_second', 'kilometers_per_hour', 'miles_per_hour', 'feet_per_second', 'knots']),
  ...converterPairs(['hertz', 'kilohertz', 'megahertz', 'gigahertz']),
  ...converterPairs(['degrees', 'radians', 'gradians', 'arcminutes', 'arcseconds']),
  ...converterPairs(['newton_meters', 'pound_force_feet', 'kilogram_force_meters']),
  ...converterPairs(['seconds', 'milliseconds', 'microseconds', 'nanoseconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years', 'decades', 'centuries', 'millennia']),
  ...converterPairs(['bits', 'nibbles', 'bytes', 'kilobits', 'kibibits', 'kilobytes', 'kibibytes', 'megabits', 'mebibits', 'megabytes', 'mebibytes', 'gigabits', 'gibibits', 'gigabytes', 'gibibytes']),
  ...converterPairs(['kilometers_per_liter', 'miles_per_gallon_us', 'miles_per_gallon_uk', 'miles_per_liter', 'liters_per_100_kilometers', 'gallons_us_per_100_miles', 'gallons_uk_per_100_miles']),
]

export const tools: ToolDefinition[] = [
  ...makeTools('Unit converter tools', 'converter', 'ruler', ['length_converter', ...generatedConverters]),
  ...makeTools('Text tools', 'text', 'text', ['text_separator', 'email_extractor', 'url_extractor', 'text_size_calculator', 'duplicate_lines_remover', 'text_to_speech', 'idn_punnycode_converter', 'case_converter', 'character_counter', 'list_randomizer', 'reverse_words', 'reverse_letters', 'emojis_remover', 'reverse_list', 'list_alphabetizer', 'upside_down_text_generator', 'old_english_text_generator', 'cursive_text_generator', 'palindrome_checker']),
  ...makeTools('Converter tools', 'converter', 'convert', ['base64_encoder', 'base64_decoder', 'base64_to_image', 'image_to_base64', 'url_encoder', 'url_decoder', 'color_converter', 'binary_converter', 'hex_converter', 'ascii_converter', 'decimal_converter', 'octal_converter', 'morse_converter', 'number_to_words_converter', 'json_to_php_array_converter', 'celsius_to_fahrenheit', 'celsius_to_kelvin', 'fahrenheit_to_celsius', 'fahrenheit_to_kelvin', 'kelvin_to_celsius', 'kelvin_to_fahrenheit', 'kilometers_per_hour_to_miles_per_hour', 'miles_per_hour_to_kilometers_per_hour', 'number_to_roman_numerals', 'roman_numerals_to_number', 'unix_timestamp_to_date', 'date_to_unix_timestamp']),
  ...makeTools('Developer tools', 'developer', 'code', ['html_minifier', 'css_minifier', 'js_minifier', 'json_validator_beautifier', 'sql_beautifier', 'html_entity_converter', 'bbcode_to_html', 'markdown_to_html', 'html_tags_remover', 'user_agent_parser', 'url_parser']),
  ...makeTools('Generator tools', 'generator', 'generate', ['md5_generator', 'md4_generator', 'whirlpool_generator', 'sha1_generator', 'sha224_generator', 'sha256_generator', 'sha384_generator', 'sha512_generator', 'sha512_224_generator', 'sha512_256_generator', 'sha3_224_generator', 'sha3_256_generator', 'sha3_384_generator', 'sha3_512_generator', 'ripemd160_generator', 'uuid_v4_generator', 'bcrypt_generator', 'password_generator', 'lorem_ipsum_generator', 'random_number_generator', 'slug_generator', 'mailto_link_generator', 'paypal_link_generator', 'whatsapp_link_generator', 'utm_link_generator', 'youtube_timestamp_link_generator', 'signature_generator']),
  ...makeTools('Checker tools', 'backend', 'check', ['dns_lookup', 'ip_lookup', 'reverse_ip_lookup', 'ssl_lookup', 'whois_lookup', 'ping', 'http_headers_lookup', 'http2_checker', 'brotli_checker', 'safe_url_checker', 'google_cache_checker', 'url_redirect_checker', 'password_strength_checker', 'meta_tags_checker', 'website_hosting_checker', 'file_mime_type_checker', 'gravatar_checker']),
  ...makeTools('Image tools', 'browser', 'image', ['image_optimizer', 'qr_code_reader', 'barcode_reader', 'exif_reader', 'color_picker', 'youtube_thumbnail_downloader'], 'file'),
  ...makeTools('PDF tools', 'browser', 'pdf', ['merge_pdf', 'split_pdf', 'extract_pdf_pages', 'remove_pdf_pages', 'reorder_pdf_pages', 'rotate_pdf_pages', 'add_pdf_page_numbers', 'add_text_watermark_to_pdf', 'add_image_watermark_to_pdf', 'remove_pdf_metadata', 'pdf_metadata_viewer', 'edit_pdf_metadata', 'pdf_page_counter', 'pdf_page_size_checker', 'crop_pdf_pages', 'resize_pdf_pages', 'add_blank_pages_to_pdf', 'duplicate_pdf_pages', 'reverse_pdf_pages', 'flatten_pdf_forms', 'extract_pdf_text', 'pdf_to_jpg', 'pdf_to_png', 'pdf_to_webp', 'images_to_pdf', 'webp_to_pdf', 'jpg_to_pdf', 'png_to_pdf', 'compress_pdf', 'grayscale_pdf', 'pdf_selected_pages_to_images', 'add_pdf_header_footer', 'add_pdf_margins', 'pdf_n_up', 'pdf_booklet', 'pdf_contact_sheet', 'pdf_viewer', 'sign_pdf', 'add_pdf_attachments', 'extract_pdf_attachments', 'remove_blank_pdf_pages', 'add_bates_numbers_to_pdf', 'add_letterhead_to_pdf', 'protect_pdf_with_password', 'remove_pdf_password'], 'file'),
  {
    slug: 'pwa',
    name: 'PWA system',
    description: 'Make the whole site installable and PWA compatible with an app manifest, offline caching, and an install prompt.',
    category: 'System tools',
    mode: 'system',
    icon: 'system',
    input: 'system',
    browserReady: true,
    href: '/plugins/pwa',
  },
  {
    slug: 'push-notifications',
    name: 'Push notifications',
    description: 'Subscribe visitors and send them web push notifications with ease.',
    category: 'System tools',
    mode: 'system',
    icon: 'system',
    input: 'system',
    browserReady: true,
    href: '/plugins/push-notifications',
  },
]

export const toolCategories = ['All tools', ...Array.from(new Set(tools.map((tool) => tool.category)))]

const categoryIcons: Record<string, ToolIconName> = {
  'Unit converter tools': 'ruler',
  'Text tools': 'text',
  'Converter tools': 'convert',
  'Developer tools': 'code',
  'Generator tools': 'generate',
  'Checker tools': 'check',
  'Image tools': 'image',
  'PDF tools': 'pdf',
  'System tools': 'system',
}

export function categoryIcon(category: string): ToolIconName {
  return categoryIcons[category] ?? 'code'
}

export function getTool(slug: string) {
  return tools.find((tool) => tool.slug === slug)
}