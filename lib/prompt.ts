import shadcnDocs from './shadcn-docs';
import dedent from 'dedent';

export type Theme = 'default' | 'dark' | 'minimal' | 'vibrant' | 'corporate';

export const THEME_LABELS: Record<Theme, string> = {
  default: 'Default',
  dark: 'Dark',
  minimal: 'Minimal',
  vibrant: 'Vibrant',
  corporate: 'Corporate',
};

export const THEME_DESCRIPTIONS: Record<Theme, string> = {
  default: 'Clean balanced design matching the screenshot closely',
  dark: 'Dark mode with high contrast, dark backgrounds and light text',
  minimal: 'Ultra clean, lots of whitespace, subtle borders, sans-serif focus',
  vibrant: 'Bold colors, rounded elements, energetic accents from screenshot palette',
  corporate: 'Professional blues/grays, structured layout, crisp typography',
};

const examples = [
  {
    input: `A landing page screenshot`,
    output: `
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-black mr-2"></div>
            <span className="font-bold text-xl">LOGO</span>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-gray-700 hover:text-gray-900">Features</a>
            <a href="#about" className="text-gray-700 hover:text-gray-900">About</a>
            <a href="#pricing" className="text-gray-700 hover:text-gray-900">Pricing</a>
          </nav>
          <Button variant="outline" className="rounded-full">Sign up</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block px-4 py-2 rounded-full bg-gray-200 text-sm text-gray-700 mb-6">
              Used by 100+ companies
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Welcome to your all-in-one AI tool
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Check out all the new features in the 13.2 update in the demo below
            </p>
            <Button className="rounded-full px-8 py-3 bg-black text-white hover:bg-gray-800">
              Get Started
            </Button>
          </div>
          <div className="bg-gray-300 aspect-video rounded-lg flex items-center justify-center">
            <span className="text-gray-600 text-2xl">IMAGE PLACEHOLDER</span>
          </div>
        </div>
      </main>
    </div>
  )
}
    `,
  },
  {
    input: `A clean settings / preferences screen screenshot with toggles and sections`,
    output: `
import { useState } from 'react'

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true)
  const [marketing, setMarketing] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Settings</h1>
        <p className="text-gray-500 mb-8">Manage your account preferences</p>

        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Email notifications</div>
                <div className="text-sm text-gray-500">Receive emails about your account activity.</div>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={\`relative inline-flex h-6 w-11 items-center rounded-full transition-colors \${notifications ? 'bg-black' : 'bg-gray-200'}\`}
              >
                <span className={\`inline-block h-5 w-5 transform rounded-full bg-white shadow transition \${notifications ? 'translate-x-6' : 'translate-x-1'}\`} />
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Marketing emails</div>
                <div className="text-sm text-gray-500">Receive product updates and offers.</div>
              </div>
              <button
                onClick={() => setMarketing(!marketing)}
                className={\`relative inline-flex h-6 w-11 items-center rounded-full transition-colors \${marketing ? 'bg-black' : 'bg-gray-200'}\`}
              >
                <span className={\`inline-block h-5 w-5 transform rounded-full bg-white shadow transition \${marketing ? 'translate-x-6' : 'translate-x-1'}\`} />
              </button>
            </div>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <div className="font-medium">Dark mode</div>
              <div className="text-sm text-gray-500">Use dark theme across the app.</div>
            </div>
            <div className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-500">Coming soon</div>
          </div>
        </div>

        <button className="mt-8 w-full rounded-lg bg-black py-3 text-white text-sm font-medium active:bg-gray-800">
          Save preferences
        </button>
      </div>
    </div>
  )
}
    `,
  },
  {
    input: `A dashboard screenshot with sidebar nav, top bar, stats cards, and a table`,
    output: `
import { useState } from 'react'
import { Button } from "@/components/ui/button"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects'>('overview')

  const stats = [
    { label: 'Total Users', value: '12,483', change: '+12%' },
    { label: 'Revenue', value: '$84.2k', change: '+8%' },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 border-r bg-white p-6 hidden md:block">
        <div className="font-semibold text-xl mb-8">Acme</div>
        <nav className="space-y-1 text-sm">
          <a className="block px-3 py-2 rounded-md bg-gray-100 font-medium">Overview</a>
          <a className="block px-3 py-2 rounded-md text-gray-600 hover:bg-gray-50">Projects</a>
          <a className="block px-3 py-2 rounded-md text-gray-600 hover:bg-gray-50">Team</a>
        </nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b bg-white px-6 flex items-center justify-between">
          <div className="font-semibold">Dashboard</div>
          <Button size="sm">New Project</Button>
        </header>
        <main className="p-6 space-y-6 overflow-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <div key={i} className="rounded-xl border bg-white p-5">
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className="mt-1 text-3xl font-semibold tracking-tighter">{s.value}</div>
                <div className="text-emerald-600 text-xs mt-1">{s.change} from last month</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-white">
            <div className="border-b px-5 py-3 flex gap-2">
              <button onClick={() => setActiveTab('overview')} className={\`px-3 py-1 text-sm rounded-md \${activeTab === 'overview' ? 'bg-black text-white' : 'hover:bg-gray-100'}\`}>Overview</button>
              <button onClick={() => setActiveTab('projects')} className={\`px-3 py-1 text-sm rounded-md \${activeTab === 'projects' ? 'bg-black text-white' : 'hover:bg-gray-100'}\`}>Projects</button>
            </div>
            <div className="p-5 text-sm text-gray-600">Content area matching the screenshot table and charts goes here. Fully interactive.</div>
          </div>
        </main>
      </div>
    </div>
  )
}
    `,
  },
];

export function getCodingPrompt(shadcn: boolean, theme: Theme = 'default') {
  const themeInstruction = getThemeInstruction(theme);

  let systemPrompt = `
You are an expert frontend React developer. You will be given a screenshot of a website from the user, and then you will return code for it using React and Tailwind CSS. Follow the instructions carefully, it is very important for my job. I will tip you $1 million if you do a good job:

- Think carefully step by step about how to recreate the UI described in the prompt. First use your vision capabilities to deeply analyze and note every detail in the screenshot (layout, exact text, colors, spacing, components).
- Create a React component for whatever the user asked you to create and make sure it can run by itself by using a default export
- Feel free to have multiple components in the file, but make sure to have one main component that uses all the other components
- Make sure the website looks exactly like the screenshot described in the prompt.
- Pay close attention to background color, text color, font size, font family, padding, margin, border, etc. Match the colors and sizes exactly.
- Make sure to code every part of the description including any headers, footers, etc.
- Use the exact text from the description for the UI elements.
- Do not add comments in the code such as "<!-- Add other navigation links as needed -->" and "<!-- ... other news items ... -->" in place of writing the full code. WRITE THE FULL CODE.
- Repeat elements as needed to match the description. For example, if there are 15 items, the code should have 15 items. DO NOT LEAVE comments like "<!-- Repeat for each news item -->" or bad things will happen.
- For all images, please use an svg with a white, gray, or black background and don't try to import them locally or from the internet.
- Make sure the React app is interactive and functional by creating state when needed and having no required props
- If you use any imports from React like useState or useEffect, make sure to import them directly
- Use TypeScript as the language for the React component
- Use Tailwind classes for styling. DO NOT USE ARBITRARY VALUES (e.g. \`h-[600px]\`). Make sure to use a consistent color palette.
- Use margin and padding to style the components and ensure the components are spaced out nicely. The app MUST be pleasant and responsive on mobile.
- Please ONLY return the full React code starting with the imports, nothing else. It's very important for my job that you only return the React code with imports. DO NOT START WITH \`\`\`typescript or \`\`\`javascript or \`\`\`tsx or \`\`\`.
- ONLY IF the user asks for a dashboard, graph or chart, the recharts library is available to be imported, e.g. \`import { LineChart, XAxis, ... } from "recharts"\` & \`<LineChart ...><XAxis dataKey="name"> ...\`. Please only use this when needed.
- If you need an icon, please create an SVG for it and use it in the code. DO NOT IMPORT AN ICON FROM A LIBRARY.
- Make the design look nice and don't have borders around the entire website even if that's described
- ${themeInstruction}
- IMPORTANT: Make sure your code is complete. Every opening brace must have a closing brace, every opening parenthesis must have a closing parenthesis. The code must end with the closing of the default export function. Double check that your JSX is properly closed.
  `;

  if (shadcn) {
    systemPrompt += `
    There are some prestyled components available for use. Please use your best judgement to use any of these components if the app calls for one.

    Here are the components that are available, along with how to import them, and how to use them:

    ${shadcnDocs
      .map(
        (component) => `
          <component>
          <name>
          ${component.name}
          </name>
          <import-instructions>
          ${component.importDocs}
          </import-instructions>
          <usage-instructions>
          ${component.usageDocs}
          </usage-instructions>
          </component>
        `
      )
      .join('\n')}
    `;
  }

  systemPrompt += `
    NO OTHER LIBRARIES (e.g. zod, hookform) ARE INSTALLED OR ABLE TO BE IMPORTED.
  `;

  systemPrompt += `
  Here are some examples of good outputs:


${examples
  .map(
    (example) => `
      <example>
      <input>
      ${example.input}
      </input>
      <output>
      ${example.output}
      </output>
      </example>
  `
  )
  .join('\n')}
  `;

  return dedent(systemPrompt);
}

function getThemeInstruction(theme: Theme): string {
  switch (theme) {
    case 'dark':
      return 'Apply a dark theme aesthetic: use near-black backgrounds (#0a0a0a or #111), light text (#f5f5f5), subtle borders in #333. High contrast, modern dark UI. Keep layout identical to screenshot but recolor accordingly.';
    case 'minimal':
      return 'Apply a minimal aesthetic: generous whitespace (use py-8 px-6 etc), very subtle gray borders, clean Helvetica-like typography, avoid heavy shadows or bright accents unless in screenshot. Focus on content hierarchy and breathing room.';
    case 'vibrant':
      return 'Apply a vibrant energetic aesthetic: use the dominant colors from the screenshot but amplify accent colors with slightly more saturated tones, add soft rounded corners (xl), lively hover states. Keep the exact layout, typography scale and structure from the screenshot.';
    case 'corporate':
      return 'Apply a corporate professional aesthetic: use slate/blue-gray palette (#0f172a, #1e2937, #64748b accents), tight structured spacing, strong typography hierarchy, subtle dividers. Make it look trustworthy and polished for business software.';
    case 'default':
    default:
      return 'Use a balanced clean aesthetic that closely follows the exact colors, spacing and style visible in the provided screenshot. Prioritize fidelity to the image.';
  }
}

export function getEditPrompt(
  shadcn: boolean,
  theme: Theme = 'default',
  previousCode: string,
  userEditRequest: string
) {
  const themeInstruction = getThemeInstruction(theme);

  let systemPrompt = `
You are an expert frontend React developer specializing in precise iterative edits.

You are given:
1. A screenshot of the ORIGINAL design the user wants to match.
2. The CURRENT React + Tailwind source code of the app.
3. A natural language EDIT REQUEST describing the desired change.

Your job:
- Make the smallest, cleanest change that fulfills the EDIT REQUEST.
- Preserve the exact visual appearance, layout, text, and components from the screenshot unless the edit request explicitly asks to change styling, colors, or structure.
- Keep the app fully functional and interactive. Update state, handlers, and structure as needed.
- The output MUST be a COMPLETE runnable single-file React TSX component (default export). Include ALL necessary imports.
- Do not explain anything outside the code. Output ONLY the full updated code starting with imports. No markdown fences.
- ${themeInstruction}
- Make sure the result remains mobile-friendly and pleasant.
- If the user asks for shadcn components and they are allowed, prefer them when it makes sense.
- IMPORTANT: The code must be syntactically complete. Match braces/parentheses perfectly.

CURRENT CODE (edit this):
\`\`\`tsx
${previousCode}
\`\`\`

EDIT REQUEST: "${userEditRequest}"
`;

  if (shadcn) {
    systemPrompt += `
Available shadcn/ui components (use only if helpful for the edit):
${shadcnDocs
  .map(
    (component) => `
<component>
<name>${component.name}</name>
<import-instructions>${component.importDocs}</import-instructions>
</component>`
  )
  .join('\n')}
`;
  }

  systemPrompt += `
NO OTHER LIBRARIES beyond what is already in the current code + recharts (for charts only) and lucide-react icons (create inline SVGs when possible).
Return ONLY the full updated TSX code.`;

  return dedent(systemPrompt);
}
