export interface Course {
    title: string;
    month: number;
    provider: string;
    duration: string;
    categories: ('mandatory' | 'additional' | 'specialist' | 'other')[];
    subModules?: string[]; // New property for sub-courses
}

export const allCourses: Course[] = [
    // --- MANDATORY COURSES (Month 1-12) ---
    { title: 'Certificate in Record Management & Reporting in Care Setting', month: 1, provider: 'Lets Care All Internal', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Certificate in Communication in Care Settings', month: 1, provider: 'Lets Care All Internal', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Certificate in Consent', month: 1, provider: 'Lets Care All Internal', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Certificate in Care Plan & Person-Centred Care', month: 1, provider: 'Lets Care All Internal', duration: '2 hours', categories: ['mandatory'] },
    { title: 'Certificate in Privacy & Dignity', month: 1, provider: 'Lets Care All Internal', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Certificate in Understanding Challenging Behaviour', month: 1, provider: 'Lets Care All Internal', duration: '2 hours', categories: ['mandatory'] },
    { title: 'Certificate in Workplace Health & Safety During Pandemics', month: 1, provider: 'Lets Care All Internal', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Certificate in Prevention and Control of Infection (IPC)', month: 1, provider: 'Lets Care All Internal', duration: '2 hours', categories: ['mandatory'] },
    { title: 'Certificate in GDPR / Data Protection', month: 1, provider: 'Internal', duration: '2 hours', categories: ['mandatory'] },
    { title: 'Certificate in Dementia', month: 1, provider: 'Lets Care All Internal', duration: '2 hours', categories: ['mandatory'] },
    { title: 'Certificate in Autism', month: 1, provider: 'Lets Care All Internal', duration: '2 hours', categories: ['mandatory'] },
    { title: 'Certificate in Moving and Handling People', month: 1, provider: 'Lets Care All Internal', duration: '3 hours', categories: ['mandatory'] },
    { title: 'Certificate in Safeguarding Adults', month: 1, provider: 'Internal', duration: '2 hours', categories: ['mandatory'] },
    { title: 'Certificate in Health and Safety in a Care Setting', month: 1, provider: 'Internal', duration: '2 hours', categories: ['mandatory'] },
    { title: 'Prevent Training and Competencies', month: 2, provider: 'HM Government', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Tier 1 of the Oliver McGowan Mandatory Training on Learning Disability and Autism', month: 2, provider: 'External', duration: '1.5 hours', categories: ['mandatory'] },
    { title: 'Certificate in Medication Management in Health and Social Care', month: 3, provider: 'Lets Care All Internal', duration: '3 hours', categories: ['mandatory'] },
    { title: 'Accident, Incident and Near Miss', month: 3, provider: 'Internal', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Certificate in Nutrition / Fluids & Hydration', month: 4, provider: 'Internal', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Certificate in Learning Disability Awareness', month: 4, provider: 'Internal', duration: '2 hours', categories: ['mandatory'] },
    { title: 'Certificate in Stress Management', month: 5, provider: 'Internal', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Certificate in Catheter Care', month: 6, provider: 'Specialist', duration: '2 hours', categories: ['mandatory'] },
    { title: 'Certificate in Anti-Bullying & Anti-Harassment', month: 7, provider: 'Internal', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Certificate in Food Hygiene & Safety', month: 7, provider: 'Internal', duration: '2 hours', categories: ['mandatory'] },
    { title: 'Choking Awareness Training', month: 8, provider: 'Internal', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Certificate in Basic Life Support / Emergency First Aid', month: 8, provider: 'External', duration: '4 hours', categories: ['mandatory'] },
    { title: 'Certificate in End of Life Care', month: 9, provider: 'Specialist', duration: '2 hours', categories: ['mandatory'] },
    { title: 'Certificate in COSHH (Control of Substances Hazardous to Health)', month: 9, provider: 'Internal', duration: '1.5 hours', categories: ['mandatory'] },
    { title: 'Certificate in Depression', month: 9, provider: 'Internal', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Level 3 Food Hygiene', month: 9, provider: 'External', duration: '3 hours', categories: ['mandatory'] },
    { title: 'Certificate in Confidentiality', month: 10, provider: 'Internal', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Certificate in Lone Working Training', month: 10, provider: 'Internal', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Certificate in Falls Awareness', month: 11, provider: 'Internal', duration: '1.5 hours', categories: ['mandatory'] },
    { title: 'Certificate in Bullying and Harassment', month: 11, provider: 'Internal', duration: '1 hour', categories: ['mandatory'] },
    { title: 'Certificate in MCA / DoLS / LPS', month: 11, provider: 'External', duration: '2 hours', categories: ['mandatory'] },
    { title: 'Certificate in Cyber Security & Data Protection', month: 12, provider: 'Internal', duration: '1.5 hours', categories: ['mandatory'] },
    { title: 'Certificate in Fire Safety Awareness', month: 12, provider: 'Internal', duration: '1.5 hours', categories: ['mandatory'] },
    { title: 'Certificate in Equality, Diversity and Inclusion in Care Settings', month: 12, provider: 'Internal', duration: '1.5 hours', categories: ['mandatory'] },

    // --- ADDITIONAL & SPECIALIST COURSES ---
    { title: 'Diabetes Awareness', month: 3, provider: 'Inspire London College', duration: '2 hours', categories: ['additional', 'specialist'] },
    { title: 'Dysphagia Care', month: 4, provider: 'Inspire London College', duration: '2 hours', categories: ['additional', 'specialist'] },
    { title: 'Pressure Area Care', month: 4, provider: 'Inspire London College', duration: '2 hours', categories: ['additional', 'specialist'] },
    { title: 'Preventing Cyber Threats & Incident Reporting', month: 4, provider: 'Inspire London College/LCA In-house', duration: '2 hours', categories: ['additional', 'specialist'] },
    { title: 'Stoma Care & Stoma Bag Management Training', month: 5, provider: 'Inspire London College/LCA In-house', duration: '3 hours', categories: ['additional', 'specialist'] },
    { title: 'Epilepsy Awareness', month: 5, provider: 'Inspire London College/LCA In-house', duration: '2 hours', categories: ['additional', 'specialist'] },
    { title: 'Choking Awareness Training (Additional)', month: 5, provider: 'Inspire London College/LCA In-house', duration: '1 hour', categories: ['additional', 'specialist'] },
    { title: 'Hoarding Awareness Training', month: 6, provider: 'Inspire London College/LCA In-house', duration: '2 hours', categories: ['additional', 'specialist'] },
    { title: 'Understanding Loss and Bereavement', month: 6, provider: 'Inspire London College/LCA In-house', duration: '2 hours', categories: ['additional', 'specialist'] },
    { title: 'Prevent Training and Competencies (Refresher)', month: 7, provider: 'Inspire London College/LCA In-house', duration: '1 hour', categories: ['additional', 'specialist'] },
    { title: 'Sensory Impairment Awareness', month: 7, provider: 'Inspire London College/LCA In-house', duration: '2 hours', categories: ['additional', 'specialist'] },
    { title: 'Augmentative and Alternative Communication (AAC) Systems Training', month: 8, provider: 'Inspire London College/LCA In-house', duration: '3 hours', categories: ['additional', 'specialist'] },
    { title: 'Skin Integrity Awareness', month: 8, provider: 'Inspire London College/LCA In-house', duration: '2 hours', categories: ['additional', 'specialist'] },
    { title: 'Tier 2 of the Oliver McGowan Mandatory Training on Learning Disability and Autism + Refresher', month: 8, provider: 'Inspire London College & Lets Care All', duration: '4 hours', categories: ['additional', 'specialist'] },

    // --- OTHER COURSES (CATEGORIES) ---
    {
        title: 'Children Courses',
        month: 0,
        provider: 'Course Category',
        duration: '15 Modules',
        categories: ['other'],
        subModules: [
            'Certificate in Safeguarding Children',
            'Paediatric First Aid',
            'Certificate in Child Protection - Level 1',
            'Certificate in Support service users with specific communication needs of Children',
            'Certificate in Understanding & Responding to Challenging Behaviour in Children',
            'Children and Young People\'s Mental Health Training',
            'Certificate in Child Protection - Level 2',
            'Understanding Individual Needs – Specialist Care for Autistic Children',
            'Managing Distress and Challenging Behaviour including De-escalation Techniques',
            'Structured Activities and Engagement',
            'Positive Behaviour Support (PBS) Principles',
            'Safeguarding and Professional Boundaries',
            'Travel and Community Access',
            'Reflective Practice and Feedback',
            'Child Protection (Level 3) for Healthcare Workers'
        ]
    },
    {
        title: 'Field Supervisor Training',
        month: 0,
        provider: 'Course Category',
        duration: '13 Modules',
        categories: ['other'],
        subModules: [
            'Certificate in Collaborative Team Building',
            'Leadership and Management',
            'Professional Report Writing & Record Keeping',
            'Certificate in Confident and Ethical Decision-Making',
            'Effective Spot Checks & Observational Assessment',
            'Essential Communication & Workplace Skills',
            'Safeguarding Adults and Children',
            'Certificate in Conflict Resolution and Management',
            'Critical Thinking & Problem-Solving Skills',
            'Level 3 Certificate for Team Leaders',
            'Level 3 Diploma in Leadership for Team Leaders and Supervisors',
            'Accredited Moving & Handling Assessor Training',
            'Advanced Leadership & Strategic Management Skills'
        ]
    },
    {
        title: 'Floating support training',
        month: 0,
        provider: 'Course Category',
        duration: '15 Modules',
        categories: ['other'],
        subModules: [
            'Communication & Assessment Skills',
            'Personal Safety & Safeguarding',
            'Housing & Accommodation Support',
            'Understanding of Prevent and Anti-Radicalisation Duties - Training',
            'Substance Misuse Awareness',
            'Community Engagement & Social Inclusion',
            'Information & Digital Access',
            'Bereavement & Loss Support',
            'Confidence Building & Independent Living Skills',
            'Recovery & Reablement Support',
            'Supporting Access to Education & Training',
            'Practical Home Support & Assistive Technology',
            'Accessing Sport, Leisure & Social Facilities',
            'Financial Literacy & Budgeting',
            'Employment & Volunteering Support'
        ]
    },
    {
        title: 'Assessor Courses',
        month: 0,
        provider: 'Course Category',
        duration: 'TBD',
        categories: ['other'],
        subModules: []
    },
];
