// --- react-native mock for node test environment ---------------------------
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
    select: jest.fn((dict) => dict.android || dict.default),
  },
  Linking: {
    canOpenURL: jest.fn(async () => true),
    openURL: jest.fn(async () => {}),
  },
  Modal: 'Modal',
  StyleSheet: {
    create: (styles) => styles,
    absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StatusBar: 'StatusBar',
  SafeAreaView: 'SafeAreaView',
  Image: 'Image',
  ImageBackground: 'ImageBackground',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
}));

// --- expo-secure-store: in-memory Keychain/Keystore replacement -------------
const mockSecureStoreMemory = new Map();

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(async (key) =>
    mockSecureStoreMemory.has(key) ? mockSecureStoreMemory.get(key) : null,
  ),
  setItemAsync: jest.fn(async (key, value) => {
    mockSecureStoreMemory.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key) => {
    mockSecureStoreMemory.delete(key);
  }),
}));

// --- expo-notifications ------------------------------------------------------
jest.mock(
  'expo-notifications',
  () => ({
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]' })),
    addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    removeNotificationSubscription: jest.fn(),
  }),
  { virtual: true },
);

// --- expo-image-picker --------------------------------------------------------
jest.mock(
  'expo-image-picker',
  () => ({
    MediaTypeOptions: { Images: 'Images', Videos: 'Videos', All: 'All' },
    requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    requestCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
    launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  }),
  { virtual: true },
);

// --- react-native-razorpay (native module, absent under Jest) -----------------
jest.mock(
  'react-native-razorpay',
  () => ({
    __esModule: true,
    default: {
      open: jest.fn(async () => {
        throw new Error('Razorpay is not available in the Jest environment');
      }),
    },
  }),
  { virtual: true },
);

// --- expo-file-system (only what the media service uses) ----------------------
jest.mock(
  'expo-file-system',
  () => ({
    uploadAsync: jest.fn(async () => ({ status: 200, body: '{}' })),
    getInfoAsync: jest.fn(async () => ({ exists: true, size: 1024 })),
  }),
  { virtual: true },
);
