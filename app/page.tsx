/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';
import { PhotoIcon, XCircleIcon } from '@heroicons/react/20/solid';
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
import { stripFences } from '@/lib/code-utils';

const DEFAULT_MODEL = 'Qwen/Qwen3.6-Plus';
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

type WorkspaceSnapshot = {
  imageUrl?: string;
  generatedCode?: string;
  shadcn?: boolean;
  thinkingText?: string;
  model?: string;
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
      Boolean(snapshot.model && snapshot.model !== DEFAULT_MODEL);

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
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  let [status, setStatus] = useState<
    'initial' | 'uploading' | 'uploaded' | 'creating' | 'created'
  >('initial');
  const [generatedCode, setGeneratedCode] = useState('');
  const [shadcn, setShadcn] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [buildingMessage, setBuildingMessage] = useState(
    'Building your app...'
  );
  const [error, setError] = useState<string | null>(null);
  const [thinkingText, setThinkingText] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const thinkingRef = useRef<HTMLDivElement>(null);
  const codeBufferRef = useRef('');

  let loading = status === 'creating';

  useEffect(() => {
    const snapshot = loadWorkspace();
    if (snapshot) {
      setImageUrl(snapshot.imageUrl);
      setGeneratedCode(snapshot.generatedCode ?? '');
      setShadcn(snapshot.shadcn ?? false);
      setThinkingText(snapshot.thinkingText ?? '');
      setModel(snapshot.model ?? DEFAULT_MODEL);
      setStatus(snapshot.generatedCode ? 'created' : snapshot.imageUrl ? 'uploaded' : 'initial');
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    saveWorkspace({
      imageUrl: imageUrl || undefined,
      generatedCode: generatedCode || undefined,
      shadcn,
      thinkingText: thinkingText || undefined,
      model: model || undefined,
    });
  }, [generatedCode, hydrated, imageUrl, model, shadcn, thinkingText]);

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

  const handleFileChange = async (file: File) => {
    setStatus('uploading');
    setThinkingText('');
    setGeneratedCode('');
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

  async function createApp() {
    setStatus('creating');
    setGeneratedCode('');
    setError(null);
    setThinkingText('');
    setBuildingMessage('Building your app...');

    try {
      let res = await fetch('/api/generateCode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          shadcn,
          imageUrl,
        }),
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
      let flushInterval = setInterval(() => {
        if (codeBufferRef.current) {
          setGeneratedCode((prev) => prev + codeBufferRef.current);
          codeBufferRef.current = '';
        }
      }, 250);

      for await (let chunk of readStream(res.body)) {
        if (chunk.includes('__THINKING__')) {
          setBuildingMessage('Thinking...');
          chunk = chunk.replace('__THINKING__', '');
          if (!chunk) continue;
        }
        if (chunk.includes('__DONE_THINKING__')) {
          setBuildingMessage('Building your app...');
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
      if (codeBufferRef.current) {
        setGeneratedCode((prev) => prev + codeBufferRef.current);
        codeBufferRef.current = '';
      }

      setGeneratedCode((prev) => stripFences(prev));
      setStatus('created');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setStatus('uploaded');
    }
  }

  async function handleSampleImage() {
    setStatus('uploading');
    setThinkingText('');
    setGeneratedCode('');
    setError(null);

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

  return (
    <div className='flex justify-center mt-3 md:mt-5 mx-3 md:mx-10 gap-3 md:gap-5 flex-col md:flex-row grow'>
      {status === 'initial' ||
      status === 'uploading' ||
      status === 'uploaded' ? (
        <div className='flex-1 w-full flex-col flex justify-center items-center text-center mx-auto'>
          <div className='max-w-xl text-center'>
            <img src='/hero-3.svg' alt='Hero' className='mx-auto mb-4 md:mb-6 w-4/5 md:w-auto' />
            <h1 className='text-3xl md:text-4xl font-bold text-balance tracking-tight'>
              Turn your wireframe into an app
            </h1>
            <div className='max-w-md text-center mx-auto'>
              <p className='text-base md:text-lg text-gray-500 mt-3 md:mt-4 text-center'>
                Upload an image of your website design and we’ll build it for
                you with React + Tailwind.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className='relative flex-1 w-full h-[55vh] md:h-[80vh] overflow-x-hidden'>
          <div className='isolate h-full'>
            <CodeViewer code={generatedCode} showEditor />
          </div>

          {status === 'creating' && (
            <div className='absolute inset-x-0 bottom-0 top-1/2 flex flex-col items-center justify-center rounded-r border border-gray-400 bg-gradient-to-br from-gray-100 to-gray-300 md:inset-y-0 md:left-1/2 md:right-0 p-6'>
              <p className='animate-pulse text-xl font-bold'>
                {buildingMessage}
              </p>
            </div>
          )}
        </div>
      )}
      <div className='w-full md:max-w-xs gap-3 md:gap-4 flex flex-col mx-auto'>
        {imageUrl ? (
          <div className='relative mt-2'>
            <div className='rounded-xl overflow-hidden border border-gray-200'>
              <img
                alt='Screenshot'
                src={imageUrl}
                className='w-full max-h-40 md:max-h-56 object-contain bg-gray-100'
              />
            </div>
            <button
              className='absolute size-10 text-gray-900 bg-white hover:text-gray-500 rounded-full -top-3 z-10 -right-3 flex items-center justify-center'
              onClick={() => {
                clearWorkspace();
                setImageUrl(undefined);
                setStatus('initial');
                setGeneratedCode('');
                setThinkingText('');
                setShadcn(false);
                setError(null);
              }}
            >
              <XCircleIcon className="size-5" />
            </button>
          </div>
        ) : (
          <>
            <FileUploader
              handleChange={handleFileChange}
              name='file'
              label='Upload or drop an image here'
              types={['png', 'jpg', 'jpeg']}
              required={true}
              multiple={false}
              hoverTitle='Drop here'
            >
              <div className='mt-1 md:mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-4 py-6 md:px-6 md:py-10 cursor-pointer'>
                <div className='text-center'>
                  <PhotoIcon
                    className='mx-auto h-12 w-12 text-gray-300'
                    aria-hidden='true'
                  />
                  <div className='mt-4 flex text-sm leading-6 text-gray-600'>
                    <label
                      htmlFor='file-upload'
                      className='relative rounded-md bg-white font-semibold text-black focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-gray-700'
                    >
                      <div>Upload a screenshot</div>
                      <p className='font-normal text-gray-600 text-xs mt-1'>
                        or drag and drop
                      </p>
                    </label>
                  </div>
                </div>
              </div>
            </FileUploader>
            <div className='text-center'>
              <button
                className='font-medium text-blue-400 text-sm underline decoration-transparent hover:decoration-blue-200 decoration-2 underline-offset-4 transition hover:text-blue-500'
                onClick={handleSampleImage}
              >
                Need an example image? Try our control panel demo.
              </button>
            </div>
          </>
        )}

        {thinkingText && (
          <div
            ref={thinkingRef}
            className="rounded-lg border border-gray-200 bg-gray-50 p-2"
          >
            <div className="text-[10px] font-medium uppercase tracking-[0.5px] text-gray-500 mb-0.5">
              Vision model output
            </div>
            <div className="max-h-24 md:max-h-32 overflow-auto text-[10px] leading-snug font-mono text-gray-600 whitespace-pre-wrap">
              {thinkingText}
            </div>
          </div>
        )}

        <div className='flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2'>
          <label className='text-sm font-medium text-gray-600' htmlFor='model-select'>
            AI Model
          </label>
          <select
            id='model-select'
            value={model}
            disabled={status === 'creating' || status === 'uploading'}
            onChange={(event) => setModel(event.target.value)}
            className='max-w-[55%] rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm font-semibold text-gray-900 shadow-sm outline-none transition focus:border-gray-400 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className='-mt-2 text-[11px] leading-snug text-gray-500'>
          {MODEL_OPTIONS.find((option) => option.value === model)?.description}
        </div>

        <div className='flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2'>
          <span className='text-sm font-medium text-gray-600'>Use shadcn/ui</span>
          <button
            type="button"
            role="switch"
            aria-checked={shadcn}
            disabled={status === 'creating' || status === 'uploading'}
            onClick={() => {
              if (status !== 'creating' && status !== 'uploading') {
                setShadcn(!shadcn);
              }
            }}
            className={`relative inline-flex h-[22px] w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${shadcn ? 'bg-gray-900' : 'bg-gray-200'}`}
          >
            <span
              className={`pointer-events-none block h-[18px] w-[18px] rounded-full bg-white shadow ring-0 transition-transform ${shadcn ? 'translate-x-[14px]' : 'translate-x-0'}`}
            />
          </button>
        </div>

        <button
          type='button'
          className='rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50'
          disabled={status === 'creating' || status === 'uploading'}
          onClick={() => {
            clearWorkspace();
            setImageUrl(undefined);
            setGeneratedCode('');
            setThinkingText('');
            setError(null);
            setShadcn(false);
            setModel(DEFAULT_MODEL);
            setStatus('initial');
          }}
        >
          Reset local workspace
        </button>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ShimmerButton
                  className='shadow-2xl disabled:cursor-not-allowed w-full relative disabled:opacity-50'
                  onClick={createApp}
                  disabled={
                    status === 'initial' ||
                    status === 'uploading' ||
                    status === 'creating'
                  }
                >
                  <span
                    className={`${
                      loading ? 'opacity-0' : 'opacity-100'
                    } whitespace-pre-wrap text-center font-semibold leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 `}
                  >
                    {status === 'created' ? 'Regenerate' : 'Generate app'}
                  </span>

                  {loading && (
                    <span className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                      <LoadingDots color='#fff' style='medium' />
                    </span>
                  )}
                </ShimmerButton>
              </div>
            </TooltipTrigger>

            {status === 'initial' && (
              <TooltipContent>
                <p>Please upload an image first</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {error && (
          <p className='text-red-500 text-sm text-center'>{error}</p>
        )}

        {status === 'created' && generatedCode && (
          <button
            className='text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4 decoration-gray-300 hover:decoration-gray-500 transition'
            onClick={() => {
              let blob = new Blob([generatedCode], { type: 'text/plain' });
              let url = URL.createObjectURL(blob);
              let a = document.createElement('a');
              a.href = url;
              a.download = 'App.tsx';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download code
          </button>
        )}
      </div>
    </div>
  );
}
