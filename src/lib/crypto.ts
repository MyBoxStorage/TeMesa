import crypto from 'node:crypto'

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY ?? ''
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 characters')
  }
  return Buffer.from(key, 'utf8')
}

export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(cipherTextBase64: string): string {
  const data = Buffer.from(cipherTextBase64, 'base64')
  const iv = data.subarray(0, 12)
  const tag = data.subarray(12, 28)
  const encrypted = data.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

