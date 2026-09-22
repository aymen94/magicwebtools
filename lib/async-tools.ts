// Client-side tools that need async work (WASM hashing, bcrypt, punycode).
// Ported from the PHP hash()/password_hash() tool controllers.

import {
  md4, md5, sha1, sha224, sha256, sha384, sha512,
  sha3, ripemd160, whirlpool, bcrypt,
} from 'hash-wasm'

// Map each generator slug to a function that returns the digest for the input text.
type HashFn = (input: string) => Promise<string>

// hash-wasm's sha3 takes a bit-length; sha512/224 and 512/256 are truncated SHA-512.
const truncateHex = (hex: string, bits: number) => hex.slice(0, bits / 4)

const hashHandlers: Record<string, HashFn> = {
  md4_generator: (input) => md4(input),
  md5_generator: (input) => md5(input),
  sha1_generator: (input) => sha1(input),
  sha224_generator: (input) => sha224(input),
  sha256_generator: (input) => sha256(input),
  sha384_generator: (input) => sha384(input),
  sha512_generator: (input) => sha512(input),
  sha512_224_generator: async (input) => truncateHex(await sha512(input), 224),
  sha512_256_generator: async (input) => truncateHex(await sha512(input), 256),
  sha3_224_generator: (input) => sha3(input, 224),
  sha3_256_generator: (input) => sha3(input, 256),
  sha3_384_generator: (input) => sha3(input, 384),
  sha3_512_generator: (input) => sha3(input, 512),
  ripemd160_generator: (input) => ripemd160(input),
  whirlpool_generator: (input) => whirlpool(input),
}

async function bcryptGenerator(input: string): Promise<string> {
  const saltBytes = new Uint8Array(16)
  crypto.getRandomValues(saltBytes)
  return bcrypt({ password: input, salt: saltBytes, costFactor: 10, outputType: 'encoded' })
}

// Gravatar: hash the trimmed lowercased email with MD5 and list the default avatar styles.
async function gravatarChecker(input: string): Promise<string> {
  const email = input.trim().toLowerCase()
  if (!email) return ''
  const hash = await md5(email)
  const base = `https://www.gravatar.com/avatar/${hash}?s=256&d=`
  const styles = ['mp', 'identicon', 'monsterid', 'wavatar', 'retro', 'robohash', 'blank']
  return [`Gravatar hash: ${hash}`, '', ...styles.map((style) => `${style}: ${base}${style}&f=y`)].join('\n')
}

// The async tool registry: hash generators + bcrypt + gravatar.
const asyncHandlers: Record<string, HashFn> = {
  ...hashHandlers,
  bcrypt_generator: bcryptGenerator,
  gravatar_checker: gravatarChecker,
}

export const asyncToolSlugs = new Set(Object.keys(asyncHandlers))

export function isAsyncTool(slug: string): boolean {
  return asyncToolSlugs.has(slug)
}

export async function runAsyncTool(slug: string, input: string): Promise<string> {
  const handler = asyncHandlers[slug]
  if (!handler) throw new Error('This tool is not available.')
  if (!input) return ''
  return handler(input)
}
