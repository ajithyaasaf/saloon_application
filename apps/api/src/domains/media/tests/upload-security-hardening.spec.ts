import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FileCategory, FileStatus, FileVisibility } from '@prisma/client';
import { FileSecurityUtil } from '../../../common/utils/file-security.util';
import { IStorageProvider } from '../../../infrastructure/storage/interfaces/storage-provider.interface';
import { AuditService } from '../../../shared/audit/audit.service';
import { EventBusService } from '../../../shared/events/event-bus.service';
import {
  FileScanResult,
  IFileSecurityScanner,
} from '../interfaces/file-security-scanner.interface';
import { NoopSecurityScannerService } from '../services/noop-security-scanner.service';
import { FileAccessService } from '../services/file-access.service';
import { FileAssetService } from '../services/file-asset.service';
import { FileAuthorizationService } from '../services/file-authorization.service';
import { FileLifecycleService } from '../services/file-lifecycle.service';
import { FileUploadService } from '../services/file-upload.service';

describe('Phase 20.8 — Upload Security & Hardening Suite', () => {
  // Sample Magic Byte Buffers
  const JPEG_BUFFER = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00,
    0x48, 0x00, 0x48, 0x00, 0x00,
  ]);
  const PNG_BUFFER = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
    0x52,
  ]);
  const GIF_BUFFER = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00', 'binary');
  const WEBP_BUFFER = Buffer.from('RIFF\x20\x00\x00\x00WEBPVP8 \x14\x00\x00\x00', 'binary');
  const PDF_BUFFER = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF', 'utf8');
  const MP4_BUFFER = Buffer.from([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02,
    0x00,
  ]);
  const WEBM_BUFFER = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);
  const MP3_BUFFER = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const WAV_BUFFER = Buffer.from('RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00', 'binary');
  const OGG_BUFFER = Buffer.from('OggS\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00', 'binary');

  // Dangerous Payload Buffers
  const EXE_PE_BUFFER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
  const ELF_BINARY_BUFFER = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]);
  const MACHO_BUFFER = Buffer.from([0xfe, 0xed, 0xfa, 0xce, 0x00, 0x00, 0x00, 0x01]);
  const SHEBANG_SCRIPT_BUFFER = Buffer.from('#!/bin/bash\nrm -rf /', 'utf8');

  // Mocks
  let mockStorage: any;
  let mockRepo: any;
  let mockAudit: jest.Mocked<AuditService>;
  let mockEventBus: jest.Mocked<EventBusService>;
  let authzService: FileAuthorizationService;
  let uploadService: FileUploadService;
  let lifecycleService: FileLifecycleService;
  let accessService: FileAccessService;
  let assetService: FileAssetService;

  beforeEach(() => {
    mockStorage = {
      providerName: 'MOCK_S3',
      upload: jest.fn().mockResolvedValue({
        bucket: 'test-bucket',
        key: 'salons/s-1/service/item.jpg',
        sizeBytes: 1024,
        etag: 'etag-123',
      }),
      uploadStream: jest.fn().mockResolvedValue({
        bucket: 'test-bucket',
        key: 'salons/s-1/service/item.jpg',
        sizeBytes: 1024,
        etag: 'etag-123',
      }),
      download: jest.fn().mockResolvedValue({
        body: JPEG_BUFFER,
        contentType: 'image/jpeg',
        contentLength: JPEG_BUFFER.length,
      }),
      generateSignedUploadUrl: jest.fn().mockResolvedValue({
        url: 'https://storage.example.com/upload?signed=token',
        expiresInSeconds: 900,
        expiresAt: new Date(Date.now() + 900000),
      }),
      generateSignedDownloadUrl: jest.fn().mockResolvedValue({
        url: 'https://storage.example.com/download?signed=token',
        expiresInSeconds: 3600,
        expiresAt: new Date(Date.now() + 3600000),
      }),
      exists: jest.fn().mockResolvedValue(true),
      getMetadata: jest.fn().mockResolvedValue({
        objectKey: 'salons/s-1/service/item.jpg',
        sizeBytes: 1024,
        contentType: 'image/jpeg',
        lastModified: new Date(),
        etag: 'etag-123',
      }),
      delete: jest.fn().mockResolvedValue(undefined),
      deleteMany: jest.fn().mockResolvedValue(undefined),
      copy: jest.fn().mockResolvedValue(undefined),
      move: jest.fn().mockResolvedValue(undefined),
      getDownloadStream: jest.fn().mockResolvedValue({
        stream: require('stream').Readable.from(JPEG_BUFFER),
        contentType: 'image/jpeg',
        contentLength: JPEG_BUFFER.length,
      }),
    };

    mockRepo = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          id: 'asset-sec-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          width: null,
          height: null,
          duration: null,
          metadata: null,
          ...dto,
        }),
      ),
      findById: jest.fn().mockImplementation((id: string) =>
        Promise.resolve({
          id,
          salonId: 'salon-1',
          uploadedByUserId: 'user-1',
          originalFileName: 'photo.jpg',
          storedFileName: 'photo.jpg',
          objectKey: 'salons/salon-1/profile/photo.jpg',
          bucket: 'test-bucket',
          provider: 'MOCK_S3',
          mimeType: 'image/jpeg',
          extension: 'jpg',
          sizeBytes: 1024,
          status: FileStatus.UPLOADING,
          visibility: FileVisibility.PRIVATE,
          category: FileCategory.PROFILE,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        }),
      ),
      findByIdIncludingDeleted: jest.fn(),
      update: jest.fn().mockImplementation((id, data) =>
        Promise.resolve({
          id,
          salonId: 'salon-1',
          uploadedByUserId: 'user-1',
          originalFileName: 'photo.jpg',
          storedFileName: 'photo.jpg',
          objectKey: 'salons/salon-1/profile/photo.jpg',
          bucket: 'test-bucket',
          provider: 'MOCK_S3',
          mimeType: 'image/jpeg',
          extension: 'jpg',
          sizeBytes: 1024,
          status: FileStatus.READY,
          visibility: FileVisibility.PRIVATE,
          category: FileCategory.PROFILE,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          ...data,
        }),
      ),
      markReady: jest.fn().mockImplementation((id, meta) =>
        Promise.resolve({
          id,
          salonId: 'salon-1',
          uploadedByUserId: 'user-1',
          originalFileName: 'photo.jpg',
          storedFileName: 'photo.jpg',
          objectKey: 'salons/salon-1/profile/photo.jpg',
          bucket: 'test-bucket',
          provider: 'MOCK_S3',
          mimeType: 'image/jpeg',
          extension: 'jpg',
          sizeBytes: meta?.sizeBytes ?? 1024,
          checksum: meta?.checksum ?? null,
          status: FileStatus.READY,
          visibility: FileVisibility.PRIVATE,
          category: FileCategory.PROFILE,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        }),
      ),
      markFailed: jest.fn().mockImplementation((id, reason) =>
        Promise.resolve({
          id,
          salonId: 'salon-1',
          uploadedByUserId: 'user-1',
          originalFileName: 'photo.jpg',
          storedFileName: 'photo.jpg',
          objectKey: 'salons/salon-1/profile/photo.jpg',
          bucket: 'test-bucket',
          provider: 'MOCK_S3',
          mimeType: 'image/jpeg',
          extension: 'jpg',
          sizeBytes: 1024,
          status: FileStatus.FAILED,
          visibility: FileVisibility.PRIVATE,
          category: FileCategory.PROFILE,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          metadata: { failureReason: reason },
        }),
      ),
      softDelete: jest.fn(),
      restore: jest.fn(),
    };

    mockAudit = {
      log: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as any;

    authzService = new FileAuthorizationService();

    uploadService = new FileUploadService(
      mockStorage,
      mockRepo,
      mockAudit,
      mockEventBus,
      authzService,
    );

    lifecycleService = new FileLifecycleService(
      mockStorage,
      mockRepo,
      mockAudit,
      mockEventBus,
      authzService,
    );

    accessService = new FileAccessService(
      mockStorage,
      mockRepo,
      authzService,
      mockAudit,
    );

    const mockCache: any = {
      delete: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    assetService = new FileAssetService(
      mockRepo,
      lifecycleService,
      mockAudit,
      mockEventBus,
      mockCache,
      authzService,
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Binary Magic Bytes & File Signature Detection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('1. Binary Magic Bytes & File Signature Detection', () => {
    it('should detect valid JPEG magic bytes (FF D8 FF)', () => {
      const detected = FileSecurityUtil.detectMimeFromBuffer(JPEG_BUFFER);
      expect(detected.mime).toBe('image/jpeg');
      expect(detected.extension).toBe('jpg');
      expect(detected.isExecutable).toBe(false);
    });

    it('should detect valid PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)', () => {
      const detected = FileSecurityUtil.detectMimeFromBuffer(PNG_BUFFER);
      expect(detected.mime).toBe('image/png');
      expect(detected.extension).toBe('png');
      expect(detected.isExecutable).toBe(false);
    });

    it('should detect valid GIF magic bytes (GIF89a)', () => {
      const detected = FileSecurityUtil.detectMimeFromBuffer(GIF_BUFFER);
      expect(detected.mime).toBe('image/gif');
      expect(detected.extension).toBe('gif');
      expect(detected.isExecutable).toBe(false);
    });

    it('should detect valid WebP magic bytes (RIFF...WEBP)', () => {
      const detected = FileSecurityUtil.detectMimeFromBuffer(WEBP_BUFFER);
      expect(detected.mime).toBe('image/webp');
      expect(detected.extension).toBe('webp');
      expect(detected.isExecutable).toBe(false);
    });

    it('should detect valid PDF magic bytes (%PDF-)', () => {
      const detected = FileSecurityUtil.detectMimeFromBuffer(PDF_BUFFER);
      expect(detected.mime).toBe('application/pdf');
      expect(detected.extension).toBe('pdf');
      expect(detected.isExecutable).toBe(false);
    });

    it('should detect valid MP4 magic bytes (ftyp isom)', () => {
      const detected = FileSecurityUtil.detectMimeFromBuffer(MP4_BUFFER);
      expect(detected.mime).toBe('video/mp4');
      expect(detected.extension).toBe('mp4');
      expect(detected.isExecutable).toBe(false);
    });

    it('should detect valid WebM EBML header', () => {
      const detected = FileSecurityUtil.detectMimeFromBuffer(WEBM_BUFFER);
      expect(detected.mime).toBe('video/webm');
      expect(detected.extension).toBe('webm');
      expect(detected.isExecutable).toBe(false);
    });

    it('should detect valid MP3 audio header', () => {
      const detected = FileSecurityUtil.detectMimeFromBuffer(MP3_BUFFER);
      expect(detected.mime).toBe('audio/mpeg');
      expect(detected.extension).toBe('mp3');
      expect(detected.isExecutable).toBe(false);
    });

    it('should detect valid WAV audio header', () => {
      const detected = FileSecurityUtil.detectMimeFromBuffer(WAV_BUFFER);
      expect(detected.mime).toBe('audio/wav');
      expect(detected.extension).toBe('wav');
      expect(detected.isExecutable).toBe(false);
    });

    it('should detect valid OGG audio header', () => {
      const detected = FileSecurityUtil.detectMimeFromBuffer(OGG_BUFFER);
      expect(detected.mime).toBe('audio/ogg');
      expect(detected.extension).toBe('ogg');
      expect(detected.isExecutable).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Dangerous Binary & Executable Rejection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('2. Dangerous Binary & Executable Rejection', () => {
    it('should detect and mark Windows PE executable (MZ) as isExecutable', () => {
      const detected = FileSecurityUtil.detectMimeFromBuffer(EXE_PE_BUFFER);
      expect(detected.isExecutable).toBe(true);
      expect(detected.mime).toBe('application/x-dosexec');
    });

    it('should detect and mark Linux ELF binary as isExecutable', () => {
      const detected = FileSecurityUtil.detectMimeFromBuffer(ELF_BINARY_BUFFER);
      expect(detected.isExecutable).toBe(true);
      expect(detected.mime).toBe('application/x-executable');
    });

    it('should detect and mark Mach-O binary as isExecutable', () => {
      const detected = FileSecurityUtil.detectMimeFromBuffer(MACHO_BUFFER);
      expect(detected.isExecutable).toBe(true);
      expect(detected.mime).toBe('application/x-mach-binary');
    });

    it('should detect and mark Unix Shebang script as isExecutable', () => {
      const detected = FileSecurityUtil.detectMimeFromBuffer(SHEBANG_SCRIPT_BUFFER);
      expect(detected.isExecutable).toBe(true);
      expect(detected.mime).toBe('application/x-sh');
    });

    it('should reject Windows PE disguised as JPEG in consistency check', () => {
      const result = FileSecurityUtil.validateBufferConsistency(
        EXE_PE_BUFFER,
        'image/jpeg',
        'avatar.jpg',
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('forbidden executable signature');
    });

    it('should reject Linux ELF disguised as PDF in direct upload', async () => {
      await expect(
        uploadService.uploadDirect(
          {
            buffer: ELF_BINARY_BUFFER,
            originalFileName: 'invoice.pdf',
            mimeType: 'application/pdf',
            sizeBytes: ELF_BINARY_BUFFER.length,
            category: FileCategory.DOCUMENT,
          },
          { userId: 'u-1', salonId: 's-1', role: 'OWNER' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. MIME & Binary Signature Mismatch Rejection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('3. MIME & Binary Signature Mismatch Rejection', () => {
    it('should reject plain text claiming to be image/jpeg', () => {
      const textBuffer = Buffer.from('this is just a text file claiming to be a jpeg', 'utf8');
      const result = FileSecurityUtil.validateBufferConsistency(
        textBuffer,
        'image/jpeg',
        'photo.jpg',
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('MIME type mismatch');
    });

    it('should reject JPEG claiming to be application/pdf', () => {
      const result = FileSecurityUtil.validateBufferConsistency(
        JPEG_BUFFER,
        'application/pdf',
        'document.pdf',
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('MIME type mismatch');
    });

    it('should reject MP4 video claiming to be image/png', () => {
      const result = FileSecurityUtil.validateBufferConsistency(
        MP4_BUFFER,
        'image/png',
        'image.png',
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('MIME type mismatch');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Dangerous Extensions & Double Extension Attacks
  // ═══════════════════════════════════════════════════════════════════════════

  describe('4. Dangerous Extensions & Double Extension Attacks', () => {
    const dangerousNames = [
      'virus.exe',
      'script.bat',
      'deploy.cmd',
      'shell.sh',
      'exploit.ps1',
      'webshell.php',
      'payload.jsp',
      'backdoor.asp',
      'handler.cgi',
      'library.dll',
      'worm.vbs',
      'bundle.jar',
      'trojan.pif',
      'macro.hta',
      'install.msi',
    ];

    dangerousNames.forEach((name) => {
      it(`should detect dangerous extension in "${name}"`, () => {
        const found = FileSecurityUtil.findDangerousExtension(name);
        expect(found).toBeTruthy();
      });
    });

    it('should detect double extension attack "avatar.php.jpg"', () => {
      const found = FileSecurityUtil.findDangerousExtension('avatar.php.jpg');
      expect(found).toBe('php');
    });

    it('should detect double extension attack "invoice.exe.png"', () => {
      const found = FileSecurityUtil.findDangerousExtension('invoice.exe.png');
      expect(found).toBe('exe');
    });

    it('should detect double extension attack "document.sh.pdf"', () => {
      const found = FileSecurityUtil.findDangerousExtension('document.sh.pdf');
      expect(found).toBe('sh');
    });

    it('should reject initiatePresignedUpload with double extension attack', async () => {
      await expect(
        uploadService.initiatePresignedUpload(
          {
            originalFileName: 'profile.php.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
            category: FileCategory.PROFILE,
          },
          { userId: 'u-1', salonId: 's-1', role: 'OWNER' },
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FILE_ASSET_UPLOAD_REJECTED',
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Polyglot & Embedded Script Detection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('5. Polyglot & Embedded Script Detection', () => {
    it('should reject JPEG image containing embedded <script> tags', () => {
      const polyglotBuffer = Buffer.concat([
        JPEG_BUFFER,
        Buffer.from('<script>alert("XSS")</script>', 'utf8'),
      ]);
      const threat = FileSecurityUtil.detectPolyglotScript(polyglotBuffer, 'image/jpeg');
      expect(threat).toContain('<script>');
    });

    it('should reject PNG image containing embedded PHP tags', () => {
      const phpPolyglot = Buffer.concat([
        PNG_BUFFER,
        Buffer.from('<?php system($_GET["c"]); ?>', 'utf8'),
      ]);
      const threat = FileSecurityUtil.detectPolyglotScript(phpPolyglot, 'image/png');
      expect(threat).toContain('PHP script');
    });

    it('should reject raster image containing HTML <html> markup', () => {
      const htmlPolyglot = Buffer.concat([
        JPEG_BUFFER,
        Buffer.from('<!DOCTYPE html><html><body><h1>Stealth HTML</h1></body></html>', 'utf8'),
      ]);
      const threat = FileSecurityUtil.detectPolyglotScript(htmlPolyglot, 'image/jpeg');
      expect(threat).toContain('HTML markup');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. SVG Security & XXE Protection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('6. SVG Security & XXE Protection', () => {
    it('should accept clean SVG vector image', () => {
      const cleanSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red" /></svg>',
        'utf8',
      );
      const error = FileSecurityUtil.validateSvgSafety(cleanSvg);
      expect(error).toBeNull();
    });

    it('should reject SVG containing active <script> element', () => {
      const maliciousSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="5" cy="5" r="5"/></svg>',
        'utf8',
      );
      const error = FileSecurityUtil.validateSvgSafety(maliciousSvg);
      expect(error).toContain('<script>');
    });

    it('should reject SVG containing inline onload= event handlers', () => {
      const eventSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" onload="fetch(\'https://attacker.com\')"><circle cx="5" cy="5" r="5"/></svg>',
        'utf8',
      );
      const error = FileSecurityUtil.validateSvgSafety(eventSvg);
      expect(error).toContain('JavaScript event handler');
    });

    it('should reject SVG containing javascript: URI pseudo-protocol', () => {
      const jsUriSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(document.cookie)"><circle cx="5" cy="5" r="5"/></a></svg>',
        'utf8',
      );
      const error = FileSecurityUtil.validateSvgSafety(jsUriSvg);
      expect(error).toContain('javascript:');
    });

    it('should reject SVG containing XML External Entity (XXE) attack', () => {
      const xxeSvg = Buffer.from(
        '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg><text>&xxe;</text></svg>',
        'utf8',
      );
      const error = FileSecurityUtil.validateSvgSafety(xxeSvg);
      expect(error).toContain('XXE risk');
    });

    it('should reject SVG containing <foreignObject> embedding arbitrary HTML', () => {
      const foreignSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="100" height="100"><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></body></foreignObject></svg>',
        'utf8',
      );
      const error = FileSecurityUtil.validateSvgSafety(foreignSvg);
      expect(error).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Filename Sanitization & Path Traversal Prevention
  // ═══════════════════════════════════════════════════════════════════════════

  describe('7. Filename Sanitization & Path Traversal Prevention', () => {
    it('should strip path traversal sequences (../../etc/passwd.jpg -> passwd.jpg)', () => {
      const sanitized = FileSecurityUtil.sanitizeFileName('../../etc/passwd.jpg');
      expect(sanitized).toBe('passwd.jpg');
    });

    it('should strip Windows path traversal (..\\..\\boot.ini -> boot.ini)', () => {
      const sanitized = FileSecurityUtil.sanitizeFileName('..\\..\\boot.ini');
      expect(sanitized).toBe('boot.ini');
    });

    it('should strip null bytes and encoded null bytes (%00, \\0)', () => {
      const sanitized = FileSecurityUtil.sanitizeFileName('photo.jpg%00.exe');
      expect(sanitized).toBe('photo.jpg.exe');
    });

    it('should strip ASCII control characters (0x00 - 0x1F, 0x7F)', () => {
      const dirty = 'photo\x00\x08\x1b\x7f.jpg';
      const sanitized = FileSecurityUtil.sanitizeFileName(dirty);
      expect(sanitized).toBe('photo.jpg');
    });

    it('should strip Unicode Right-to-Left Override (\\u202E) spoofing characters', () => {
      const rtloSpoof = 'document\u202Egpj.exe';
      const sanitized = FileSecurityUtil.sanitizeFileName(rtloSpoof);
      expect(sanitized).not.toContain('\u202E');
    });

    it('should clamp extremely long filenames to 255 chars while preserving extension', () => {
      const longName = 'a'.repeat(300) + '.jpeg';
      const sanitized = FileSecurityUtil.sanitizeFileName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized.endsWith('.jpeg')).toBe(true);
    });

    it('should fallback to unnamed-file if filename is empty or only dots', () => {
      expect(FileSecurityUtil.sanitizeFileName('')).toBe('unnamed-file');
      expect(FileSecurityUtil.sanitizeFileName('.')).toBe('unnamed-file');
      expect(FileSecurityUtil.sanitizeFileName('..')).toBe('unnamed-file');
      expect(FileSecurityUtil.sanitizeFileName('   ')).toBe('unnamed-file');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. Content-Disposition Header Sanitization (CRLF Injection Defense)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('8. Content-Disposition Header Sanitization', () => {
    it('should strip CRLF characters to prevent HTTP Response Splitting', () => {
      const evilHeader = 'attachment.pdf\r\nSet-Cookie: session=evil\r\n';
      const sanitized = FileSecurityUtil.sanitizeContentDispositionFilename(evilHeader);
      expect(sanitized).not.toContain('\r');
      expect(sanitized).not.toContain('\n');
      expect(sanitized).toBe('attachment.pdfSet-Cookie: session=evil');
    });

    it('should strip double quotes and backslashes from Content-Disposition filename', () => {
      const broken = 'foo"bar\\baz.pdf';
      const sanitized = FileSecurityUtil.sanitizeContentDispositionFilename(broken);
      expect(sanitized).toBe('foobarbaz.pdf');
    });

    it('should sanitize filename when generating download URL in FileAccessService', async () => {
      mockRepo.findById.mockResolvedValueOnce({
        id: 'asset-sec-1',
        salonId: 'salon-1',
        uploadedByUserId: 'user-1',
        originalFileName: 'photo.jpg',
        storedFileName: 'photo.jpg',
        objectKey: 'salons/salon-1/profile/photo.jpg',
        bucket: 'test-bucket',
        provider: 'MOCK_S3',
        mimeType: 'image/jpeg',
        extension: 'jpg',
        sizeBytes: 1024,
        status: FileStatus.READY,
        visibility: FileVisibility.PRIVATE,
        category: FileCategory.PROFILE,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });

      const result = await accessService.getDownloadUrl(
        'asset-sec-1',
        { userId: 'user-1', salonId: 'salon-1', role: 'OWNER' },
        { filename: 'malicious\r\nHeader: injected"name.jpg' },
      );

      expect(mockStorage.generateSignedDownloadUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'maliciousHeader: injectedname.jpg',
        }),
      );
      expect(result.url).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. Custom Metadata Sanitization & System Field Protection
  // ═══════════════════════════════════════════════════════════════════════════

  describe('9. Custom Metadata Sanitization', () => {
    it('should strip forbidden system keys (id, salonId, objectKey, bucket, provider, status)', () => {
      const raw = {
        id: 'injected-id',
        salonId: 'injected-salon',
        uploadedByUserId: 'injected-user',
        objectKey: 'hack/key',
        bucket: 'evil-bucket',
        provider: 'HACKER_STORAGE',
        status: 'READY',
        visibility: 'PUBLIC',
        customTag: 'summer-collection',
        displayOrder: 1,
      };

      const sanitized = FileSecurityUtil.sanitizeCustomMetadata(raw);
      expect(sanitized).toEqual({
        customTag: 'summer-collection',
        displayOrder: 1,
      });
      expect(sanitized?.id).toBeUndefined();
      expect(sanitized?.salonId).toBeUndefined();
      expect(sanitized?.objectKey).toBeUndefined();
      expect(sanitized?.status).toBeUndefined();
    });

    it('should strip sensitive credential keys (password, token, apiKey, secret)', () => {
      const raw = {
        safeField: 'ok',
        adminPassword: '12345password',
        user_api_key: 'sk-1234567890',
        auth_token: 'jwt.token.here',
        stripe_secret: 'sec_123',
      };

      const sanitized = FileSecurityUtil.sanitizeCustomMetadata(raw);
      expect(sanitized).toEqual({
        safeField: 'ok',
      });
    });

    it('should enforce max depth limit (<= 3)', () => {
      const deeplyNested = {
        level1: {
          level2: {
            validProp: 'retained',
            level3: {
              tooDeep: 'should be stripped',
            },
          },
        },
      };

      const sanitized = FileSecurityUtil.sanitizeCustomMetadata(deeplyNested);
      expect(sanitized).toEqual({
        level1: {
          level2: {
            validProp: 'retained',
          },
        },
      });
    });

    it('should reject metadata exceeding maximum allowed top-level keys', () => {
      const tooManyKeys: Record<string, number> = {};
      for (let i = 0; i < 60; i++) {
        tooManyKeys[`key_${i}`] = i;
      }

      expect(() => FileSecurityUtil.sanitizeCustomMetadata(tooManyKeys)).toThrow(
        BadRequestException,
      );
    });

    it('should sanitize metadata on FileAssetService.update', async () => {
      await assetService.update(
        'asset-sec-1',
        {
          metadata: {
            id: 'overwrite-id',
            status: 'READY',
            clientNote: 'Special VIP hair color',
          },
        },
        { userId: 'user-1', salonId: 'salon-1', role: 'OWNER' },
      );

      expect(mockRepo.update).toHaveBeenCalledWith(
        'asset-sec-1',
        expect.objectContaining({
          metadata: {
            clientNote: 'Special VIP hair color',
          },
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. Upload Finalization Security & Invariant Enforcement
  // ═══════════════════════════════════════════════════════════════════════════

  describe('10. Upload Finalization Security', () => {
    it('should mark asset FAILED and throw if physical object does not exist in storage', async () => {
      mockStorage.exists.mockResolvedValueOnce(false);

      await expect(
        lifecycleService.finalizeUpload('asset-sec-1', {
          userId: 'user-1',
          salonId: 'salon-1',
          role: 'OWNER',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockRepo.markFailed).toHaveBeenCalledWith(
        'asset-sec-1',
        expect.stringContaining('Physical object not found'),
        'salon-1',
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FILE_ASSET_UPLOAD_FINALIZATION_FAILED',
        }),
      );
    });

    it('should mark asset FAILED if physical storage object is 0 bytes (empty)', async () => {
      mockStorage.getMetadata.mockResolvedValueOnce({
        objectKey: 'salons/salon-1/profile/photo.jpg',
        sizeBytes: 0,
        contentType: 'image/jpeg',
        lastModified: new Date(),
      });

      await expect(
        lifecycleService.finalizeUpload('asset-sec-1', {
          userId: 'user-1',
          salonId: 'salon-1',
          role: 'OWNER',
        }),
      ).rejects.toThrow('Uploaded file is empty (0 bytes).');

      expect(mockRepo.markFailed).toHaveBeenCalledWith(
        'asset-sec-1',
        'Uploaded file is empty (0 bytes).',
        'salon-1',
      );
    });

    it('should mark asset FAILED if physical file size exceeds category limit', async () => {
      // Profile category limit is 5 MB. Let's return 10 MB in storage metadata.
      mockStorage.getMetadata.mockResolvedValueOnce({
        objectKey: 'salons/salon-1/profile/photo.jpg',
        sizeBytes: 10 * 1024 * 1024,
        contentType: 'image/jpeg',
        lastModified: new Date(),
      });

      await expect(
        lifecycleService.finalizeUpload('asset-sec-1', {
          userId: 'user-1',
          salonId: 'salon-1',
          role: 'OWNER',
        }),
      ).rejects.toThrow(/exceeds maximum limit for category/);

      expect(mockRepo.markFailed).toHaveBeenCalled();
    });

    it('should mark asset FAILED if expectedSize option does not match physical storage size', async () => {
      mockStorage.getMetadata.mockResolvedValueOnce({
        objectKey: 'salons/salon-1/profile/photo.jpg',
        sizeBytes: 5000,
        contentType: 'image/jpeg',
        lastModified: new Date(),
      });

      await expect(
        lifecycleService.finalizeUpload(
          'asset-sec-1',
          { userId: 'user-1', salonId: 'salon-1', role: 'OWNER' },
          { expectedSize: 4000 },
        ),
      ).rejects.toThrow(/does not match expected size/);

      expect(mockRepo.markFailed).toHaveBeenCalled();
    });

    it('should reject finalization of soft-deleted asset', async () => {
      mockRepo.findById.mockResolvedValueOnce({
        id: 'asset-del-1',
        salonId: 'salon-1',
        uploadedByUserId: 'user-1',
        objectKey: 'key',
        status: FileStatus.DELETED,
        deletedAt: new Date(),
      });

      await expect(
        lifecycleService.finalizeUpload('asset-del-1', {
          userId: 'user-1',
          salonId: 'salon-1',
          role: 'OWNER',
        }),
      ).rejects.toThrow('not found');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. Security Scanner Extension Boundary
  // ═══════════════════════════════════════════════════════════════════════════

  describe('11. Security Scanner Extension Boundary', () => {
    it('should successfully pass scanBuffer using NoopSecurityScannerService', async () => {
      const scanner = new NoopSecurityScannerService();
      const result: FileScanResult = await scanner.scanBuffer(JPEG_BUFFER, 'avatar.jpg');
      expect(result.isClean).toBe(true);
      expect(result.scannerName).toBe('BaselineHeuristicScanner');
    });

    it('should integrate custom IFileSecurityScanner and reject upload if malware detected', async () => {
      const mockMalwareScanner: IFileSecurityScanner = {
        scanBuffer: jest.fn().mockResolvedValue({
          isClean: false,
          threatFound: 'Trojan.Script.Heuristic.Gen',
          scannerName: 'ClamAV-Mock',
          scannedAt: new Date(),
        }),
      };

      const scannerService = new FileUploadService(
        mockStorage,
        mockRepo,
        mockAudit,
        mockEventBus,
        authzService,
        mockMalwareScanner,
      );

      await expect(
        scannerService.uploadDirect(
          {
            buffer: JPEG_BUFFER,
            originalFileName: 'infected.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: JPEG_BUFFER.length,
            category: FileCategory.GALLERY,
          },
          { userId: 'user-1', salonId: 'salon-1', role: 'OWNER' },
        ),
      ).rejects.toThrow(/Malware\/threat detected: Trojan.Script.Heuristic.Gen/);

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FILE_ASSET_SECURITY_VALIDATION_FAILED',
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. Path Traversal in Custom Folder Specification
  // ═══════════════════════════════════════════════════════════════════════════

  describe('12. Path Traversal in Custom Folder Specification', () => {
    it('should reject folder path with traversal sequences (../../secret)', async () => {
      await expect(
        uploadService.initiatePresignedUpload(
          {
            originalFileName: 'photo.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
            category: FileCategory.GALLERY,
            folder: '../../secret/folder',
          },
          { userId: 'u-1', salonId: 's-1', role: 'OWNER' },
        ),
      ).rejects.toThrow(/Path traversal sequences are not allowed/);
    });
  });
});
