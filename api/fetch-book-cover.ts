import type { VercelRequest, VercelResponse } from '@vercel/node';

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1000) return null;
    return buffer;
  } catch {
    return null;
  }
}

async function fetchBookCover(isbn: string): Promise<{ coverUrl: string; title: string | null }> {
  let title: string | null = null;
  let coverUrl: string | null = null;
  let imageBuffer: Buffer | null = null;

  // 1. Try Google Books API (primary source)
  const googleRes = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
  ).catch(() => null);

  if (googleRes?.ok) {
    const googleData = (await googleRes.json()) as any;
    const volume = googleData.items?.[0]?.volumeInfo;
    if (volume) {
      title = volume.title || null;
      const thumbnail = volume.imageLinks?.thumbnail;
      if (thumbnail) {
        const hiRes = thumbnail
          .replace("zoom=1", "zoom=3")
          .replace("&edge=curl", "")
          .replace("http://", "https://");
        imageBuffer = await fetchImageBuffer(hiRes);
        if (imageBuffer) {
          coverUrl = hiRes;
        } else {
          const medRes = thumbnail
            .replace("&edge=curl", "")
            .replace("http://", "https://");
          imageBuffer = await fetchImageBuffer(medRes);
          if (imageBuffer) {
            coverUrl = medRes;
          }
        }
      }
    }
  }

  // 2. Try Penguin Random House CDN (fallback)
  if (!coverUrl) {
    for (const host of ["images2", "images1", "images3"]) {
      const prhUrl = `https://${host}.penguinrandomhouse.com/cover/700jpg/${isbn}`;
      imageBuffer = await fetchImageBuffer(prhUrl);
      if (imageBuffer) {
        coverUrl = prhUrl;
        break;
      }
    }
  }

  // 3. Try Google Books Direct URL (fallback)
  if (!coverUrl) {
    const directGoogleUrl = `https://books.google.com/books/content?vid=ISBN${isbn}&printsec=frontcover&img=1&zoom=3`;
    imageBuffer = await fetchImageBuffer(directGoogleUrl);
    if (imageBuffer) {
      coverUrl = directGoogleUrl;
    }
  }

  // 4. Try Open Library API (fallback)
  if (!coverUrl) {
    try {
      const olRes = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
      if (olRes.ok) {
        const olData = (await olRes.json()) as any;
        if (!title) title = olData.title || null;
        const coverId = olData.covers?.[0];
        if (coverId) {
          const olCoverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
          imageBuffer = await fetchImageBuffer(olCoverUrl);
          if (imageBuffer) {
            coverUrl = olCoverUrl;
          }
        }
      }
    } catch (err) {
      console.error(`Error fetching cover from Open Library for ISBN ${isbn}:`, err);
    }
  }

  // 5. Try Open Library direct ISBN lookup (final fallback)
  if (!coverUrl) {
    const olCoverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    imageBuffer = await fetchImageBuffer(olCoverUrl);
    if (imageBuffer) {
      coverUrl = olCoverUrl;
    }
  }

  // Last attempt to get title if we still don't have it
  if (!title) {
    try {
      const olRes = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
      if (olRes.ok) {
        const olData = (await olRes.json()) as any;
        title = olData.title || null;
      }
    } catch (err) {
      console.error(`Error fetching title from Open Library for ISBN ${isbn}:`, err);
    }
  }

  if (!coverUrl || !imageBuffer) {
    throw new Error(`No cover image found for ISBN ${isbn}`);
  }

  return { coverUrl, title };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { isbn } = req.body;

    if (!isbn || typeof isbn !== 'string') {
      return res.status(400).json({ message: 'ISBN is required' });
    }

    const cleanIsbn = isbn.replace(/[-\s]/g, '').trim();

    if (cleanIsbn.length !== 10 && cleanIsbn.length !== 13) {
      return res.status(400).json({ message: 'Invalid ISBN format. Must be 10 or 13 digits.' });
    }

    const result = await fetchBookCover(cleanIsbn);

    return res.status(200).json({
      isbn: cleanIsbn,
      coverUrl: result.coverUrl,
      title: result.title
    });
  } catch (error: any) {
    console.error('Book cover fetch error:', error);
    return res.status(500).json({ message: error.message || 'Failed to fetch book cover' });
  }
}
