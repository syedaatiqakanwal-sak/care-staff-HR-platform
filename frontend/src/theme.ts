import { createTheme, type MantineThemeOverride } from '@mantine/core';

export const theme: MantineThemeOverride = createTheme({
    primaryColor: 'brandBlue',
    colors: {
        brandBlue: [
            '#e6f5eb', '#c2e8d1', '#9ddbb6', '#79ce9b', '#54c180',
            '#139639', '#118233', '#0e7a2d', '#0b6224', '#084a1b'
        ],
        brandPink: [
            '#e3f0f8', '#b8d4ea', '#8db8dc', '#629cce', '#3780c0',
            '#267FBA', '#2172a7', '#1d6a9e', '#185388', '#133d72'
        ],
        brandGray: [
            '#FFFFFF', '#F5F5F5', '#EDECF1', '#E2E1E8', '#D2D1D8',
            '#ADB5BD', '#868E96', '#495057', '#343A40', '#212529'
        ]
    },
    // Strict Text Colors
    other: {
        textPrimary: '#333333',
        textSecondary: '#4b5563',
        textMuted: 'rgba(0, 0, 0, 0.55)',
    },
    fontFamily: 'system-ui, -apple-system, sans-serif',
    headings: {
        fontFamily: 'Roboto, sans-serif',
        fontWeight: '800',
        sizes: {
            h1: { fontSize: '2.5rem', lineHeight: '1.2' },
        }
    },
    shadows: {
        xs: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
        sm: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
        md: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)',
        lg: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        xl: '0 25px 50px -12px rgba(0,0,0,0.15)',
    },
    components: {
        Paper: {
            defaultProps: {
                radius: 'xl',
                withBorder: false,
                shadow: 'md',
            },
            styles: (theme: any) => ({
                root: {
                    backgroundColor: '#ffffff', // Solid white instead of glass
                    border: '1px solid rgba(19, 150, 57, 0.2)',
                    boxShadow: '0 8px 32px rgba(19, 150, 57, 0.12)',
                    transition: 'all 0.25s ease',
                    color: theme.other?.textPrimary || '#1f2937',
                }
            })
        },
        Card: {
            defaultProps: {
                radius: 'xl',
                shadow: 'sm',
            },
            styles: () => ({
                root: {
                    backgroundColor: '#ffffff', // Solid white
                    border: '1px solid rgba(19, 150, 57, 0.2)',
                    boxShadow: '0 8px 32px rgba(19, 150, 57, 0.12)',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(38, 127, 186, 0.2)',
                    }
                }
            })
        },
        Modal: {
            styles: () => ({
                content: {
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(19, 150, 57, 0.2)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)',
                    borderRadius: '24px',
                },
                header: {
                    backgroundColor: 'transparent',
                }
            })
        },
        Button: {
            defaultProps: {
                radius: 'xl',
                size: 'md',
            },
            styles: {
                root: {
                    transition: 'all 0.2s ease',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px 0 rgba(19, 150, 57, 0.2)',
                }
            }
        },
        TextInput: {
            defaultProps: {
                radius: 'md',
                size: 'md',
            },
            styles: () => ({
                input: {
                    backgroundColor: '#ffffff',
                    borderColor: 'rgba(19, 150, 57, 0.35)',
                    '&:focus': {
                        borderColor: '#139639',
                    }
                }
            })
        },
        PasswordInput: {
            defaultProps: {
                radius: 'md',
                size: 'md',
            },
            styles: () => ({
                input: {
                    backgroundColor: '#ffffff',
                    borderColor: 'rgba(19, 150, 57, 0.35)',
                    '&:focus': {
                        borderColor: '#139639',
                    }
                }
            })
        }
    },
});
