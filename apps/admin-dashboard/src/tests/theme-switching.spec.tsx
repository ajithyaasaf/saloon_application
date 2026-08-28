import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AppButton } from '../components/ui/AppButton';

const TestThemeComponent: React.FC = () => {
  const { theme, activeThemeId, setTheme, availableThemeIds } = useTheme();

  return (
    <div>
      <span data-testid="current-theme-id">{activeThemeId}</span>
      <span data-testid="current-theme-name">{theme.name}</span>
      <span data-testid="current-theme-appearance">{theme.appearance}</span>
      {availableThemeIds.map((id) => (
        <button key={id} data-testid={`set-theme-${id}`} onClick={() => setTheme(id)}>
          {id}
        </button>
      ))}
      <AppButton variant="primary">Themed Button</AppButton>
    </div>
  );
};

describe('Admin Dashboard Theme Engine & Switching Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('initializes with default luxury-noir theme', () => {
    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme-id')).toHaveTextContent('luxury-noir');
    expect(screen.getByTestId('current-theme-appearance')).toHaveTextContent('dark');
  });

  it('switches to emerald botanical theme dynamically', () => {
    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('set-theme-botanical'));
    });

    expect(screen.getByTestId('current-theme-id')).toHaveTextContent('botanical');
    expect(screen.getByTestId('current-theme-name')).toHaveTextContent('Emerald Botanical');
    expect(document.documentElement.getAttribute('data-theme')).toBe('botanical');
  });

  it('switches to light-minimal theme dynamically', () => {
    render(
      <ThemeProvider>
        <TestThemeComponent />
      </ThemeProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('set-theme-light-minimal'));
    });

    expect(screen.getByTestId('current-theme-id')).toHaveTextContent('light-minimal');
    expect(screen.getByTestId('current-theme-appearance')).toHaveTextContent('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light-minimal');
  });
});
