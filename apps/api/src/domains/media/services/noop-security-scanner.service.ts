import { Injectable, Logger } from '@nestjs/common';
import {
  FileScanResult,
  IFileSecurityScanner,
} from '../interfaces/file-security-scanner.interface';

/**
 * NoopSecurityScannerService — Default baseline file security scanner.
 * Serves as the standard extension point until external engine (ClamAV, GuardDuty, etc.) is configured.
 */
@Injectable()
export class NoopSecurityScannerService implements IFileSecurityScanner {
  private readonly logger = new Logger(NoopSecurityScannerService.name);

  public async scanBuffer(_buffer: Buffer, _filename: string): Promise<FileScanResult> {
    return {
      isClean: true,
      threatFound: null,
      scannerName: 'BaselineHeuristicScanner',
      scannedAt: new Date(),
    };
  }

  public async scanStream(_stream: NodeJS.ReadableStream, _filename: string): Promise<FileScanResult> {
    return {
      isClean: true,
      threatFound: null,
      scannerName: 'BaselineHeuristicScanner',
      scannedAt: new Date(),
    };
  }
}
