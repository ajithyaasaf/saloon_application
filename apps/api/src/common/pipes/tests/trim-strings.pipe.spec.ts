import { ArgumentMetadata } from '@nestjs/common';
import { TrimStringsPipe } from '../trim-strings.pipe';

describe('TrimStringsPipe', () => {
  let pipe: TrimStringsPipe;
  const mockMetadata: ArgumentMetadata = { type: 'body' };

  beforeEach(() => {
    pipe = new TrimStringsPipe();
  });

  it('should trim string values', () => {
    expect(pipe.transform('  hello world  ', mockMetadata)).toBe('hello world');
    expect(pipe.transform('\n\t test \t\n', mockMetadata)).toBe('test');
  });

  it('should return non-string primitives as-is', () => {
    expect(pipe.transform(12345, mockMetadata)).toBe(12345);
    expect(pipe.transform(true, mockMetadata)).toBe(true);
    expect(pipe.transform(false, mockMetadata)).toBe(false);
    expect(pipe.transform(null, mockMetadata)).toBeNull();
    expect(pipe.transform(undefined, mockMetadata)).toBeUndefined();
  });

  it('should trim string values inside simple objects', () => {
    const input = {
      name: '  John Doe  ',
      email: '  john@example.com ',
      age: 28,
    };
    const result = pipe.transform(input, mockMetadata) as any;
    expect(result).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      age: 28,
    });
  });

  it('should recursively trim nested objects and arrays', () => {
    const input = {
      user: {
        firstName: '  Alice  ',
        tags: ['  vip  ', '  loyal customer  '],
        address: {
          city: '  Mumbai  ',
          pincode: '400001',
        },
      },
      items: [
        { title: ' Haircut  ', count: 2 },
        { title: '  Spa Facial ', count: 1 },
      ],
    };
    const result = pipe.transform(input, mockMetadata) as any;
    expect(result).toEqual({
      user: {
        firstName: 'Alice',
        tags: ['vip', 'loyal customer'],
        address: {
          city: 'Mumbai',
          pincode: '400001',
        },
      },
      items: [
        { title: 'Haircut', count: 2 },
        { title: 'Spa Facial', count: 1 },
      ],
    });
  });

  it('should strip prototype pollution keys (__proto__, constructor, prototype)', () => {
    const dangerousPayload = JSON.parse('{"name":" attacker ","__proto__":{"admin":true},"constructor":{"prototype":{"injected":true}}}');
    const result = pipe.transform(dangerousPayload, mockMetadata) as any;
    expect(result.name).toBe('attacker');
    expect(result.__proto__?.admin).toBeUndefined();
    expect(result.constructor?.prototype?.injected).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false);
  });
});
