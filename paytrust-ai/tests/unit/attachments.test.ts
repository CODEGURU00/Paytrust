import { describe, expect, it } from 'vitest';
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_NAME_LENGTH,
  MAX_ATTACHMENT_SIZE,
  detectAttachmentMimeType,
  isAllowedAttachmentMimeType,
  sanitizeFileName,
  validateAttachment,
  validateAttachmentContent,
} from '@/lib/attachments';

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function withPrefix(prefix: number[], text: string): Uint8Array {
  const tail = new TextEncoder().encode(text);
  const result = new Uint8Array(prefix.length + tail.length);
  result.set(prefix);
  result.set(tail, prefix.length);
  return result;
}

const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46);
const GIF = withPrefix([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 'payload');
const WEBP = withPrefix(
  [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00],
  'WEBPpayload'
);
const PDF = withPrefix([0x25, 0x50, 0x44, 0x46, 0x2d], '1.7 payload');
const DOC = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0);
const DOCX = withPrefix(
  [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00],
  'word/document.xml[Content_Types].xml'
);

describe('attachment content detection', () => {
  it('detects every allowed binary signature', () => {
    expect(detectAttachmentMimeType(PNG)).toBe('image/png');
    expect(detectAttachmentMimeType(JPEG)).toBe('image/jpeg');
    expect(detectAttachmentMimeType(GIF)).toBe('image/gif');
    expect(detectAttachmentMimeType(WEBP)).toBe('image/webp');
    expect(detectAttachmentMimeType(PDF)).toBe('application/pdf');
    expect(detectAttachmentMimeType(DOC)).toBe('application/msword');
    expect(detectAttachmentMimeType(DOCX)).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  it('detects plain text without a binary signature', () => {
    expect(
      detectAttachmentMimeType(new TextEncoder().encode('Hello, receipt.\n'))
    ).toBe('text/plain');
  });

  it('rejects unknown binary content', () => {
    expect(detectAttachmentMimeType(bytes(0x00, 0x01, 0x02, 0x03))).toBeNull();
    expect(detectAttachmentMimeType(new Uint8Array())).toBeNull();
  });

  it('rejects a ZIP that is not a Word document', () => {
    const zip = withPrefix([0x50, 0x4b, 0x03, 0x04], 'xl/workbook.xml');
    expect(detectAttachmentMimeType(zip)).toBeNull();
  });

  it('rejects content that does not match the declared type', () => {
    expect(validateAttachmentContent(PDF, 'image/png')).toBe(
      'File content does not match its declared type'
    );
    expect(validateAttachmentContent(PDF, 'application/pdf')).toBeNull();
  });

  it('rejects unverifiable content before upload', () => {
    expect(
      validateAttachmentContent(bytes(0x00, 0x01, 0x02), 'text/plain')
    ).toBe('Could not verify the file content type');
  });
});

describe('attachment MIME allowlist', () => {
  it('accepts every documented type', () => {
    for (const type of ALLOWED_ATTACHMENT_MIME_TYPES) {
      expect(isAllowedAttachmentMimeType(type)).toBe(true);
    }
  });

  it('rejects executables, scripts and empty MIME types', () => {
    for (const type of [
      'application/x-msdownload',
      'application/javascript',
      'text/html',
      'application/zip',
      '',
    ]) {
      expect(isAllowedAttachmentMimeType(type)).toBe(false);
    }
  });
});

describe('sanitizeFileName', () => {
  it('strips directory traversal and path separators', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('C:\\Windows\\system32\\evil.dll')).toBe('evil.dll');
    expect(sanitizeFileName('/tmp/receipt.pdf')).toBe('receipt.pdf');
  });

  it('replaces unsafe characters and collapses them', () => {
    expect(sanitizeFileName('my receipt (final)!.pdf')).toBe(
      'my_receipt_final_.pdf'
    );
    expect(sanitizeFileName('hello<script>.png')).toBe('hello_script_.png');
  });

  it('removes leading dots and dashes so hidden files cannot be created', () => {
    expect(sanitizeFileName('.env')).toBe('env');
    expect(sanitizeFileName('---secret.txt')).toBe('secret.txt');
  });

  it('caps long names and falls back for empty results', () => {
    const long = sanitizeFileName(`${'a'.repeat(300)}.pdf`);
    expect(long.length).toBeLessThanOrEqual(MAX_ATTACHMENT_NAME_LENGTH);
    expect(sanitizeFileName('...')).toBe('file');
    expect(sanitizeFileName('')).toBe('file');
  });
});

describe('validateAttachment', () => {
  const valid = {
    name: 'receipt.pdf',
    type: 'application/pdf',
    size: 1024,
  };

  it('accepts a valid attachment', () => {
    expect(validateAttachment(valid)).toBeNull();
  });

  it('rejects missing names and empty files', () => {
    expect(validateAttachment({ ...valid, name: '   ' })).toBe(
      'File name is required'
    );
    expect(validateAttachment({ ...valid, size: 0 })).toBe('File is empty');
  });

  it('rejects files above 10 MB', () => {
    expect(
      validateAttachment({ ...valid, size: MAX_ATTACHMENT_SIZE + 1 })
    ).toBe('File size exceeds the 10 MB limit');
    expect(
      validateAttachment({ ...valid, size: MAX_ATTACHMENT_SIZE })
    ).toBeNull();
  });

  it('rejects disallowed MIME types with a clear message', () => {
    expect(
      validateAttachment({ ...valid, type: 'application/x-msdownload' })
    ).toContain('is not allowed');
  });
});
