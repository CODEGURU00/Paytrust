export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_ATTACHMENT_NAME_LENGTH = 120;

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type AllowedAttachmentMimeType =
  (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number];

export function isAllowedAttachmentMimeType(
  mimeType: string
): mimeType is AllowedAttachmentMimeType {
  return (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() || 'file';
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[._-]+/, '')
    .slice(0, MAX_ATTACHMENT_NAME_LENGTH);

  return cleaned || 'file';
}

export function validateAttachment(input: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (!input.name.trim()) return 'File name is required';
  if (!isAllowedAttachmentMimeType(input.type)) {
    return `File type "${input.type || 'unknown'}" is not allowed`;
  }
  if (input.size <= 0) return 'File is empty';
  if (input.size > MAX_ATTACHMENT_SIZE) {
    return 'File size exceeds the 10 MB limit';
  }
  return null;
}

function startsWithBytes(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

function containsAscii(bytes: Uint8Array, needle: string): boolean {
  const head = new TextDecoder('latin1').decode(
    bytes.subarray(0, Math.min(bytes.length, 2 * 1024 * 1024))
  );
  return head.includes(needle);
}

function looksLikePlainText(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  const sample = bytes.subarray(0, Math.min(bytes.length, 4096));
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(sample);
  } catch {
    return false;
  }
  let printable = 0;
  for (const byte of sample) {
    if (byte === 0) return false;
    if (
      byte === 9 ||
      byte === 10 ||
      byte === 13 ||
      (byte >= 32 && byte <= 126) ||
      byte >= 0xc2
    ) {
      printable += 1;
    }
  }
  return printable / sample.length >= 0.9;
}

/**
 * Detects an allowed attachment type from its byte signature.
 *
 * DOCX is a ZIP container, so it is accepted only when the archive also
 * contains Word entries. This is not a malware scan; it prevents a client
 * from declaring one type while sending another.
 */
export function detectAttachmentMimeType(
  bytes: Uint8Array
): AllowedAttachmentMimeType | null {
  if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  if (
    startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return 'image/gif';
  }
  if (
    startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    containsAscii(bytes.subarray(0, 12), 'WEBP')
  ) {
    return 'image/webp';
  }
  if (startsWithBytes(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return 'application/pdf';
  }
  if (
    startsWithBytes(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  ) {
    return 'application/msword';
  }
  if (startsWithBytes(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    const isWordDocument =
      containsAscii(bytes, 'word/') &&
      containsAscii(bytes, '[Content_Types].xml');
    return isWordDocument
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : null;
  }
  if (looksLikePlainText(bytes)) {
    return 'text/plain';
  }
  return null;
}

export function validateAttachmentContent(
  bytes: Uint8Array,
  declaredType: string
): string | null {
  const detected = detectAttachmentMimeType(bytes);
  if (!detected) {
    return 'Could not verify the file content type';
  }
  if (detected !== declaredType) {
    return 'File content does not match its declared type';
  }
  return null;
}
