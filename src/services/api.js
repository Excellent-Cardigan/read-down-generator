export async function extractColorsFromImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch('/api/extract-colors', {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to extract colors');
  }

  return res.json();
}

export async function fetchAIPrompts() {
  const res = await fetch('/api/ai-prompts');

  if (!res.ok) {
    throw new Error('Failed to load AI prompts');
  }

  return res.json();
}

export async function generateAIBackground(promptId, colors, engine = 'firefly') {
  const res = await fetch('/api/generate-background', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    },
    cache: 'no-store',
    body: JSON.stringify({
      promptId,
      colors,
      engine,
      timestamp: Date.now() // Force unique request
    })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to generate background');
  }

  return res.json();
}

export async function fetchBookByIsbn(isbn) {
  const res = await fetch('/api/fetch-book-cover', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isbn })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to fetch book cover');
  }

  return res.json();
}
