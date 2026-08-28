import { UpdateManager } from '../services/update/UpdateManager';
import { appConfigService, UpdateMode } from '../services/app-config.service';

describe('UpdateManager', () => {
  let manager: UpdateManager;

  beforeEach(() => {
    manager = new UpdateManager();
  });

  it('should notify subscribers with initial state', (done) => {
    manager.subscribe((state) => {
      expect(state).toBeDefined();
      expect(state.mode).toBe(UpdateMode.NONE);
      expect(state.visible).toBe(false);
      done();
    });
  });

  it('should not allow dismissal when update is mandatory', () => {
    // Mock mandatory state
    jest.spyOn(appConfigService, 'evaluateUpdateState').mockReturnValue({
      mode: UpdateMode.MANDATORY,
      title: 'Update Required',
      message: 'Please update.',
      storeUrl: 'market://details?id=com.saloon.customer',
    });

    manager.evaluateAndNotify();

    let currentState: any;
    manager.subscribe((state) => {
      currentState = state;
    });

    expect(currentState.isMandatory).toBe(true);
    expect(currentState.visible).toBe(true);

    // Attempt dismiss
    manager.handleDismiss();

    // Must remain visible
    expect(currentState.visible).toBe(true);
  });

  it('should allow dismissal when update is recommended', () => {
    jest.spyOn(appConfigService, 'evaluateUpdateState').mockReturnValue({
      mode: UpdateMode.RECOMMENDED,
      title: 'New Update',
      message: 'Enhancements ready.',
      storeUrl: 'market://details?id=com.saloon.customer',
    });

    manager.evaluateAndNotify();

    let currentState: any;
    manager.subscribe((state) => {
      currentState = state;
    });

    expect(currentState.isMandatory).toBe(false);
    expect(currentState.visible).toBe(true);

    manager.handleDismiss();

    expect(currentState.visible).toBe(false);
  });
});
