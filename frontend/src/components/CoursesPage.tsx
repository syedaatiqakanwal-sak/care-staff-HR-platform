import { Paper, Title, Text, Tabs, SimpleGrid, Badge, Group, ThemeIcon, Stack, Box, Select, Modal, List, Button, ActionIcon, TextInput, ScrollArea } from '@mantine/core';
import { Book, ShieldCheck, Star, Award, Calendar, Layers, Plus, Trash, Edit, X, Check, AlertTriangle } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { useDisclosure } from '@mantine/hooks';

// Interface matching backend entity
export interface Course {
    id: string; // Backend UUID
    title: string;
    month: number;
    provider: string;
    duration: string;
    categories: ('mandatory' | 'additional' | 'specialist' | 'other')[];
    subModules?: string[];
}

const CourseList = ({ category, selectedMonth, courses, onSelect, onEdit, onDelete, isAdmin }: any) => {
    // Filter by Month AND Category
    // explicit check: category must match.
    // If category is 'other' OR 'specialist', ignore month. Else, match month.
    const filteredCourses = courses.filter((c: Course) =>
        c.categories.includes(category) &&
        ((category === 'other' || category === 'specialist') ? true : c.month.toString() === selectedMonth)
    );

    if (filteredCourses.length === 0) {
        return <Text c="dimmed" ta="center" py="xl">No courses found for this criteria.</Text>;
    }

    return (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {filteredCourses.map((course: Course, i: number) => {
                const cardGradients = [
                    'linear-gradient(135deg, #139639 0%, #0e7a2d 100%)', // Blue
                    'linear-gradient(135deg, #267FBA 0%, #267FBA 100%)'  // Green
                ];
                const bgIdx = i % cardGradients.length;
                const bg = cardGradients[bgIdx];

                return (
                    <Paper key={course.id || i} p="sm" radius="xl" withBorder={false} style={{
                        transition: 'transform 0.2s',
                        cursor: 'pointer',
                        background: bg,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                        onClick={() => onSelect(course)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                        }}>
                        <Box style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />

                        <Group justify="space-between" mb="xs" wrap="nowrap" style={{ position: 'relative', zIndex: 1 }}>
                            <ThemeIcon variant="filled" color="rgba(255,255,255,0.2)" size="md" radius="md" style={{ backdropFilter: 'blur(4px)' }}>
                                <Book size={14} color="white" />
                            </ThemeIcon>
                            <Group gap={4}>
                                <Badge variant="filled" size="sm" radius="sm" style={{ background: 'rgba(0,0,0,0.2)', color: 'white', backdropFilter: 'blur(4px)' }}>{course.duration}</Badge>
                                {isAdmin && (
                                    <Group gap={2} onClick={(e) => e.stopPropagation()}>
                                        <ActionIcon variant="filled" color="rgba(0,0,0,0.3)" size="xs" onClick={() => onEdit(course)}>
                                            <Edit size={12} />
                                        </ActionIcon>
                                        <ActionIcon variant="filled" color="red" size="xs" onClick={() => onDelete(course)}>
                                            <Trash size={12} />
                                        </ActionIcon>
                                    </Group>
                                )}
                            </Group>
                        </Group>
                        <Title order={5} mb={2} size={18} fw={800} c="white">{course.title}</Title>
                        <Text size="xs" c="white" opacity={0.8} fw={600}>{course.provider}</Text>
                        {course.subModules && course.subModules.length > 0 && (
                            <Badge mt={4} size="xs" variant="filled" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                                {course.subModules.length} Modules Available
                            </Badge>
                        )}
                    </Paper>
                );
            })}
        </SimpleGrid>
    );
};

export const CoursesPage = () => {
    const [activeTab, setActiveTab] = useState<string | null>('mandatory');
    const [selectedMonth, setSelectedMonth] = useState<string | null>('1');
    const [opened, { open, close }] = useDisclosure(false);
    const [courseModalOpened, { open: openCourseModal, close: closeCourseModal }] = useDisclosure(false);

    // Delete Modal State
    const [deleteModalOpened, setDeleteModalOpened] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

    // Data State
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(false);

    // Sub-module Input State
    const [newSubModule, setNewSubModule] = useState('');

    const role = localStorage.getItem('role');
    const isAdmin = ['admin', 'manager', 'hr'].includes((role || '').toLowerCase());
    const canEdit = isAdmin && localStorage.getItem('readOnly') !== 'true';

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        month: 1,
        provider: 'Internal',
        duration: '1 hour',
        categories: [] as string[],
        subModules: [] as string[]
    });

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/courses', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCourses(data);
            }
        } catch (error) {
            console.error('Failed to fetch courses', error);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleEdit = (course: Course) => {
        setEditingCourse(course);
        setFormData({
            title: course.title,
            month: course.month,
            provider: course.provider,
            duration: course.duration,
            categories: course.categories,
            subModules: course.subModules || []
        });
        openCourseModal();
    };

    const handleCreate = () => {
        setEditingCourse(null);
        setFormData({
            title: '',
            month: 1,
            provider: 'Internal',
            duration: '1 hour',
            categories: ['mandatory'],
            subModules: []
        });
        openCourseModal();
    };

    // Open Custom Delete Modal
    const handleDeleteClick = (course: Course) => {
        setCourseToDelete(course);
        setDeleteModalOpened(true);
    };

    const confirmDelete = async () => {
        if (!courseToDelete) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/courses/${courseToDelete.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                notifications.show({ title: 'Success', message: 'Course deleted', color: '#267FBA' });
                fetchCourses();
            } else {
                notifications.show({ title: 'Error', message: 'Failed to delete course', color: 'red' });
            }
        } catch (error) {
            console.error(error);
            notifications.show({ title: 'Error', message: 'Network error', color: 'red' });
        } finally {
            setDeleteModalOpened(false);
            setCourseToDelete(null);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const isEdit = !!editingCourse;
            const url = isEdit ? `/api/v1/courses/${editingCourse.id}` : '/api/v1/courses';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                notifications.show({ title: 'Success', message: `Course ${isEdit ? 'updated' : 'added'} successfully`, color: '#267FBA' });
                closeCourseModal();
                fetchCourses();
            } else {
                notifications.show({ title: 'Error', message: 'Failed to save course', color: 'red' });
            }
        } catch (error) {
            console.error('Error saving course', error);
            notifications.show({ title: 'Error', message: 'Network error', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    // Sub-module handlers
    const handleAddSubModule = () => {
        if (!newSubModule.trim()) return;
        setFormData({
            ...formData,
            subModules: [...(formData.subModules || []), newSubModule.trim()]
        });
        setNewSubModule('');
    };

    const handleRemoveSubModule = (index: number) => {
        const updated = [...(formData.subModules || [])];
        updated.splice(index, 1);
        setFormData({ ...formData, subModules: updated });
    };

    const handleCourseSelect = (course: Course) => {
        if (course.subModules && course.subModules.length > 0) {
            setSelectedCourse(course);
            open();
        } else {
            // Just notify info
        }
    };

    const handleTabChange = (value: string | null) => {
        setActiveTab(value);
        if (value === 'mandatory') {
            setSelectedMonth('1');
        } else if (value === 'additional') {
            setSelectedMonth('3');
        } else if (value === 'specialist') {
            setSelectedMonth('3');
        } else if (value === 'other') {
            // No month filter
        }
    };

    return (
        <Stack gap="xl">
            <Group justify="space-between" align="center">
                <Box>
                    <Title order={2} size={32} fw={900} c="brandBlue.9">Learning & Development</Title>
                    <Text size="md" c="dimmed" fw={600}>Explore our curriculum of professional training courses.</Text>
                </Box>
                {canEdit && (
                    <Button leftSection={<Plus size={16} />} onClick={handleCreate} color="brandBlue">
                        Add Course
                    </Button>
                )}
            </Group>

            <Tabs variant="pills" radius="xl" value={activeTab} onChange={handleTabChange} styles={{
                tab: {
                    transition: 'all 0.3s ease',
                    fontWeight: 800,
                    padding: '12px 24px',
                },
                list: {
                    backgroundColor: 'white',
                    padding: '10px',
                    borderRadius: '40px',
                    border: '1px solid rgba(0,0,0,0.05)',
                    display: 'inline-flex',
                    gap: '8px'
                }
            }}>
                <Tabs.List mb="xl">
                    <Tabs.Tab value="mandatory" leftSection={<ShieldCheck size={16} />} color="red.6">Mandatory</Tabs.Tab>
                    <Tabs.Tab value="additional" leftSection={<Star size={16} />} color="brandBlue.6">Additional</Tabs.Tab>
                    <Tabs.Tab value="specialist" leftSection={<Award size={16} />} color="orange.6">Specialist</Tabs.Tab>
                    <Tabs.Tab value="other" leftSection={<Layers size={16} />} color="grape.6">Other Courses</Tabs.Tab>
                </Tabs.List>

                {/* Hide Month Filter for 'Other' AND 'Specialist' tab */}
                {activeTab !== 'other' && activeTab !== 'specialist' && (
                    <Group mb="lg">
                        <Calendar size={20} color="gray" />
                        <Select
                            value={selectedMonth}
                            onChange={setSelectedMonth}
                            data={Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: `Month ${i + 1}` }))}
                            label="Filter by Month of Joining"
                            placeholder="Select month"
                            allowDeselect={false}
                            w={250}
                        />
                    </Group>
                )}

                {['mandatory', 'additional', 'specialist', 'other'].map(cat => (
                    <Tabs.Panel key={cat} value={cat}>
                        <CourseList
                            category={cat}
                            selectedMonth={selectedMonth}
                            courses={courses}
                            onSelect={handleCourseSelect}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                            isAdmin={canEdit}
                        />
                    </Tabs.Panel>
                ))}
            </Tabs>

            {/* View Modules Modal */}
            <Modal opened={opened} onClose={close} title={<Title order={4}>{selectedCourse?.title}</Title>} centered size="lg" radius="lg">
                <Text c="dimmed" size="sm" mb="md">The following modules are included in this training program:</Text>
                <List spacing="sm" size="sm" center icon={
                    <ThemeIcon color="brandBlue.5" size={24} radius="xl">
                        <Book size={14} />
                    </ThemeIcon>
                }>
                    {selectedCourse?.subModules?.map((module, index) => (
                        <List.Item key={index}>
                            <Text fz="sm" fw={500}>{module}</Text>
                        </List.Item>
                    ))}
                </List>
                <Group justify="flex-end" mt="xl">
                    <Button onClick={close} variant="light">Close</Button>
                </Group>
            </Modal>

            {/* Create/Edit Course Modal */}
            <Modal opened={courseModalOpened} onClose={closeCourseModal} title={<Title order={4}>{editingCourse ? 'Edit Course' : 'Add New Course'}</Title>} centered size="lg">
                <Stack>
                    <TextInput
                        label="Course Title"
                        placeholder="e.g. Fire Safety"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                    />

                    <TextInput
                        label="Provider"
                        placeholder="e.g. Internal"
                        value={formData.provider}
                        onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    />

                    <Select
                        label="Category"
                        data={['mandatory', 'additional', 'specialist', 'other']}
                        value={formData.categories[0] || ''}
                        onChange={(val) => setFormData({ ...formData, categories: val ? [val] : [] })}
                        required
                    />

                    {/* Only show Month if category is NOT specialist */}
                    {!formData.categories.includes('specialist') && (
                        <Select
                            label="Month (Set to 0 for 'Other')"
                            data={[
                                ...Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: `Month ${i + 1}` })),
                                { value: '0', label: 'Separate / No Month' }
                            ]}
                            value={formData.month.toString()}
                            onChange={(val) => setFormData({ ...formData, month: parseInt(val || '1') })}
                        />
                    )}

                    <TextInput
                        label="Duration"
                        placeholder="e.g. 2 hours"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    />

                    {/* Sub-modules Section: Only visible if Category is 'other' */}
                    {formData.categories.includes('other') && (
                        <Box mt="sm">
                            <Text size="sm" fw={500} mb={4}>Sub-modules / Topics</Text>
                            <Group align="flex-end" mb="xs">
                                <TextInput
                                    placeholder="Enter sub-module name"
                                    style={{ flex: 1 }}
                                    value={newSubModule}
                                    onChange={(e) => setNewSubModule(e.currentTarget.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddSubModule();
                                        }
                                    }}
                                />
                                <Button onClick={handleAddSubModule} variant="light" color="brandBlue">
                                    Add
                                </Button>
                            </Group>

                            {formData.subModules && formData.subModules.length > 0 && (
                                <Paper withBorder p="xs" bg="gray.0">
                                    <ScrollArea h={150} offsetScrollbars>
                                        <Stack gap="xs">
                                            {formData.subModules.map((mod, index) => (
                                                <Group key={index} justify="space-between" bg="white" p="xs" style={{ borderRadius: 4 }}>
                                                    <Text size="sm">{mod}</Text>
                                                    <ActionIcon color="red" variant="subtle" onClick={() => handleRemoveSubModule(index)}>
                                                        <Trash size={14} />
                                                    </ActionIcon>
                                                </Group>
                                            ))}
                                        </Stack>
                                    </ScrollArea>
                                </Paper>
                            )}
                        </Box>
                    )}

                    <Button onClick={handleSubmit} loading={loading} color="brandBlue" fullWidth mt="md">
                        {editingCourse ? 'Update Course' : 'Create Course'}
                    </Button>
                </Stack>
            </Modal>

            {/* Custom Delete Confirmation Modal */}
            <Modal
                opened={deleteModalOpened}
                onClose={() => setDeleteModalOpened(false)}
                title={<Group><AlertTriangle color="red" size={20} /><Title order={4}>Delete Course</Title></Group>}
                centered
            >
                <Text size="sm">Are you sure you want to delete <b>"{courseToDelete?.title}"</b>?</Text>
                <Text size="xs" c="dimmed" mt={4}>This action cannot be undone.</Text>
                <Group justify="flex-end" mt="lg">
                    <Button variant="default" onClick={() => setDeleteModalOpened(false)}>Cancel</Button>
                    <Button color="red" onClick={confirmDelete}>Delete</Button>
                </Group>
            </Modal>
        </Stack>
    );
};
