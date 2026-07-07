export type Policy = {
  name: string; // sent to backend as policyName
  title: string;
  content: string;
};

export const POLICIES: Policy[] = [
  {
    name: 'Health & Safety Policy',
    title: 'Health & Safety Policy',
    content: `This is the Health & Safety Policy.\n\nPlease read carefully.\n\n- Follow all site safety instructions.\n- Report incidents immediately.\n- Use PPE where required.\n\n(Replace this content with your real policy text.)`,
  },
  {
    name: 'Safeguarding Policy',
    title: 'Safeguarding Policy',
    content: `This is the Safeguarding Policy.\n\n- Protect service users from harm.\n- Report concerns to your line manager.\n- Follow internal safeguarding procedures.\n\n(Replace this content with your real policy text.)`,
  },
];

