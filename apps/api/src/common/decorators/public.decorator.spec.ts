import { IS_PUBLIC_KEY, Public } from './public.decorator';

describe('@Public() decorator', () => {
  it('should set IS_PUBLIC_KEY metadata to true on a class method', () => {
    class TestController {
      @Public()
      handler(): void {}
    }

    const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, TestController.prototype.handler);
    expect(metadata).toBe(true);
  });

  it('should export the IS_PUBLIC_KEY constant as "isPublic"', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('should be callable without arguments', () => {
    expect(() => Public()).not.toThrow();
  });

  it('should apply the decorator multiple times without error', () => {
    expect(() => {
      class AnotherController {
        @Public()
        firstRoute(): void {}

        @Public()
        secondRoute(): void {}
      }
      return AnotherController;
    }).not.toThrow();
  });
});
