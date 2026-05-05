// Sistema de encriptación AES-256 para credenciales
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const KEY_LENGTH = 32

// Generar clave a partir de la master key
function getKey(salt: Buffer, masterKey: string): Buffer {
  return crypto.pbkdf2Sync(
    masterKey,
    salt,
    100000, // iteraciones
    KEY_LENGTH,
    'sha512'
  )
}

// Encriptar datos sensibles
export function encrypt(text: string): string {
  try {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY
    if (!masterKey) throw new Error('ENCRYPTION_MASTER_KEY no configurada')

    const salt = crypto.randomBytes(SALT_LENGTH)
    const key = getKey(salt, masterKey)
    const iv = crypto.randomBytes(IV_LENGTH)
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    // Formato: salt:iv:tag:encrypted
    return [
      salt.toString('hex'),
      iv.toString('hex'),
      tag.toString('hex'),
      encrypted
    ].join(':')
    
  } catch (error) {
    console.error('Error al encriptar:', error)
    throw new Error('Error en encriptación')
  }
}

// Desencriptar datos sensibles
export function decrypt(encryptedText: string): string {
  try {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY
    if (!masterKey) throw new Error('ENCRYPTION_MASTER_KEY no configurada')

    const parts = encryptedText.split(':')
    if (parts.length !== 4) throw new Error('Formato de datos encriptados inválido')

    const [saltHex, ivHex, tagHex, encrypted] = parts
    
    const salt = Buffer.from(saltHex, 'hex')
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const key = getKey(salt, masterKey)
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
    
  } catch (error) {
    console.error('Error al desencriptar:', error)
    throw new Error('Error en desencriptación')
  }
}

// Hash seguro para almacenar referencias (no reversible)
export function hashSecure(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}

// Generar token aleatorio seguro
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}
