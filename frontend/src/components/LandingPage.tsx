import { Link } from 'react-router-dom';
import { Box, Center, Stack, Title, Text, Button, Container, Group, Anchor } from '@mantine/core';

export const LandingPage = () => {
    return (
        <Box
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'radial-gradient(circle at top right, #E2E1E8, #FFFFFF 50%, #F5F5F5 100%)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Animated decorative blobs */}
            <Box
                style={{
                    position: 'absolute',
                    top: '-5%',
                    right: '-2%',
                    width: '600px',
                    height: '600px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(19, 150, 57, 0.2) 0%, rgba(38, 127, 186, 0.12) 100%)',
                    filter: 'blur(80px)'
                }}
            />
            <Box
                style={{
                    position: 'absolute',
                    bottom: '-10%',
                    left: '-5%',
                    width: '500px',
                    height: '500px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(19, 150, 57, 0.12) 0%, rgba(38, 127, 186, 0.08) 100%)',
                    filter: 'blur(80px)'
                }}
            />

            <Center style={{ flex: 1, zIndex: 1 }}>
                <Container size="sm" px="md">
                    <Stack align="center" gap={28}>
                        <Box
                            style={{
                                transition: 'transform 0.5s ease',
                                '&:hover': { transform: 'scale(1.05)' },
                                backgroundColor: 'white',
                                padding: '20px',
                                borderRadius: '50%',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <img
                                src="/assets/logo.png"
                                alt="Lets Care All Logo"
                                style={{
                                    height: 96,
                                    width: 'auto'
                                }}
                            />
                        </Box>

                        <Stack align="center" gap={12}>
                            <Title
                                order={1}
                                ta="center"
                                size={48}
                                fw={900}
                                style={{
                                    letterSpacing: '-2px',
                                    lineHeight: 1,
                                    background: 'linear-gradient(135deg, #139639 0%, #267FBA 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    paddingBottom: '8px'
                                }}
                            >
                                Lets Care All
                            </Title>
                            <Text size="md" c="#139639" ta="center" fw={800} tt="uppercase" opacity={0.7} style={{ letterSpacing: '3px' }}>
                                Education Management Portal
                            </Text>
                            <Text size="md" c="dimmed" ta="center" fw={600} maw={500} mt="md">
                                Empowering health professionals with a seamless, compassionate, and efficient digital care management experience.
                            </Text>
                        </Stack>

                        <Stack gap="md" w="100%" maw={400} px="md">
                            <Button
                                component={Link}
                                to="/login"
                                size="md"
                                radius="xl"
                                fullWidth
                                style={{
                                    height: 52,
                                    background: 'linear-gradient(135deg, #139639 0%, #267FBA 100%)',
                                    boxShadow: '0 10px 25px rgba(19, 150, 57, 0.3)',
                                    fontSize: '16px',
                                    fontWeight: 900
                                }}
                            >
                                Enter Portal
                            </Button>

                        </Stack>
                    </Stack>
                </Container>
            </Center>

            <Box p={16} ta="center" style={{ zIndex: 1 }}>
                <Group justify="center" gap={10} wrap="wrap">
                    <Text size="xs" c="#139639" fw={800} opacity={0.6} style={{ letterSpacing: '2px' }}>
                        © {new Date().getFullYear()} INSPIRE LONDON COLLEGE • LEARNING SYSTEMS
                    </Text>
                    <Group gap={4}>
                        <Text size="xs" c="#139639" fw={700} opacity={0.7}>Developer</Text>
                        <Anchor
                            href="https://pk.linkedin.com/in/syeda-atiqa-kanwal-838490390?trk=people-guest_people_search-card"
                            target="_blank"
                            c="#139639"
                            style={{ display: 'inline-flex', alignItems: 'center' }}
                            aria-label="LinkedIn profile"
                        >
                            <Box
                                style={{
                                    width: 16,
                                    height: 16,
                                    backgroundColor: '#0A66C2',
                                    borderRadius: 3,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    lineHeight: 1
                                }}
                            >
                                <Text size="xs" fw={900} c="white" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 9 }}>
                                    in
                                </Text>
                            </Box>
                        </Anchor>
                    </Group>
                </Group>
            </Box>
        </Box>
    );
};
