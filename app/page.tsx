/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import { XIcon } from 'lucide-react';
import { PhotoIcon } from '@heroicons/react/20/solid';
import { FileUploader } from 'react-drag-drop-files';
import CodeViewer from '@/components/code-viewer';
import ShimmerButton from '@/components/ui/shimmerbutton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import LoadingDots from '@/components/loading-dots';
import { readStream } from '@/lib/utils';
import { prepareCodeForPreview } from '@/lib/code-utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { type Theme, THEME_LABELS, THEME_DESCRIPTIONS } from '@/lib/prompt';

const DEFAULT_MODEL = 'Qwen/Qwen3.6-Plus';
const DEFAULT_THEME: Theme = 'default';
const WORKSPACE_STORAGE_KEY = 'tissues.workspace.v1';

const MODEL_OPTIONS = [
  {
    value: 'Qwen/Qwen3.6-Plus',
    label: 'Qwen3.6-Plus',
    description: 'Best default for UI screenshots',
  },
  {
    value: 'Qwen/Qwen3.7-Max',
    label: 'Qwen3.7-Max',
    description: 'Higher-end reasoning and coding',
  },
  {
    value: 'moonshotai/Kimi-K2.6',
    label: 'Kimi K2.6',
    description: 'Vision-capable alternative',
  },
] as const;

const THEME_OPTIONS: { value: Theme; label: string; description: string }[] = [
  { value: 'default', label: THEME_LABELS.default, description: THEME_DESCRIPTIONS.default },
  { value: 'dark', label: THEME_LABELS.dark, description: THEME_DESCRIPTIONS.dark },
  { value: 'minimal', label: THEME_LABELS.minimal, description: THEME_DESCRIPTIONS.minimal },
  { value: 'vibrant', label: THEME_LABELS.vibrant, description: THEME_DESCRIPTIONS.vibrant },
  { value: 'corporate', label: THEME_LABELS.corporate, description: THEME_DESCRIPTIONS.corporate },
];

type Version = {
  id: number;
  code: string;
  editPrompt?: string;
};

type WorkspaceSnapshot = {
  imageUrl?: string;
  generatedCode?: string;
  shadcn?: boolean;
  thinkingText?: string;
  model?: string;
  theme?: Theme;
  versions?: Version[];
  selectedVersionId?: number | null;
};

function loadWorkspace(): WorkspaceSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkspaceSnapshot;
  } catch {
    return null;
  }
}

function saveWorkspace(snapshot: WorkspaceSnapshot) {
  if (typeof window === 'undefined') return;

  try {
    const hasContent =
      Boolean(snapshot.imageUrl) ||
      Boolean(snapshot.generatedCode) ||
      Boolean(snapshot.thinkingText) ||
      snapshot.shadcn === true ||
      Boolean(snapshot.model && snapshot.model !== DEFAULT_MODEL) ||
      Boolean(snapshot.theme && snapshot.theme !== DEFAULT_THEME) ||
      (snapshot.versions && snapshot.versions.length > 0);

    if (!hasContent) {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      return;
    }

    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota or storage access issues so the app still works.
  }
}

function clearWorkspace() {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch {
    // Ignore storage access issues.
  }
}

async function uploadImageFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/blob-upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = response.statusText || 'Upload failed';
    try {
      const errBody = await response.json();
      errorMsg = errBody?.error || errBody?.message || errorMsg;
    } catch {
      try {
        errorMsg = await response.text();
      } catch {}
    }
    throw new Error(errorMsg);
  }

  const blob = (await response.json()) as { url?: string };
  if (!blob.url) {
    throw new Error('Upload succeeded but no URL was returned');
  }

  return blob.url;
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target?.result as string);
    };
    reader.onerror = () => reject(new Error('Failed to read file locally'));
    reader.readAsDataURL(file);
  });
}

export default function UploadComponent() {
  const isMobile = useIsMobile();

  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  let [status, setStatus] = useState<
    'initial' | 'uploading' | 'uploaded' | 'creating' | 'created'
  >('initial');
  const [generatedCode, setGeneratedCode] = useState('');
  const [shadcn, setShadcn] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [buildingMessage, setBuildingMessage] = useState(
    'Building your app...'
  );
  const [error, setError] = useState<string | null>(null);
  const [thinkingText, setThinkingText] = useState('');
  const [hydrated, setHydrated] = useState(false);

  // Stable code for Sandpack preview. We only update this with complete,
  // post-cleaned code so the embedded sandbox never sees mid-stream partial
  // syntax (the source of the "invalid element type" + babel unterminated string errors).
  const [sandpackCode, setSandpackCode] = useState<string>('');

  // Version history
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);

  // Edit prompt (for refining after generation)
  const [editPromptText, setEditPromptText] = useState('');

  const thinkingRef = useRef<HTMLDivElement>(null);
  const codeBufferRef = useRef('');
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Permanently suppress noisy console spam from common browser extensions
  // (Guideflow WebGL canvas patcher, various "Auto Action"/context menu content scripts, etc.).
  // These are not produced by the app — they are content scripts injected into every page.
  // Filtering here makes the developer console usable while working on this project.
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') return;

    const NOISY = /(Guideflow|overrideWebGLContext|contentScript|Auto Action|Detach panel)/i;

    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    const shouldSuppress = (args: any[]) => {
      try {
        const joined = args.map(a => (typeof a === 'string' ? a : (a && a.message) || String(a))).join(' ');
        return NOISY.test(joined);
      } catch {
        return false;
      }
    };

    console.log = (...args: any[]) => { if (!shouldSuppress(args)) origLog(...args); };
    console.warn = (...args: any[]) => { if (!shouldSuppress(args)) origWarn(...args); };
    console.error = (...args: any[]) => { if (!shouldSuppress(args)) origError(...args); };

    // Also lightly filter uncaught errors reported to window for the same patterns
    const onError = (e: ErrorEvent) => {
      if (NOISY.test(e.message || '')) {
        e.stopImmediatePropagation?.();
      }
    };
    window.addEventListener('error', onError, true);

    return () => {
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
      window.removeEventListener('error', onError, true);
    };
  }, []);

  const loading = status === 'creating';

  useEffect(() => {
    const snapshot = loadWorkspace();
    if (snapshot) {
      setImageUrl(snapshot.imageUrl);
      setGeneratedCode(snapshot.generatedCode ?? '');
      setShadcn(snapshot.shadcn ?? false);
      setThinkingText(snapshot.thinkingText ?? '');
      setModel(snapshot.model ?? DEFAULT_MODEL);
      setTheme(snapshot.theme ?? DEFAULT_THEME);

      const loadedVersions = snapshot.versions ?? [];
      setVersions(loadedVersions);

      const loadedSelected = snapshot.selectedVersionId ?? null;
      setSelectedVersionId(loadedSelected);

      // If we have versions, prefer the selected or last one's code for display
      if (loadedVersions.length > 0) {
        const toShow = loadedVersions.find((v) => v.id === loadedSelected)?.code ??
          loadedVersions[loadedVersions.length - 1].code;
        setGeneratedCode(toShow);
        setSandpackCode(toShow);
      } else if (snapshot.generatedCode) {
        setSandpackCode(snapshot.generatedCode);
      }

      setStatus(
        loadedVersions.length > 0 || snapshot.generatedCode
          ? 'created'
          : snapshot.imageUrl
          ? 'uploaded'
          : 'initial'
      );
    }
    setHydrated(true);
  }, []);

  // Persist everything important
  useEffect(() => {
    if (!hydrated) return;

    saveWorkspace({
      imageUrl: imageUrl || undefined,
      generatedCode: generatedCode || undefined,
      shadcn,
      thinkingText: thinkingText || undefined,
      model: model || undefined,
      theme,
      versions,
      selectedVersionId,
    });
  }, [generatedCode, hydrated, imageUrl, model, shadcn, thinkingText, theme, versions, selectedVersionId]);

  useEffect(() => {
    let el = document.querySelector('.cm-scroller');
    if (el && loading) {
      let end = el.scrollHeight - el.clientHeight;
      el.scrollTo({ top: end });
    }
  }, [loading, generatedCode]);

  useEffect(() => {
    if (thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [thinkingText]);

  // Derived
  const currentVersion = versions.find((v) => v.id === selectedVersionId) ??
    (versions.length > 0 ? versions[versions.length - 1] : null);
  const displayedCode = generatedCode; // always the live / selected one
  const hasVersions = versions.length > 0;
  const isViewingHistory = selectedVersionId != null && selectedVersionId !== (versions[versions.length - 1]?.id ?? null);

  const handleFileChange = async (file: File) => {
    setStatus('uploading');
    setThinkingText('');
    setGeneratedCode('');
    setSandpackCode('');
    setError(null);

    try {
      const blobUrl = await uploadImageFile(file);
      setImageUrl(blobUrl);
      setStatus('uploaded');
    } catch (blobError) {
      if (process.env.NODE_ENV !== 'production') {
        try {
          const dataUrl = await fileToDataUrl(file);
          setImageUrl(dataUrl);
          setStatus('uploaded');
          setError(null);
          return;
        } catch (fallbackError) {
          setError(
            fallbackError instanceof Error
              ? fallbackError.message
              : 'Could not store the uploaded image locally'
          );
          setStatus('initial');
          return;
        }
      }

      setError(
        blobError instanceof Error
          ? blobError.message
          : 'Could not upload the image'
      );
      setStatus('initial');
    }
  };

  // Generalized generator supporting both initial generation and prompt-based edits
  async function generateApp(editInstruction?: string) {
    const isEdit = Boolean(editInstruction && editInstruction.trim().length > 0 && generatedCode.trim().length > 0);

    setStatus('creating');
    setError(null);
    setThinkingText('');
    setBuildingMessage(isEdit ? 'Applying your changes...' : 'Building your app...');

    // For edit, keep the current displayed code as base. For fresh, we will clear live preview.
    if (!isEdit) {
      setGeneratedCode('');
    }

    const baseCodeForEdit = isEdit ? generatedCode : undefined;

    try {
      const payload: any = {
        model,
        shadcn,
        imageUrl,
        theme,
      };
      if (isEdit) {
        payload.previousCode = baseCodeForEdit;
        payload.editPrompt = editInstruction!.trim();
      }

      let res = await fetch('/api/generateCode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorMsg = res.statusText || 'Request failed';
        try {
          const errBody = await res.json();
          errorMsg = errBody?.error || errBody?.message || errorMsg;
        } catch {
          try {
            errorMsg = await res.text();
          } catch {}
        }
        throw new Error(errorMsg);
      }
      if (!res.body) throw new Error('No response body');

      codeBufferRef.current = '';
      let streamedCode = '';

      const flushBufferedCode = () => {
        if (!codeBufferRef.current) return;
        streamedCode += codeBufferRef.current;
        codeBufferRef.current = '';
        setGeneratedCode(streamedCode);
      };

      let flushInterval = setInterval(() => {
        flushBufferedCode();
      }, 240);

      for await (let chunk of readStream(res.body)) {
        if (chunk.includes('__THINKING__')) {
          setBuildingMessage(isEdit ? 'Thinking about your edit...' : 'Thinking...');
          chunk = chunk.replace('__THINKING__', '');
          if (!chunk) continue;
        }
        if (chunk.includes('__DONE_THINKING__')) {
          setBuildingMessage(isEdit ? 'Applying your changes...' : 'Building your app...');
          chunk = chunk.replace('__DONE_THINKING__', '');
          if (!chunk) continue;
        }
        if (chunk.startsWith('__REASON__')) {
          setThinkingText((prev) => prev + chunk.slice('__REASON__'.length));
          continue;
        }
        codeBufferRef.current += chunk;
      }

      clearInterval(flushInterval);
      flushBufferedCode();

      // Use the full preparation pipeline (autoClose + string repair + last-item recovery)
      // so the sandbox almost never receives truncated objects / unterminated strings
      // that previously caused the "Element type is invalid" + babel worker crashes.
      let finalCode = prepareCodeForPreview(streamedCode);

      setGeneratedCode(finalCode);
      setSandpackCode(finalCode);
      setStatus('created');

      // Commit to version history
      const newVersion: Version = {
        id: Date.now(),
        code: finalCode,
        editPrompt: isEdit ? editInstruction!.trim() : undefined,
      };

      setVersions((prevVersions) => {
        // For fresh generation (regenerate / first), start fresh history
        const next = isEdit ? [...prevVersions, newVersion] : [newVersion];
        return next;
      });
      setSelectedVersionId(newVersion.id);

      // Clear edit input after successful edit
      if (isEdit) {
        setEditPromptText('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setStatus('uploaded');
    }
  }

  // Backwards compatible wrapper for the big Generate/Regenerate button
  async function createApp() {
    // Fresh generation from screenshot (ignores current code + versions)
    await generateApp();
  }

  // Dedicated edit entry point from the prompt box
  async function handleApplyEdit() {
    const instruction = editPromptText.trim();
    if (!instruction || !generatedCode.trim()) return;
    await generateApp(instruction);
  }

  async function handleSampleImage() {
    setStatus('uploading');
    setThinkingText('');
    setGeneratedCode('');
    setSandpackCode('');
    setError(null);
    setVersions([]);
    setSelectedVersionId(null);
    setEditPromptText('');
    setSandpackCode('');
    setTheme(DEFAULT_THEME);

    // Load the demo image from the local public folder and convert it to a
    // data URL so the browser keeps the complete testing flow self-contained.
    try {
      const demoUrl = '/control-panel-demo.png';
      const res = await fetch(demoUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageUrl(event.target?.result as string);
        setStatus('uploaded');
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not load the sample image'
      );
      setStatus('initial');
    }
  }

  // Helper to select a version (updates displayed code immediately)
  function selectVersion(versionId: number) {
    const v = versions.find((ver) => ver.id === versionId);
    if (v) {
      setSelectedVersionId(versionId);
      setGeneratedCode(v.code);
      setSandpackCode(v.code);
    }
  }

  // Apply edit from currently displayed code (supports forking from history)
  function onVersionEditFrom(versionId: number) {
    const v = versions.find((ver) => ver.id === versionId);
    if (v) {
      setSelectedVersionId(versionId);
      setGeneratedCode(v.code);
      setSandpackCode(v.code);
      // Focus the edit box
      setTimeout(() => editTextareaRef.current?.focus(), 60);
    }
  }

  return (
    <div className="flex justify-center mt-2 md:mt-4 mx-2 md:mx-6 gap-3 md:gap-4 flex-col md:flex-row grow">
      {/* MAIN PREVIEW / HERO AREA */}
      {status === 'initial' || status === 'uploading' || status === 'uploaded' ? (
        <div className="flex-1 w-full flex-col flex justify-center items-center text-center mx-auto py-8 md:py-10">
          <div className="max-w-xl text-center px-4">
            <img src="/hero-3.svg" alt="Hero" className="mx-auto mb-5 w-4/5 md:w-auto" />
            <h1 className="text-3xl md:text-4xl font-bold text-balance tracking-tight">
              Turn your wireframe into an app
            </h1>
            <div className="max-w-md text-center mx-auto">
              <p className="text-base md:text-lg text-gray-500 mt-3 md:mt-4 text-center">
                Upload a screenshot of your design and we&apos;ll build a working React + Tailwind app for you.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex-1 w-full min-h-[52vh] md:min-h-[72vh] md:h-[78vh] overflow-hidden rounded-xl border border-gray-200 bg-white flex flex-col">
          {/* Top bar: versions + actions (less clutter on mobile) */}
          {hasVersions && (
            <div className="flex items-center gap-2 border-b px-3 py-2 bg-gray-50/70 flex-wrap">
              <div className="text-[10px] font-medium uppercase tracking-widest text-gray-500 mr-1">Versions</div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1 min-w-0">
                {versions.map((v, idx) => {
                  const isActive = selectedVersionId === v.id;
                  const label = v.editPrompt ? v.editPrompt.slice(0, 26) + (v.editPrompt.length > 26 ? '…' : '') : 'Initial';
                  return (
                    <button
                      key={v.id}
                      onClick={() => selectVersion(v.id)}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition active:scale-[0.985] ${isActive ? 'bg-black text-white border-black' : 'bg-white hover:bg-gray-100 border-gray-200 text-gray-700'}`}
                    >
                      <Badge variant={isActive ? 'default' : 'outline'} className="px-1 py-0 text-[9px] h-4">v{idx + 1}</Badge>
                      <span className="truncate max-w-[108px]">{label}</span>
                    </button>
                  );
                })}
              </div>
              {isViewingHistory && (
                <div className="text-[10px] text-amber-600 font-medium whitespace-nowrap">Viewing history</div>
              )}
            </div>
          )}

          <div className="relative flex-1 isolate">
            {/* Use a stable sandpackCode (last successfully completed + cleaned output)
                while generating. This prevents the sandbox from ever seeing
                mid-object / mid-string partial TSX that caused the React "Element type is invalid"
                crashes and the babel-transpiler syntax errors in the console logs. */}
            <CodeViewer code={loading ? sandpackCode : displayedCode} showEditor />

            {status === 'creating' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
                <div className="text-center">
                  <div className="animate-pulse text-lg font-semibold text-gray-900 mb-2">{buildingMessage}</div>
                  <div className="text-xs text-gray-500">Streaming from vision model…</div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom bar for mobile/desktop actions */}
          {status === 'created' && generatedCode && (
            <div className="border-t px-3 py-2 flex items-center gap-2 bg-white flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const blob = new Blob([displayedCode], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'App.tsx';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download
              </Button>
              <div className="flex-1" />
              <span className="text-[11px] text-gray-400 hidden sm:inline">Edits create new versions automatically</span>
            </div>
          )}
        </div>
      )}

      {/* SIDEBAR — always clean, uses shadcn primitives. Nicer + less cluttered on mobile */}
      <div className="w-full md:w-80 lg:w-80 flex-shrink-0 flex flex-col gap-3 md:gap-3.5 mx-auto">
        {/* Screenshot */}
        {imageUrl ? (
          <div className="relative">
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">
              <img
                alt="Input screenshot"
                src={imageUrl}
                className="w-full max-h-[118px] md:max-h-[132px] object-contain bg-white"
              />
            </div>
            <button
              className="absolute -top-2 -right-2 size-8 rounded-full bg-white border shadow flex items-center justify-center text-gray-700 hover:text-red-600 active:bg-gray-50 transition"
              onClick={() => {
                clearWorkspace();
                setImageUrl(undefined);
                setStatus('initial');
                setGeneratedCode('');
                setSandpackCode('');
                setThinkingText('');
                setShadcn(false);
                setTheme(DEFAULT_THEME);
                setVersions([]);
                setSelectedVersionId(null);
                setEditPromptText('');
                setError(null);
              }}
              aria-label="Remove image and reset"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        ) : (
          <div>
            <FileUploader
              handleChange={handleFileChange}
              name="file"
              label="Upload or drop an image here"
              types={['png', 'jpg', 'jpeg']}
              required={true}
              multiple={false}
              hoverTitle="Drop here"
            >
              <div className="flex justify-center rounded-2xl border border-dashed border-gray-300 px-4 py-7 md:py-9 cursor-pointer bg-white active:bg-gray-50 transition">
                <div className="text-center">
                  <PhotoIcon className="mx-auto h-9 w-9 text-gray-300" aria-hidden="true" />
                  <div className="mt-3 text-sm font-medium text-gray-700">Upload a screenshot</div>
                  <p className="text-[11px] text-gray-500 mt-0.5">PNG or JPG • drag &amp; drop</p>
                </div>
              </div>
            </FileUploader>
            <div className="text-center mt-2">
              <button
                className="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2"
                onClick={handleSampleImage}
              >
                Use demo control panel image
              </button>
            </div>
          </div>
        )}

        {/* VISION MODEL OUTPUT — prominently in sidebar per request */}
        <div>
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.6px] text-gray-500">Vision model output</div>
            {thinkingText && <div className="text-[10px] text-gray-400">{thinkingText.length} chars</div>}
          </div>
          <div
            ref={thinkingRef}
            className="rounded-xl border bg-gray-50 p-2.5 text-[10px] leading-[1.35] font-mono text-gray-600 min-h-[54px] max-h-[92px] md:max-h-[106px] overflow-auto whitespace-pre-wrap shadow-inner"
          >
            {thinkingText ? thinkingText : 'The model’s step-by-step visual analysis will appear here after you generate.'}
          </div>
        </div>

        {/* CONTROLS — shadcn Select + Switch. Compact on mobile */}
        <div className="space-y-2.5 rounded-2xl border bg-white p-3 shadow-sm">
          {/* Theme */}
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1.5">Theme</div>
            <Select
              value={theme}
              onValueChange={(val) => setTheme(val as Theme)}
              disabled={status === 'creating' || status === 'uploading'}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Choose theme" />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="font-medium">{t.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">— {t.description.split(',')[0]}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-gray-500 mt-1 leading-snug">{THEME_DESCRIPTIONS[theme]}</p>
          </div>

          {/* Model */}
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1.5">AI Model</div>
            <Select
              value={model}
              onValueChange={setModel}
              disabled={status === 'creating' || status === 'uploading'}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="font-medium">{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-gray-500 mt-1">{MODEL_OPTIONS.find((m) => m.value === model)?.description}</p>
          </div>

          {/* shadcn/ui Toggle — using real shadcn Switch */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="text-sm font-medium text-gray-700">Use shadcn/ui</div>
              <div className="text-[10px] text-gray-500 -mt-px">Pre-styled components in output</div>
            </div>
            <Switch
              checked={shadcn}
              onCheckedChange={(checked) => {
                if (status !== 'creating' && status !== 'uploading') setShadcn(checked);
              }}
              disabled={status === 'creating' || status === 'uploading'}
            />
          </div>
        </div>

        {/* EDIT WITH PROMPT — only after first successful generation */}
        {status === 'created' && (
          <div className="rounded-2xl border bg-white p-3 shadow-sm space-y-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">Refine with a prompt</div>
              <Textarea
                ref={editTextareaRef}
                value={editPromptText}
                onChange={(e) => setEditPromptText(e.target.value)}
                disabled={loading}
                placeholder="e.g. Add a dark mode toggle in the header and make the cards use a softer shadow. Make the sidebar collapsible on mobile."
                className="min-h-[78px] text-sm resize-y"
              />
            </div>
            <Button
              onClick={handleApplyEdit}
              disabled={loading || !editPromptText.trim() || !generatedCode.trim()}
              className="w-full"
              size="sm"
            >
              {loading ? 'Applying…' : 'Apply edit → new version'}
            </Button>
            <p className="text-[10px] text-gray-500">Uses the currently visible version as base. Creates a new version in the list above.</p>
          </div>
        )}

        {/* VERSIONS LIST (detailed) — always visible in sidebar when present */}
        {hasVersions && (
          <div className="rounded-2xl border bg-white p-2.5 shadow-sm">
            <div className="flex items-center justify-between px-1 mb-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.6px] text-gray-500">History ({versions.length})</div>
              {isViewingHistory && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => selectVersion(versions[versions.length - 1].id)}>
                  Back to latest
                </Button>
              )}
            </div>
            <ScrollArea className="h-[92px] pr-1">
              <div className="space-y-1">
                {versions.map((v, idx) => {
                  const isActive = selectedVersionId === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => selectVersion(v.id)}
                      className={`group flex items-start justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer transition ${isActive ? 'border-black bg-black/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={isActive ? 'default' : 'secondary'} className="font-mono text-[10px] px-1 py-px h-4">v{idx + 1}</Badge>
                          <span className="font-medium text-gray-700 truncate">{v.editPrompt || 'Initial generation from screenshot'}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVersionEditFrom(v.id);
                        }}
                        className="opacity-60 group-hover:opacity-100 text-[10px] underline underline-offset-2 text-gray-500 hover:text-gray-900 whitespace-nowrap"
                      >
                        edit from here
                      </button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex flex-col gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <ShimmerButton
                    className="shadow-xl disabled:cursor-not-allowed w-full relative disabled:opacity-60 h-10"
                    onClick={createApp}
                    disabled={status === 'initial' || status === 'uploading' || status === 'creating'}
                  >
                    <span className={`${loading ? 'opacity-0' : 'opacity-100'} text-sm font-semibold tracking-[-0.2px] text-white`}>
                      {status === 'created' ? 'Regenerate from image' : 'Generate app'}
                    </span>
                    {loading && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <LoadingDots color="#fff" style="medium" />
                      </span>
                    )}
                  </ShimmerButton>
                </div>
              </TooltipTrigger>
              {status === 'initial' && <TooltipContent side="top">Upload a screenshot first</TooltipContent>}
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            size="sm"
            disabled={status === 'creating' || status === 'uploading'}
            onClick={() => {
              clearWorkspace();
              setImageUrl(undefined);
              setGeneratedCode('');
              setSandpackCode('');
              setThinkingText('');
              setError(null);
              setShadcn(false);
              setTheme(DEFAULT_THEME);
              setModel(DEFAULT_MODEL);
              setVersions([]);
              setSelectedVersionId(null);
              setEditPromptText('');
              setStatus('initial');
            }}
          >
            Reset everything
          </Button>

          {error && <p className="text-center text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
