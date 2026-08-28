/**
 * Scan result returned by a security/antivirus scanner.
 */
export interface FileScanResult {
  isClean: boolean;
  threatFound?: string | null;
  scannerName: string;
  scannedAt: Date;
}

/**
 * IFileSecurityScanner — Production integration boundary for file security scanners
 * (e.g. ClamAV, AWS GuardDuty, VirusTotal, or local in-memory heuristic engines).
 *
 * Plugs into the upload pipeline:
 * UPLOADING -> PROCESSING -> scanner.scan() -> READY (or FAILED)
 */
export interface IFileSecurityScanner {
  /**
   * Scans an in-memory buffer before storage upload.
   */
  scanBuffer(buffer: Buffer, filename: string): Promise<FileScanResult>;

  /**
   * Scans a readable stream from storage during background async processing.
   */
  scanStream?(stream: NodeJS.ReadableStream, filename: string): Promise<FileScanResult>;
}

export const FILE_SECURITY_SCANNER_TOKEN = 'FILE_SECURITY_SCANNER_TOKEN';
