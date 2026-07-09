import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Box, Button, Group, Paper, Text, Modal } from '@mantine/core';
import { X } from 'lucide-react';

interface SignaturePadProps {
    value?: string; // Base64 dataURL of the signature
    onChange: (dataURL: string) => void;
    label: string;
    disabled?: boolean;
    width?: number;
    height?: number;
}

export const SignaturePad = ({ 
    value, 
    onChange, 
    label, 
    disabled = false,
    width = 400,
    height = 200
}: SignaturePadProps) => {
    const sigPadRef = useRef<SignatureCanvas>(null);
    const [modalOpened, setModalOpened] = useState(false);
    const [hasSignature, setHasSignature] = useState(!!value);
    const [canvasHasContent, setCanvasHasContent] = useState(false);

    const handleClear = () => {
        if (sigPadRef.current) {
            sigPadRef.current.clear();
            setHasSignature(false);
            setCanvasHasContent(false);
        }
    };

    const handleSave = () => {
        if (sigPadRef.current) {
            // Check if canvas has content
            const isEmpty = sigPadRef.current.isEmpty();
            if (!isEmpty) {
                try {
                    const dataURL = sigPadRef.current.toDataURL('image/png');
                    onChange(dataURL);
                    setHasSignature(true);
                    setModalOpened(false);
                } catch (error) {
                    console.error('Error saving signature:', error);
                }
            }
        }
    };

    const handleCanvasEnd = () => {
        // Check if canvas has content after drawing ends
        if (sigPadRef.current) {
            const isEmpty = sigPadRef.current.isEmpty();
            setCanvasHasContent(!isEmpty);
        }
    };

    const handleOpen = () => {
        if (!disabled) {
            setModalOpened(true);
        }
    };

    // Load existing signature when modal opens
    useEffect(() => {
        if (modalOpened && sigPadRef.current) {
            // Reset canvas content state
            if (value) {
                // Load existing signature
                setTimeout(() => {
                    if (sigPadRef.current && value) {
                        try {
                            sigPadRef.current.clear();
                            sigPadRef.current.fromDataURL(value);
                            setCanvasHasContent(true);
                            setHasSignature(true);
                        } catch (error) {
                            console.error('Error loading signature:', error);
                            setCanvasHasContent(false);
                        }
                    }
                }, 150);
            } else {
                // Clear canvas if no existing signature
                if (sigPadRef.current) {
                    sigPadRef.current.clear();
                    setCanvasHasContent(false);
                }
            }
        }
    }, [modalOpened, value]);

    return (
        <>
            <Box>
                <Text size="sm" fw={500} mb="xs">{label}</Text>
                {value ? (
                    <Paper 
                        withBorder 
                        p="sm" 
                        style={{ 
                            cursor: disabled ? 'default' : 'pointer',
                            display: 'inline-block',
                        }}
                        onClick={handleOpen}
                    >
                        <img 
                            src={value} 
                            alt="Signature" 
                            style={{ 
                                maxWidth: '200px', 
                                maxHeight: '80px',
                                display: 'block'
                            }} 
                        />
                    </Paper>
                ) : (
                    <Paper 
                        withBorder 
                        p="md" 
                        style={{ 
                            cursor: disabled ? 'default' : 'pointer',
                            textAlign: 'center',
                            minHeight: '80px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: disabled ? '#f5f5f5' : '#f0fff4',
                            borderColor: disabled ? '#dee2e6' : '#267FBA',
                            borderWidth: disabled ? '1px' : '2px',
                            borderStyle: disabled ? 'solid' : 'dashed',
                        }}
                        onClick={handleOpen}
                    >
                        <Text size="sm" c={disabled ? 'dimmed' : '#267FBA'} fw={disabled ? 400 : 600}>
                            {disabled ? 'Signature locked' : '✍️ Click here to sign'}
                        </Text>
                    </Paper>
                )}
            </Box>

            <Modal
                opened={modalOpened}
                onClose={() => setModalOpened(false)}
                title={label}
                size="lg"
                centered
                zIndex={1000}
            >
                <Box>
                    <Paper withBorder p="md" style={{ backgroundColor: '#fff' }}>
                        <SignatureCanvas
                            ref={sigPadRef}
                            onEnd={handleCanvasEnd}
                            canvasProps={{
                                width,
                                height,
                                className: 'signature-canvas',
                                style: {
                                    border: '1px solid #ddd',
                                    borderRadius: '4px',
                                    cursor: 'crosshair',
                                    display: 'block',
                                    width: '100%',
                                    height: 'auto'
                                }
                            }}
                            backgroundColor="#ffffff"
                        />
                    </Paper>
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={handleClear}>
                            Clear
                        </Button>
                        <Button 
                            onClick={handleSave}
                            disabled={!canvasHasContent}
                            color="blue"
                        >
                            Save Signature
                        </Button>
                        <Button variant="default" onClick={() => setModalOpened(false)}>
                            Cancel
                        </Button>
                    </Group>
                </Box>
            </Modal>

            <style>{`
                .signature-canvas {
                    touch-action: none;
                }
            `}</style>
        </>
    );
};
