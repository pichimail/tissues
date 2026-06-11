import { put } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'Missing file upload' }, { status: 400 });
    }

    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    return Response.json(blob);
  } catch (error) {
    console.error('Blob upload failed:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to upload image';
    return Response.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
