import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    // Get theme from localStorage or default to 'light'
    const [theme, setTheme] = useState<Theme>(() => {
        const savedTheme = localStorage.getItem('theme');
        return (savedTheme as Theme) || 'light';
    });

    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

    useEffect(() => {
        // Save theme preference to localStorage
        localStorage.setItem('theme', theme);

        // Determine if dark mode should be applied
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const shouldApplyDark =
            theme === 'dark' ||
            (theme === 'system' && prefersDark);

        setIsDarkMode(shouldApplyDark);

        // Apply or remove dark class on document
        if (shouldApplyDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    // Listen for system preference changes if theme is set to 'system'
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            setIsDarkMode(mediaQuery.matches);
            if (mediaQuery.matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const value = {
        theme,
        setTheme,
        isDarkMode
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};