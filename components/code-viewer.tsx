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
  const sandboxCode = normalizeSandboxImports(code);
  const content = showEditor ? (
    <Sandpack
      options={{
        showNavigator: true,
        editorHeight: "80vh",
        showTabs: false,
        ...sharedOptions,
      }}
      files={{
        "App.tsx": sandboxCode || "// App will appear here after generation",
        ...sharedFiles,
      }}
      {...sharedProps}
    />
  ) : (
    <SandpackProvider
      files={{
        "App.tsx": sandboxCode || "export default function App() { return <div />; }",
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
