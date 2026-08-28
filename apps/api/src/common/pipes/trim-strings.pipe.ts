import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

/**
 * TrimStringsPipe — trims all string values in request bodies and query parameters
 * before the ValidationPipe runs class-validator decorators.
 *
 * Applied globally in AppModule & main.ts.
 * Prevents whitespace-only values from passing @IsNotEmpty() checks.
 * Protects against Prototype Pollution attacks (__proto__, constructor, prototype).
 */
@Injectable()
export class TrimStringsPipe implements PipeTransform {
  private static readonly DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

  transform(value: unknown, _metadata?: ArgumentMetadata): unknown {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (Array.isArray(value)) {
      return this.trimArray(value);
    }
    if (value !== null && typeof value === 'object') {
      return this.trimObject(value as Record<string, unknown>);
    }
    return value;
  }

  private trimArray(arr: unknown[]): unknown[] {
    return arr.map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }
      if (Array.isArray(item)) {
        return this.trimArray(item);
      }
      if (item !== null && typeof item === 'object') {
        return this.trimObject(item as Record<string, unknown>);
      }
      return item;
    });
  }

  private trimObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = Object.create(null);
    for (const [key, val] of Object.entries(obj)) {
      if (TrimStringsPipe.DANGEROUS_KEYS.has(key)) {
        continue; // Strip prototype pollution keys
      }
      if (typeof val === 'string') {
        result[key] = val.trim();
      } else if (Array.isArray(val)) {
        result[key] = this.trimArray(val);
      } else if (val !== null && typeof val === 'object') {
        result[key] = this.trimObject(val as Record<string, unknown>);
      } else {
        result[key] = val;
      }
    }
    return { ...result };
  }
}
