"use client";

import * as shadcnComponents from "@/lib/shadcn";
import { Sandpack } from "@codesandbox/sandpack-react";
import {
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react/unstyled";

import { aquaBlue } from "@codesandbox/sandpack-themes";
// import { githubLight } from "@codesandbox/sandpack-themes";

import dedent from "dedent";
import React from "react";
import { prepareCodeForPreview } from "@/lib/code-utils";
import "./code-viewer.css";

class PreviewErrorBoundary extends React.Component<
  { children: React.ReactNode; code: string },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Errors from bad generated App.tsx (syntax, invalid element, etc.) are expected in this tool.
    // Log at debug level only to avoid noisy user consoles.
    if (process.env.NODE_ENV !== "production") {
      console.debug("Sandpack preview error (from generated App.tsx):", error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: { children: React.ReactNode; code: string }) {
    // When parent supplies a new/different code, clear previous error so a
    // successful regeneration or version switch auto-recovers the preview.
    if (prevProps.code !== this.props.code) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center p-6 bg-white">
          <div className="max-w-md text-center">
            <div className="text-red-600 font-semibold mb-2">Preview failed to render</div>
            <p className="text-sm text-gray-600 mb-4">
              The generated code has a syntax error or produced an invalid React element.
              This can happen with partial streams or unusual model output.
            </p>
            <p className="text-xs text-gray-500">
              Use <span className="font-medium">Download</span> to inspect the code, or regenerate / refine with an edit prompt.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CodeViewer({
  code,
  showEditor = false,
}: {
  code: string;
  showEditor?: boolean;
}) {
  // Always run the strongest possible cleaning + repair before handing anything to Sandpack.
  // This is the primary permanent defense against the "Element type is invalid" + babel
  // truncation errors the user was seeing from streamed / partially generated App.tsx.
  const cleaned = prepareCodeForPreview(code || "");
  const sandboxCode = normalizeSandboxImports(cleaned);

  const appFileContent =
    sandboxCode || "export default function App() { return <div className='p-8 text-gray-500'>No preview available yet.</div>; }";

  const content = showEditor ? (
    <Sandpack
      options={{
        showNavigator: true,
        editorHeight: "80vh",
        showTabs: false,
        ...sharedOptions,
      }}
      files={{
        "/App.tsx": appFileContent,
        "/index.tsx": sandboxIndex,
        ...sharedFiles,
      }}
      {...sharedProps}
    />
  ) : (
    <SandpackProvider
      files={{
        "/App.tsx": appFileContent,
        "/index.tsx": sandboxIndex,
        ...sharedFiles,
      }}
      className="flex h-full w-full grow flex-col justify-center"
      options={{ ...sharedOptions }}
      {...sharedProps}
    >
      <SandpackPreview
        className="flex h-full w-full grow flex-col justify-center p-4 md:pt-16"
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
      />
    </SandpackProvider>
  );

  return <PreviewErrorBoundary code={code}>{content}</PreviewErrorBoundary>;
}

function normalizeSandboxImports(source: string) {
  return source
    .replace(/from\s+(['"])@\/([^'"]+)\1/g, 'from $1/$2$1')
    .replace(/import\s+(['"])@\/([^'"]+)\1/g, 'import $1/$2$1');
}

// This is the *real* entry point we control inside the Sandpack preview.
// By providing our own index.tsx we get to wrap the (potentially broken) generated
// App inside a boundary that lives in the *same* React instance as the preview.
// This catches "Element type is invalid", bad default exports, render-time crashes etc.
// inside the sandbox instead of letting them become loud uncaught errors +
// "Could not consume error" spam in the parent console.
const sandboxIndex = dedent`
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import App from './App';

  class SandboxErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: any }
  > {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false };
    }
    static getDerivedStateFromError(error: any) {
      return { hasError: true, error };
    }
    componentDidCatch(error: any, info: any) {
      // Keep noise low. The parent already has its own boundary + we only debug-log here.
      if (typeof window !== 'undefined' && (window as any).__SANDBOX_DEBUG__) {
        console.debug('[Sandpack inner boundary]', error, info);
      }
    }
    render() {
      if (this.state.hasError) {
        const msg = this.state.error?.message || String(this.state.error || 'Unknown error');
        return React.createElement(
          'div',
          {
            style: {
              padding: '24px',
              fontFamily: 'ui-monospace, monospace',
              fontSize: '13px',
              color: '#b91c1c',
              background: '#fef2f2',
              height: '100%',
              overflow: 'auto',
            },
          },
          React.createElement('div', { style: { fontWeight: 600, marginBottom: '8px' } }, 'Preview render error'),
          React.createElement('div', { style: { marginBottom: '12px', color: '#444' } },
            'The generated App.tsx could not be rendered (syntax error, invalid component export, or runtime failure).'),
          React.createElement('pre', { style: { whiteSpace: 'pre-wrap', background: '#fff', padding: '8px', borderRadius: '4px', color: '#111' } }, msg),
          React.createElement('div', { style: { marginTop: '12px', fontSize: '11px', color: '#666' } },
            'Fix the code in the editor, use Download, or regenerate with a more specific prompt.')
        );
      }
      return this.props.children;
    }
  }

  const rootEl = document.getElementById('root')!;
  const root = createRoot(rootEl);
  root.render(
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(SandboxErrorBoundary, null, React.createElement(App))
    )
  );
`;

const sharedProps = {
  template: "react-ts",
  theme: aquaBlue,
  customSetup: {
    dependencies: {
      "lucide-react": "latest",
      recharts: "2.9.0",
      "react-router-dom": "latest",
      "@radix-ui/react-accordion": "^1.2.0",
      "@radix-ui/react-alert-dialog": "^1.1.1",
      "@radix-ui/react-aspect-ratio": "^1.1.0",
      "@radix-ui/react-avatar": "^1.1.0",
      "@radix-ui/react-checkbox": "^1.1.1",
      "@radix-ui/react-collapsible": "^1.1.0",
      "@radix-ui/react-dialog": "^1.1.1",
      "@radix-ui/react-dropdown-menu": "^2.1.1",
      "@radix-ui/react-hover-card": "^1.1.1",
      "@radix-ui/react-label": "^2.1.0",
      "@radix-ui/react-menubar": "^1.1.1",
      "@radix-ui/react-navigation-menu": "^1.2.0",
      "@radix-ui/react-popover": "^1.1.1",
      "@radix-ui/react-progress": "^1.1.0",
      "@radix-ui/react-radio-group": "^1.2.0",
      "@radix-ui/react-select": "^2.1.1",
      "@radix-ui/react-separator": "^1.1.0",
      "@radix-ui/react-slider": "^1.2.0",
      "@radix-ui/react-slot": "^1.1.0",
      "@radix-ui/react-switch": "^1.1.0",
      "@radix-ui/react-tabs": "^1.1.0",
      "@radix-ui/react-toast": "^1.2.1",
      "@radix-ui/react-toggle": "^1.1.0",
      "@radix-ui/react-toggle-group": "^1.1.0",
      "@radix-ui/react-tooltip": "^1.1.2",
      "class-variance-authority": "^0.7.0",
      clsx: "^2.1.1",
      "date-fns": "^3.6.0",
      "embla-carousel-react": "^8.1.8",
      "react-day-picker": "^8.10.1",
      "tailwind-merge": "^2.4.0",
      "tailwindcss-animate": "^1.0.7",
      vaul: "^0.9.1",
    },
  },
} as const;

const sharedOptions = {
  externalResources: [
    "https://unpkg.com/@tailwindcss/ui/dist/tailwind-ui.min.css",
  ],
};

const sharedFiles = {
  "/lib/utils.ts": shadcnComponents.utils,
  "/components/ui/accordion.tsx": shadcnComponents.accordian,
  "/components/ui/alert-dialog.tsx": shadcnComponents.alertDialog,
  "/components/ui/alert.tsx": shadcnComponents.alert,
  "/components/ui/avatar.tsx": shadcnComponents.avatar,
  "/components/ui/badge.tsx": shadcnComponents.badge,
  "/components/ui/breadcrumb.tsx": shadcnComponents.breadcrumb,
  "/components/ui/button.tsx": shadcnComponents.button,
  "/components/ui/calendar.tsx": shadcnComponents.calendar,
  "/components/ui/card.tsx": shadcnComponents.card,
  "/components/ui/carousel.tsx": shadcnComponents.carousel,
  "/components/ui/checkbox.tsx": shadcnComponents.checkbox,
  "/components/ui/collapsible.tsx": shadcnComponents.collapsible,
  "/components/ui/dialog.tsx": shadcnComponents.dialog,
  "/components/ui/drawer.tsx": shadcnComponents.drawer,
  "/components/ui/dropdown-menu.tsx": shadcnComponents.dropdownMenu,
  "/components/ui/input.tsx": shadcnComponents.input,
  "/components/ui/label.tsx": shadcnComponents.label,
  "/components/ui/menubar.tsx": shadcnComponents.menuBar,
  "/components/ui/navigation-menu.tsx": shadcnComponents.navigationMenu,
  "/components/ui/pagination.tsx": shadcnComponents.pagination,
  "/components/ui/popover.tsx": shadcnComponents.popover,
  "/components/ui/progress.tsx": shadcnComponents.progress,
  "/components/ui/radio-group.tsx": shadcnComponents.radioGroup,
  "/components/ui/select.tsx": shadcnComponents.select,
  "/components/ui/separator.tsx": shadcnComponents.separator,
  "/components/ui/skeleton.tsx": shadcnComponents.skeleton,
  "/components/ui/slider.tsx": shadcnComponents.slider,
  "/components/ui/switch.tsx": shadcnComponents.switchComponent,
  "/components/ui/table.tsx": shadcnComponents.table,
  "/components/ui/tabs.tsx": shadcnComponents.tabs,
  "/components/ui/textarea.tsx": shadcnComponents.textarea,
  "/components/ui/toast.tsx": shadcnComponents.toast,
  "/components/ui/toaster.tsx": shadcnComponents.toaster,
  "/components/ui/toggle-group.tsx": shadcnComponents.toggleGroup,
  "/components/ui/toggle.tsx": shadcnComponents.toggle,
  "/components/ui/tooltip.tsx": shadcnComponents.tooltip,
  "/components/ui/use-toast.tsx": shadcnComponents.useToast,
  "/public/index.html": dedent`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        <div id="root"></div>
      </body>
    </html>
  `,
};
