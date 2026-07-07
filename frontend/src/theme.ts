import { createTheme, type MantineThemeOverride } from '@mantine/core';

export const theme: MantineThemeOverride = createTheme({
    primaryColor: 'brandBlue',
    colors: {
        brandBlue: [
            '#EAF8FE', '#CFF0FC', '#B4E8FA', '#99DFF7', '#7ED7F5',
            '#1EBAF2', '#19A7DA', '#158FBB', '#0F7296', '#0A556F'
        ],
        brandPink: [
            '#FDE6F4', '#FACCE9', '#F7B3DE', '#F499D3', '#F180C8',
            '#E51690', '#CD1481', '#AD116D', '#8C0D58', '#690943'
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
                    border: '1px solid rgba(30, 186, 242, 0.2)',
                    boxShadow: '0 8px 32px rgba(30, 186, 242, 0.12)',
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
                    border: '1px solid rgba(30, 186, 242, 0.2)',
                    boxShadow: '0 8px 32px rgba(30, 186, 242, 0.12)',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(229, 22, 144, 0.2)',
                    }
                }
            })
        },
        Modal: {
            styles: () => ({
                content: {
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(30, 186, 242, 0.2)',
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
                    boxShadow: '0 4px 14px 0 rgba(30, 186, 242, 0.2)',
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
                    borderColor: 'rgba(30, 186, 242, 0.35)',
                    '&:focus': {
                        borderColor: '#1EBAF2',
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
                    borderColor: 'rgba(30, 186, 242, 0.35)',
                    '&:focus': {
                        borderColor: '#1EBAF2',
                    }
                }
            })
        }
    },
});

