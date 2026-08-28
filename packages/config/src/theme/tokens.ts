/**
 * Layer 2 & Layer 3 Token Contracts
 * 
 * Defines semantic roles (Layer 2) and component-specific style aliases (Layer 3).
 * Every theme must strictly implement this ThemeDefinition contract.
 */

export interface SemanticColors {
  // Background roles
  background: {
    canvas: string;
    surface: string;
    elevated: string;
    inset: string;
    inverse: string;
    overlay: string;
  };

  // Text roles
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
    disabled: string;
  };

  // Border roles
  border: {
    subtle: string;
    default: string;
    strong: string;
    focus: string;
    error: string;
  };

  // Action roles
  action: {
    primary: string;
    primaryHover: string;
    primaryActive: string;
    primarySubtle: string;
    secondary: string;
    secondaryHover: string;
    secondaryActive: string;
    ghostHover: string;
    ghostActive: string;
    destructive: string;
    destructiveHover: string;
    destructiveSubtle: string;
    disabled: string;
  };

  // Interactive states
  interactive: {
    hover: string;
    active: string;
    selected: string;
    focusRing: string;
    disabled: string;
  };

  // Status roles
  status: {
    success: string;
    successSubtle: string;
    successBorder: string;
    warning: string;
    warningSubtle: string;
    warningBorder: string;
    error: string;
    errorSubtle: string;
    errorBorder: string;
    info: string;
    infoSubtle: string;
    infoBorder: string;
  };
}

export interface TypographyTokenRole {
  fontFamily: string;
  fontSize: string;
  fontWeight: number | string;
  lineHeight: string | number;
  letterSpacing: string;
  textTransform?: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
}

export interface SemanticTypography {
  display: TypographyTokenRole;
  pageTitle: TypographyTokenRole;
  sectionTitle: TypographyTokenRole;
  cardTitle: TypographyTokenRole;
  bodyLarge: TypographyTokenRole;
  body: TypographyTokenRole;
  bodySecondary: TypographyTokenRole;
  caption: TypographyTokenRole;
  label: TypographyTokenRole;
  button: TypographyTokenRole;
}

export interface SemanticShadows {
  none: string;
  sm: string;
  md: string;
  lg: string;
  focus: string;
}

export interface ComponentTokens {
  button: {
    primary: {
      background: string;
      backgroundHover: string;
      backgroundActive: string;
      text: string;
      border: string;
      shadow: string;
    };
    secondary: {
      background: string;
      backgroundHover: string;
      backgroundActive: string;
      text: string;
      border: string;
    };
    ghost: {
      background: string;
      backgroundHover: string;
      backgroundActive: string;
      text: string;
    };
    destructive: {
      background: string;
      backgroundHover: string;
      backgroundActive: string;
      text: string;
      border: string;
    };
    disabled: {
      background: string;
      text: string;
      border: string;
    };
  };

  input: {
    background: string;
    text: string;
    placeholder: string;
    border: string;
    borderHover: string;
    borderFocus: string;
    borderError: string;
    focusRing: string;
    disabledBackground: string;
    disabledText: string;
  };

  card: {
    background: string;
    border: string;
    borderHover: string;
    shadow: string;
    radius: string;
  };

  badge: {
    success: { background: string; text: string; border: string };
    warning: { background: string; text: string; border: string };
    error: { background: string; text: string; border: string };
    info: { background: string; text: string; border: string };
    neutral: { background: string; text: string; border: string };
    primary: { background: string; text: string; border: string };
  };

  table: {
    header: {
      background: string;
      text: string;
      border: string;
    };
    row: {
      background: string;
      backgroundHover: string;
      backgroundSelected: string;
      border: string;
      text: string;
    };
  };

  modal: {
    background: string;
    overlay: string;
    border: string;
    shadow: string;
    radius: string;
  };

  drawer: {
    background: string;
    border: string;
    shadow: string;
  };

  sidebar: {
    background: string;
    border: string;
    item: {
      backgroundHover: string;
      backgroundActive: string;
      text: string;
      textActive: string;
      borderActive: string;
    };
  };

  header: {
    background: string;
    border: string;
    text: string;
  };

  navigation: {
    background: string;
    itemActive: string;
    itemHover: string;
    itemInactive: string;
    border: string;
  };
}

export interface ThemeDensity {
  compact: {
    tableCellPaddingY: string;
    inputHeight: string;
    cardPadding: string;
    buttonPaddingY: string;
  };
  comfortable: {
    tableCellPaddingY: string;
    inputHeight: string;
    cardPadding: string;
    buttonPaddingY: string;
  };
}

export interface ThemeDefinition {
  id: string;
  name: string;
  appearance: 'dark' | 'light';
  color: SemanticColors;
  typography: SemanticTypography;
  shadow: SemanticShadows;
  density: ThemeDensity;
  button: ComponentTokens['button'];
  input: ComponentTokens['input'];
  card: ComponentTokens['card'];
  badge: ComponentTokens['badge'];
  table: ComponentTokens['table'];
  modal: ComponentTokens['modal'];
  drawer: ComponentTokens['drawer'];
  sidebar: ComponentTokens['sidebar'];
  header: ComponentTokens['header'];
  navigation: ComponentTokens['navigation'];
}
