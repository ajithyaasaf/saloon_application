import { StringUtil } from '../string.util';

describe('StringUtil', () => {
  describe('normalizeWhitespace()', () => {
    it('should collapse repeated spaces and trim leading/trailing whitespace', () => {
      expect(StringUtil.normalizeWhitespace('  hello   world  ')).toBe('hello world');
      expect(StringUtil.normalizeWhitespace('Priya   Sharma')).toBe('Priya Sharma');
      expect(StringUtil.normalizeWhitespace('   ')).toBe('');
    });
  });

  describe('truncate()', () => {
    it('should truncate strings exceeding maxLength with default suffix', () => {
      expect(StringUtil.truncate('Hello World Platform', 10)).toBe('Hello W...');
    });

    it('should return original string when length <= maxLength', () => {
      expect(StringUtil.truncate('Hello', 10)).toBe('Hello');
      expect(StringUtil.truncate('', 10)).toBe('');
    });

    it('should support custom suffix and respect total maxLength', () => {
      const res = StringUtil.truncate('Hello World Platform', 12, '---');
      expect(res).toBe('Hello Wor---');
      expect(res.length).toBe(12);
    });

    it('should handle unicode characters safely', () => {
      const res = StringUtil.truncate('✨ Glamour Salon ✨', 10);
      expect(res).toBe('✨ Glamo...');
      expect(res.length).toBe(10);
    });
  });

  describe('toCamelCase()', () => {
    it('should convert kebab-case, snake_case, and spaced strings to camelCase', () => {
      expect(StringUtil.toCamelCase('hello-world')).toBe('helloWorld');
      expect(StringUtil.toCamelCase('hello_world_test')).toBe('helloWorldTest');
      expect(StringUtil.toCamelCase('Hello World')).toBe('helloWorld');
    });
  });

  describe('toSnakeCase()', () => {
    it('should convert camelCase, kebab-case, and spaced strings to snake_case', () => {
      expect(StringUtil.toSnakeCase('helloWorld')).toBe('hello_world');
      expect(StringUtil.toSnakeCase('hello-world-test')).toBe('hello_world_test');
      expect(StringUtil.toSnakeCase('Hello World')).toBe('hello_world');
    });
  });

  describe('interpolate()', () => {
    it('should replace {{key}} placeholders in template string', () => {
      const template = 'Hello {{firstName}} {{lastName}}, welcome to {{salonName}}!';
      const result = StringUtil.interpolate(template, {
        firstName: 'Priya',
        lastName: 'Sharma',
        salonName: 'Glamour Salon',
      });
      expect(result).toBe('Hello Priya Sharma, welcome to Glamour Salon!');
    });

    it('should leave unmatched placeholders untouched', () => {
      const template = 'Hello {{firstName}} {{unknownKey}}!';
      const result = StringUtil.interpolate(template, { firstName: 'Priya' });
      expect(result).toBe('Hello Priya {{unknownKey}}!');
    });
  });

  describe('escapeHtml()', () => {
    it('should escape dangerous HTML characters to prevent XSS', () => {
      expect(StringUtil.escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;',
      );
      expect(StringUtil.escapeHtml("Hello 'world' & `test`")).toBe(
        'Hello &#x27;world&#x27; &amp; &#x60;test&#x60;',
      );
    });
  });

  describe('stripHtml()', () => {
    it('should remove HTML tags, script blocks, and style blocks', () => {
      const dirty = '<script>alert(1)</script><p>Hello <b>World</b></p><style>body { color: red; }</style>';
      expect(StringUtil.stripHtml(dirty)).toBe('Hello World');
    });

    it('should normalize whitespace after stripping tags', () => {
      const dirty = '<div>  Line 1  </div>\n<div>  Line 2  </div>';
      expect(StringUtil.stripHtml(dirty)).toBe('Line 1 Line 2');
    });
  });

  describe('sanitizeText()', () => {
    it('should strip HTML, remove control chars, normalize whitespace, and truncate', () => {
      const dirty = '  <b>Great</b> service!\x00 <script>steal()</script>  ';
      expect(StringUtil.sanitizeText(dirty)).toBe('Great service!');
      expect(StringUtil.sanitizeText(dirty, 8)).toBe('Great...');
    });
  });
});
