import { Platform } from 'react-native';
import {
  appConfigService,
  AppConfig,
  UpdateMode,
} from '../app-config.service';
import {
  androidUpdateManager,
  PlayInAppUpdateType,
} from './AndroidUpdateManager';
import { iOSUpdateManager } from './iOSUpdateManager';

export interface UpdatePromptState {
  visible: boolean;
  mode: UpdateMode;
  title: string;
  message: string;
  storeUrl: string;
  isMandatory: boolean;
}

type UpdateStateListener = (state: UpdatePromptState) => void;

export class UpdateManager {
  private listeners: Set<UpdateStateListener> = new Set();
  private currentState: UpdatePromptState = {
    visible: false,
    mode: UpdateMode.NONE,
    title: '',
    message: '',
    storeUrl: '',
    isMandatory: false,
  };

  /**
   * Initializes update governance non-blockingly on app start.
   */
  public async initialize(): Promise<void> {
    // 1. Fetch remote config asynchronously in the background
    await appConfigService.fetchRemoteConfig();

    // 2. Evaluate application update policy state
    this.evaluateAndNotify();
  }

  /**
   * Subscribes a UI component to update prompt changes.
   */
  public subscribe(listener: UpdateStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Evaluates current version state and notifies listeners if a prompt is required.
   */
  public evaluateAndNotify(): void {
    const evaluation = appConfigService.evaluateUpdateState();

    if (evaluation.mode === UpdateMode.MANDATORY) {
      this.currentState = {
        visible: true,
        mode: UpdateMode.MANDATORY,
        title: evaluation.title,
        message: evaluation.message,
        storeUrl: evaluation.storeUrl,
        isMandatory: true,
      };
      this.notifyListeners();
    } else if (evaluation.mode === UpdateMode.RECOMMENDED) {
      this.currentState = {
        visible: true,
        mode: UpdateMode.RECOMMENDED,
        title: evaluation.title,
        message: evaluation.message,
        storeUrl: evaluation.storeUrl,
        isMandatory: false,
      };
      this.notifyListeners();
    } else {
      this.currentState = {
        visible: false,
        mode: UpdateMode.NONE,
        title: '',
        message: '',
        storeUrl: evaluation.storeUrl,
        isMandatory: false,
      };
      this.notifyListeners();
    }
  }

  /**
   * Handles user tapping "Update Now" on the prompt modal.
   */
  public async handleUpdateAction(): Promise<void> {
    const { mode, storeUrl } = this.currentState;

    if (Platform.OS === 'android') {
      const playType =
        mode === UpdateMode.MANDATORY
          ? PlayInAppUpdateType.IMMEDIATE
          : PlayInAppUpdateType.FLEXIBLE;
      await androidUpdateManager.promptPlayStoreUpdate(playType, storeUrl);
    } else if (Platform.OS === 'ios') {
      await iOSUpdateManager.promptAppStoreUpdate(storeUrl);
    }
  }

  /**
   * Handles user dismissing a recommended update ("Later").
   */
  public handleDismiss(): void {
    if (this.currentState.isMandatory) {
      // Mandatory updates cannot be dismissed
      return;
    }

    const config = appConfigService.getConfig();
    appConfigService.recordDismissal(config.app.recommendedVersion);

    this.currentState = {
      ...this.currentState,
      visible: false,
    };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.currentState));
  }
}

export const updateManager = new UpdateManager();
