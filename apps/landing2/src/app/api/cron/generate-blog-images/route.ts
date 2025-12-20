import { NextResponse } from 'next/server';
import { BLOG_ARTICLES } from '@/lib/blog-data';
import { getPromptForArticle, PILLAR_PAGE_PROMPTS, ALL_IMAGE_PROMPTS } from '@/lib/blog-prompts';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);

// Configuration for Google Gemini (Nano Banana)
// Documentation: https://ai.google.dev/api/imagen (refer to Imagen as the underlying tech for image generation with Gemini)
const MODEL_NAME = 'gemini-3-pro-image-preview'; // Nano Banana Pro
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;
const API_KEY = process.env.NANO_BANANA_API_KEY; // Your Gemini API Key

// Pillar pages configuration
const PILLAR_PAGES = Object.keys(PILLAR_PAGE_PROMPTS).map((slug) => ({
  slug,
  type: 'pillar' as const,
  image: {
    src: `/img/pillar/${slug}.webp`,
  },
}));

export async function GET(request: Request) {
  try {
    // Basic authorization check
    const { searchParams } = new URL(request.url);
    if (process.env.NODE_ENV === 'production' && searchParams.get('key') !== process.env.CRON_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const forceUpdate = searchParams.get('force') === 'true';
    const limitParam = searchParams.get('limit');
    const typeParam = searchParams.get('type'); // 'blog', 'pillar', or 'all' (default)

    // Determine which pages to process
    const includeBlog = !typeParam || typeParam === 'all' || typeParam === 'blog';
    const includePillar = !typeParam || typeParam === 'all' || typeParam === 'pillar';

    // Build list of pages to process
    type PageItem = { slug: string; type: 'blog' | 'pillar'; image: { src: string } };
    const allPages: PageItem[] = [];

    if (includePillar) {
      allPages.push(...PILLAR_PAGES);
    }
    if (includeBlog) {
      allPages.push(
        ...BLOG_ARTICLES.map((a) => ({
          slug: a.slug,
          type: 'blog' as const,
          image: a.image,
        }))
      );
    }

    // Parse limit: 'all' or number
    const totalPages = allPages.length;
    let limit = limitParam === 'all' ? totalPages : parseInt(limitParam || '1', 10);
    if (isNaN(limit) || limit <= 0) limit = 1;
    limit = Math.min(limit, totalPages);

    const results: Array<{
      slug: string;
      type: string;
      status: string;
      path?: string;
      prompt?: string;
      note?: string;
      error?: string;
    }> = [];

    // Ensure directories exist
    const publicDir = path.join(process.cwd(), 'public');
    const blogImgDir = path.join(publicDir, 'img', 'blog');
    const pillarImgDir = path.join(publicDir, 'img', 'pillar');

    if (!fs.existsSync(blogImgDir)) {
      fs.mkdirSync(blogImgDir, { recursive: true });
    }
    if (!fs.existsSync(pillarImgDir)) {
      fs.mkdirSync(pillarImgDir, { recursive: true });
    }

    console.log(`[ImageGen] Starting pipeline. Limit: ${limit}. Total pages: ${allPages.length} (blog: ${includeBlog ? BLOG_ARTICLES.length : 0}, pillar: ${includePillar ? PILLAR_PAGES.length : 0})`);

    let processedCount = 0;

    for (const page of allPages) {
      if (processedCount >= limit) {
        break;
      }

      // Determine output directory based on page type
      const imgDir = page.type === 'pillar' ? pillarImgDir : blogImgDir;

      // Use image.src filename when available to stay in sync with frontend paths
      const srcFileName = page.image?.src ? path.basename(page.image.src) : '';
      const baseName = srcFileName ? srcFileName.replace(/\.[^/.]+$/, '') : page.slug;
      const extension = srcFileName ? path.extname(srcFileName) || '.webp' : '.webp';
      const fileName = `${baseName}${extension}`;
      const filePath = path.join(imgDir, fileName);
      const exists = fs.existsSync(filePath);

      if (exists && !forceUpdate) {
        console.log(`[ImageGen] Skipping existing image: ${fileName} (use force=true to regenerate)`);
        continue;
      }

      console.log(`[ImageGen] Processing (${processedCount + 1}/${limit}): [${page.type}] ${page.slug}`);

      // Get prompt - for pillar pages use direct lookup, for blog use article-based function
      let prompt: string;
      if (page.type === 'pillar') {
        prompt = PILLAR_PAGE_PROMPTS[page.slug] || `SEO landing page for ${page.slug}, professional, modern, 4k. Aspect Ratio 16:9`;
      } else {
        const article = BLOG_ARTICLES.find((a) => a.slug === page.slug);
        prompt = article ? getPromptForArticle(article) : `Blog image for ${page.slug}. Aspect Ratio 16:9`;
      }

      try {
        // MOCK / SAFETY CHECK
        if (!API_KEY) {
          console.warn(`[ImageGen] Missing API Key (NANO_BANANA_API_KEY). Switching to MOCK generation (placehold.co).`);

          // Generate a simple placeholder with text
          const mockTitle = page.slug.replace(/-/g, ' ');
          const text = encodeURIComponent(mockTitle.length > 40 ? `${mockTitle.slice(0, 37)}...` : mockTitle);
          const mockUrl = `https://placehold.co/1200x675/4f46e5/ffffff/webp?text=${text}`;

          const mockRes = await fetch(mockUrl);
          if (!mockRes.ok) throw new Error(`Failed to fetch mock image: ${mockRes.statusText}`);

          await streamPipeline(mockRes.body as any, fs.createWriteStream(filePath));

          results.push({
            slug: page.slug,
            type: page.type,
            status: 'generated_mock',
            path: filePath,
            prompt: prompt,
            note: 'Used placehold.co because API Key is missing',
          });
          processedCount++;
          continue;
        }

        console.log(`[ImageGen] Sending request to Google Gemini for: ${page.slug}`);

        // Prepare request for Google Gemini API
        const urlWithKey = `${GEMINI_API_URL}?key=${API_KEY}`;

        const response = await fetch(urlWithKey, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              // aspectRatio: "16:9" // Not supported by gemini-3-pro-image-preview
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[ImageGen] API Error: ${response.status} - ${errText}`);
          throw new Error(`Google API returned ${response.status}: ${errText}`);
        }

        const data = await response.json();

        // Gemini Response Structure for image generation:
        // { candidates: [ { content: { parts: [ { inlineData: { mimeType: "image/jpeg", data: "..." } } ] } } ] }
        const imagePart = data.candidates?.[0]?.content?.parts?.[0];
        const base64Image = imagePart?.inlineData?.data;

        if (!base64Image) {
          console.error('[ImageGen] Full API Response:', JSON.stringify(data).substring(0, 500) + '...');
          throw new Error('API response did not contain base64 image data');
        }

        // Decode Base64 and write to file
        const buffer = Buffer.from(base64Image, 'base64');
        fs.writeFileSync(filePath, buffer);

        console.log(`[ImageGen] Saved image to: ${fileName}`);
        results.push({ slug: page.slug, type: page.type, status: 'generated', path: filePath, prompt: prompt });
        processedCount++;

        // Rate limiting for Google API
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err: any) {
        console.error(`[ImageGen] Error for ${page.slug}:`, err);
        results.push({ slug: page.slug, type: page.type, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      types: { blog: includeBlog, pillar: includePillar },
      results,
    });

  } catch (error: any) {
    console.error('[BlogImageGen] Critical error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
