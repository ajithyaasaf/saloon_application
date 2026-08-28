import { SkipAllThrottlers } from '../throttler.decorator';
import { THROTTLER_SKIP } from '@nestjs/throttler/dist/throttler.constants';

describe('Throttler Decorators', () => {
  it('SkipAllThrottlers should set skip metadata for all named throttlers', () => {
    class TestController {
      testMethod() {}
    }

    const decorator = SkipAllThrottlers();
    decorator(TestController);

    const defaultSkip = Reflect.getMetadata(`${THROTTLER_SKIP}default`, TestController);
    const otpSkip = Reflect.getMetadata(`${THROTTLER_SKIP}otp`, TestController);
    const loginSkip = Reflect.getMetadata(`${THROTTLER_SKIP}login`, TestController);
    const bookingSkip = Reflect.getMetadata(`${THROTTLER_SKIP}booking`, TestController);
    const searchSkip = Reflect.getMetadata(`${THROTTLER_SKIP}search`, TestController);

    expect(defaultSkip).toBe(true);
    expect(otpSkip).toBe(true);
    expect(loginSkip).toBe(true);
    expect(bookingSkip).toBe(true);
    expect(searchSkip).toBe(true);
  });
});
