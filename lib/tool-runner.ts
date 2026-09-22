import { convertToolValue } from './converters'
import { toUnicode, toASCII } from 'punycode.js'
import { asyncToolSlugs } from './async-tools'

const morse: Record<string, string> = {
  a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
}

const browserToolSlugs = new Set([
  'text_separator', 'email_extractor', 'url_extractor', 'text_size_calculator', 'duplicate_lines_remover', 'case_converter', 'character_counter', 'list_randomizer', 'reverse_words', 'reverse_letters', 'emojis_remover', 'reverse_list', 'list_alphabetizer', 'palindrome_checker',
  'base64_encoder', 'base64_decoder', 'url_encoder', 'url_decoder', 'binary_converter', 'hex_converter', 'ascii_converter', 'decimal_converter', 'octal_converter', 'morse_converter', 'celsius_to_fahrenheit', 'celsius_to_kelvin', 'fahrenheit_to_celsius', 'fahrenheit_to_kelvin', 'kelvin_to_celsius', 'kelvin_to_fahrenheit', 'kilometers_per_hour_to_miles_per_hour', 'miles_per_hour_to_kilometers_per_hour', 'unix_timestamp_to_date', 'date_to_unix_timestamp',
  'html_minifier', 'css_minifier', 'js_minifier', 'json_validator_beautifier', 'html_entity_converter', 'html_tags_remover', 'markdown_to_html',
  'uuid_v4_generator', 'password_generator', 'lorem_ipsum_generator', 'random_number_generator', 'slug_generator',
])

export function canRunInBrowser(slug: string) {
  return browserToolSlugs.has(slug) || isClientConverter(slug) || clientOnlyTools.has(slug) || asyncToolSlugs.has(slug)
}
const clientOnlyTools = new Set([
  'base64_to_image', 'image_to_base64', 'color_converter', 'number_to_words_converter', 'number_to_roman_numerals', 'roman_numerals_to_number',
  'upside_down_text_generator', 'old_english_text_generator', 'cursive_text_generator', 'sql_beautifier', 'bbcode_to_html', 'user_agent_parser', 'url_parser',
  'mailto_link_generator', 'paypal_link_generator', 'whatsapp_link_generator', 'utm_link_generator', 'youtube_timestamp_link_generator', 'signature_generator', 'password_strength_checker', 'youtube_thumbnail_downloader',
  'idn_punnycode_converter', 'json_to_php_array_converter',
])

const clientConverterExclusions = [
  'base64_to_image', 'image_to_base64', 'celsius_to_fahrenheit', 'celsius_to_kelvin', 'fahrenheit_to_celsius', 'fahrenheit_to_kelvin', 'kelvin_to_celsius', 'kelvin_to_fahrenheit', 'kilometers_per_hour_to_miles_per_hour', 'miles_per_hour_to_kilometers_per_hour', 'unix_timestamp_to_date', 'date_to_unix_timestamp', 'number_to_roman_numerals', 'roman_numerals_to_number', 'json_to_php_array_converter',
]

function isClientConverter(slug: string) {
  return /_to_/.test(slug) && !clientConverterExclusions.includes(slug)
}

function splitLines(value: string) {
  return value.split(/\r?\n/).filter((line) => line.trim())
}

function numberInput(value: string) {
  const number = Number(value.trim())
  if (!Number.isFinite(number)) throw new Error('Enter a valid number.')
  return number
}

function randomPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?'
  const values = crypto.getRandomValues(new Uint32Array(18))
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
}

function markdownToHtml(value: string) {
  return value.split(/\r?\n/).map((line) => {
    if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`
    if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`
    if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`
    return line ? `<p>${line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</p>` : ''
  }).join('\n')
}

export function runBrowserTool(slug: string, input: string) {
  if (!input && !['uuid_v4_generator', 'password_generator', 'lorem_ipsum_generator', 'random_number_generator'].includes(slug)) return ''

  if (isClientConverter(slug)) return String(convertToolValue(slug, numberInput(input)))

  switch (slug) {
    case 'text_separator': return splitLines(input).join(', ')
    case 'email_extractor': return Array.from(new Set(input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])).join('\n')
    case 'url_extractor': return Array.from(new Set(input.match(/https?:\/\/[^\s"'<>]+/gi) ?? [])).join('\n')
    case 'text_size_calculator': return `${new Blob([input]).size} bytes\n${input.length} characters\n${splitLines(input).length} lines`
    case 'duplicate_lines_remover': return Array.from(new Set(input.split(/\r?\n/))).join('\n')
    case 'case_converter': return `lowercase\n${input.toLowerCase()}\n\nUPPERCASE\n${input.toUpperCase()}\n\nTitle Case\n${input.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}`
    case 'character_counter': return `${input.length} characters\n${input.trim() ? input.trim().split(/\s+/).length : 0} words\n${splitLines(input).length} lines`
    case 'list_randomizer': return splitLines(input).sort(() => Math.random() - .5).join('\n')
    case 'reverse_words': return input.split(/(\s+)/).reverse().join('')
    case 'reverse_letters': return [...input].reverse().join('')
    case 'emojis_remover': return input.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
    case 'reverse_list': return input.split(/\r?\n/).reverse().join('\n')
    case 'list_alphabetizer': return splitLines(input).sort((first, second) => first.localeCompare(second)).join('\n')
    case 'palindrome_checker': {
      const normalized = input.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
      return normalized && normalized === [...normalized].reverse().join('') ? 'This is a palindrome.' : 'This is not a palindrome.'
    }
    case 'base64_encoder': return btoa(unescape(encodeURIComponent(input)))
    case 'base64_decoder': return decodeURIComponent(escape(atob(input)))
    case 'url_encoder': return encodeURIComponent(input)
    case 'url_decoder': return decodeURIComponent(input)
    case 'binary_converter': return [...input].map((character) => character.codePointAt(0)?.toString(2).padStart(8, '0')).join(' ')
    case 'hex_converter': return [...input].map((character) => character.codePointAt(0)?.toString(16).padStart(2, '0')).join(' ')
    case 'ascii_converter': return [...input].map((character) => String(character.codePointAt(0))).join(' ')
    case 'decimal_converter': return [...input].map((character) => String(character.codePointAt(0))).join(' ')
    case 'octal_converter': return [...input].map((character) => character.codePointAt(0)?.toString(8)).join(' ')
    case 'morse_converter': return input.toLowerCase().split('').map((character) => character === ' ' ? '/' : morse[character] ?? character).join(' ')
    case 'celsius_to_fahrenheit': return String((numberInput(input) * 9 / 5) + 32)
    case 'celsius_to_kelvin': return String(numberInput(input) + 273.15)
    case 'fahrenheit_to_celsius': return String((numberInput(input) - 32) * 5 / 9)
    case 'fahrenheit_to_kelvin': return String(((numberInput(input) - 32) * 5 / 9) + 273.15)
    case 'kelvin_to_celsius': return String(numberInput(input) - 273.15)
    case 'kelvin_to_fahrenheit': return String(((numberInput(input) - 273.15) * 9 / 5) + 32)
    case 'kilometers_per_hour_to_miles_per_hour': return String(numberInput(input) * .621371)
    case 'miles_per_hour_to_kilometers_per_hour': return String(numberInput(input) / .621371)
    case 'unix_timestamp_to_date': return new Date(numberInput(input) * 1000).toISOString()
    case 'date_to_unix_timestamp': {
      const timestamp = Date.parse(input)
      if (Number.isNaN(timestamp)) throw new Error('Enter a valid date.')
      return String(Math.floor(timestamp / 1000))
    }
    case 'html_minifier': return input.replace(/<!--([\s\S]*?)-->/g, '').replace(/>\s+</g, '><').trim()
    case 'css_minifier': return input.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*([{}:;,])\s*/g, '$1').replace(/;}/g, '}').trim()
    case 'js_minifier': return input.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ').trim()
    case 'json_validator_beautifier': return JSON.stringify(JSON.parse(input), null, 2)
    case 'html_entity_converter': return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
    case 'html_tags_remover': return input.replace(/<[^>]*>/g, '')
    case 'markdown_to_html': return markdownToHtml(input)
    case 'uuid_v4_generator': return crypto.randomUUID()
    case 'password_generator': return randomPassword()
    case 'lorem_ipsum_generator': return 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Donec sed odio dui.'
    case 'random_number_generator': return String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000)
    case 'slug_generator': return input.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
    case 'number_to_roman_numerals': return numberToRoman(numberInput(input))
    case 'roman_numerals_to_number': return String(romanToNumber(input))
    case 'number_to_words_converter': return numberToWords(numberInput(input))
    case 'upside_down_text_generator': return [...input].reverse().map((character) => ({ a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z' } as Record<string, string>)[character.toLowerCase()] ?? character).join('')
    case 'old_english_text_generator': return input.replace(/[A-Za-z]/g, (character) => '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ'[character.toUpperCase().charCodeAt(0) - 65] ?? character)
    case 'cursive_text_generator': return input.replace(/[A-Za-z]/g, (character) => '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵'[character.toUpperCase().charCodeAt(0) - 65] ?? character)
    case 'sql_beautifier': return input.replace(/\s+/g, ' ').replace(/\s+(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|UNION)\s+/gi, '\n$1 ').trim()
    case 'bbcode_to_html': return input.replace(/\[b\](.*?)\[\/b\]/gi, '<strong>$1</strong>').replace(/\[i\](.*?)\[\/i\]/gi, '<em>$1</em>').replace(/\[url=(.*?)\](.*?)\[\/url\]/gi, '<a href="$1">$2</a>').replace(/\r?\n/g, '<br>')
    case 'url_parser': { const url = new URL(input); return JSON.stringify({ protocol: url.protocol, host: url.host, pathname: url.pathname, query: Object.fromEntries(url.searchParams) }, null, 2) }
    case 'user_agent_parser': return JSON.stringify({ browser: /Edg\//.test(input) ? 'Edge' : /Chrome\//.test(input) ? 'Chrome' : /Firefox\//.test(input) ? 'Firefox' : /Safari\//.test(input) ? 'Safari' : 'Unknown', mobile: /Mobile|Android|iPhone/i.test(input) }, null, 2)
    case 'mailto_link_generator': return `mailto:${encodeURIComponent(input)}`
    case 'whatsapp_link_generator': return `https://wa.me/${input.replace(/\D/g, '')}`
    case 'youtube_timestamp_link_generator': return `https://youtu.be/${input}`
    case 'utm_link_generator': { const url = new URL(input); url.searchParams.set('utm_source', 'magicwebtools'); return url.toString() }
    case 'paypal_link_generator': return `https://www.paypal.com/paypalme/${encodeURIComponent(input)}`
    case 'youtube_thumbnail_downloader': { const match = input.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); if (!match) throw new Error('Enter a valid YouTube URL.'); return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg` }
    case 'password_strength_checker': return passwordStrength(input)
    case 'color_converter': return colorConvert(input)
    case 'idn_punnycode_converter': return idnPunycode(input)
    case 'json_to_php_array_converter': return jsonToPhpArray(input)
    default: return ''
  }
}

function numberToRoman(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 3999) throw new Error('Enter a whole number from 1 to 3999.')
  const numerals: Array<[number, string]> = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  return numerals.reduce((result, [unit, symbol]) => { while (value >= unit) { value -= unit; result += symbol } return result }, '')
}

function romanToNumber(value: string) {
  const values: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
  return [...value.toUpperCase()].reduce((total, character, index, letters) => total + (values[character] ?? 0) * ((values[character] ?? 0) < (values[letters[index + 1]] ?? 0) ? -1 : 1), 0)
}

function numberToWords(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 999999999) throw new Error('Enter a whole number from 0 to 999999999.')
  const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
  const belowThousand = (number: number): string => number < 20 ? ones[number] : number < 100 ? `${tens[Math.floor(number / 10)]}${number % 10 ? `-${ones[number % 10]}` : ''}` : `${ones[Math.floor(number / 100)]} hundred${number % 100 ? ` ${belowThousand(number % 100)}` : ''}`
  if (value < 1000) return belowThousand(value)
  for (const [scale, name] of [[1000000, 'million'], [1000, 'thousand']] as const) if (value >= scale) return `${belowThousand(Math.floor(value / scale))} ${name}${value % scale ? ` ${numberToWords(value % scale)}` : ''}`
  return belowThousand(value)
}

function passwordStrength(value: string) {
  const score = [value.length >= 12, /[a-z]/.test(value), /[A-Z]/.test(value), /\d/.test(value), /[^A-Za-z\d]/.test(value)].filter(Boolean).length
  return `${['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][score]} (${score}/5)`
}

function colorConvert(value: string) {
  const hex = value.trim().replace('#', '')
  if (!/^[\da-f]{3,8}$/i.test(hex)) throw new Error('Enter a valid hexadecimal color.')
  const normalized = hex.length === 3 ? [...hex].map((character) => character + character).join('') : hex
  const [red, green, blue] = [0, 2, 4].map((offset) => parseInt(normalized.slice(offset, offset + 2), 16))
  return JSON.stringify({ hex: `#${normalized}`, rgb: `rgb(${red}, ${green}, ${blue})` }, null, 2)
}

// Convert between a Unicode (IDN) domain and its Punycode/ASCII form. If the input
// already contains "xn--" we decode it, otherwise we encode to ASCII.
function idnPunycode(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    return /xn--/i.test(trimmed) ? toUnicode(trimmed) : toASCII(trimmed)
  } catch {
    throw new Error('Enter a valid domain name.')
  }
}

// Convert a JSON value into a PHP array literal (mirrors the PHP json_to_php_array tool).
function jsonToPhpArray(value: string) {
  const parsed = JSON.parse(value)
  const render = (input: unknown, indent: number): string => {
    const pad = '    '.repeat(indent)
    const padInner = '    '.repeat(indent + 1)
    if (Array.isArray(input)) {
      if (!input.length) return '[]'
      const items = input.map((item) => `${padInner}${render(item, indent + 1)}`)
      return `[\n${items.join(',\n')}\n${pad}]`
    }
    if (input && typeof input === 'object') {
      const entries = Object.entries(input as Record<string, unknown>)
      if (!entries.length) return '[]'
      const items = entries.map(([key, item]) => `${padInner}'${key.replace(/'/g, "\\'")}' => ${render(item, indent + 1)}`)
      return `[\n${items.join(',\n')}\n${pad}]`
    }
    if (typeof input === 'string') return `'${input.replace(/'/g, "\\'")}'`
    if (input === null) return 'null'
    return String(input)
  }
  return render(parsed, 0)
}

export function legacyToolUrl(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_LEGACY_TOOLS_URL
  return baseUrl ? `${baseUrl.replace(/\/$/, '')}/${slug.replaceAll('_', '-')}` : null
}