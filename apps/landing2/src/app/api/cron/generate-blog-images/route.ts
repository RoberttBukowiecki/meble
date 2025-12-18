import { NextResponse } from 'next/server';
import { BLOG_ARTICLES } from '@/lib/blog-data';
import { getPromptForArticle } from '@/lib/blog-prompts';
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

export async function GET(request: Request) {
  try {
    // Basic authorization check
    const { searchParams } = new URL(request.url);
    if (process.env.NODE_ENV === 'production' && searchParams.get('key') !== process.env.CRON_SECRET_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const forceUpdate = searchParams.get('force') === 'true';
    const limitParam = searchParams.get('limit');
    
    // Parse limit: 'all' or number
    const totalArticles = BLOG_ARTICLES.length;
    let limit = limitParam === 'all' ? totalArticles : parseInt(limitParam || '1', 10);
    if (isNaN(limit) || limit <= 0) limit = 1;
    limit = Math.min(limit, totalArticles);

    const results = [];
    
    // Ensure directories exist
    const publicDir = path.join(process.cwd(), 'public');
    const blogImgDir = path.join(publicDir, 'img', 'blog');
    
    if (!fs.existsSync(blogImgDir)) {
      fs.mkdirSync(blogImgDir, { recursive: true });
    }

    console.log(`[BlogImageGen] Starting pipeline. Limit: ${limit}. Source: ${BLOG_ARTICLES.length} articles.`);

    let processedCount = 0;

    for (const article of BLOG_ARTICLES) {
      if (processedCount >= limit) {
        break;
      }

      // Use image.src filename when available to stay in sync with frontend paths
      const srcFileName = article.image?.src ? path.basename(article.image.src) : '';
      const baseName = srcFileName ? srcFileName.replace(/\.[^/.]+$/, '') : article.slug;
      const extension = srcFileName ? path.extname(srcFileName) || '.webp' : '.webp';
      const fileName = `${baseName}${extension}`;
      const filePath = path.join(blogImgDir, fileName);
      const exists = fs.existsSync(filePath);

      if (exists && !forceUpdate) {
        console.log(`[BlogImageGen] Skipping existing image: ${fileName} (use force=true to regenerate)`);
        continue;
      }

      console.log(`[BlogImageGen] Processing (${processedCount + 1}/${limit}): ${article.slug}`);
      const prompt = getPromptForArticle(article);

      try {
        // MOCK / SAFETY CHECK
        if (!API_KEY) {
           console.warn(`[BlogImageGen] Missing API Key (NANO_BANANA_API_KEY). Switching to MOCK generation (placehold.co).`);
           
           // Generate a simple placeholder with text
           const overlayTitle = article.content.pl.title || article.content.en.title;
           const mockTitle = overlayTitle.length > 80 ? `${overlayTitle.slice(0, 77)}...` : overlayTitle;
           const text = encodeURIComponent(mockTitle);
           const mockUrl = `https://placehold.co/1200x675/png?text=${text}`;
           
           const mockRes = await fetch(mockUrl);
           if (!mockRes.ok) throw new Error(`Failed to fetch mock image: ${mockRes.statusText}`);
           
           await streamPipeline(mockRes.body as any, fs.createWriteStream(filePath));
           
           results.push({ 
             slug: article.slug, 
             status: 'generated_mock', 
             path: filePath, 
             prompt: prompt,
             note: 'Used placehold.co because API Key is missing' 
           });
           processedCount++;
           continue;
        }

        console.log(`[BlogImageGen] Sending request to Google Gemini (Nano Banana) for: ${article.slug}`);
        
        // Prepare request for Google Gemini API (Nano Banana model)
        // API Key is passed as a query parameter for generateContent method
        const urlWithKey = `${GEMINI_API_URL}?key=${API_KEY}`;
        
        const response = await fetch(urlWithKey, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: prompt }] }
            ],
            generationConfig: {
              // aspectRatio: "16:9" // Not supported by gemini-3-pro-image-preview
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[BlogImageGen] API Error: ${response.status} - ${errText}`);
          throw new Error(`Google API returned ${response.status}: ${errText}`);
        }

        const data = await response.json();
        
        // Gemini 2.5 Flash Image Response Structure for image generation:
        // { candidates: [ { content: { parts: [ { inlineData: { mimeType: "image/jpeg", data: "..." } } ] } } ] }
        const imagePart = data.candidates?.[0]?.content?.parts?.[0];
        const base64Image = imagePart?.inlineData?.data;

        if (!base64Image) {
            console.error('[BlogImageGen] Full API Response:', JSON.stringify(data).substring(0, 500) + '...');
            throw new Error('API response did not contain base64 image data');
        }

        // Decode Base64 and write to file
        const buffer = Buffer.from(base64Image, 'base64');
        fs.writeFileSync(filePath, buffer);

        console.log(`[BlogImageGen] Saved image to: ${fileName}`);
        results.push({ slug: article.slug, status: 'generated', path: filePath, prompt: prompt });
        processedCount++;

        // Rate limiting for Google API (keep existing rate limit)
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (err: any) {
        console.error(`[BlogImageGen] Error for ${article.slug}:`, err);
        results.push({ slug: article.slug, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      results
    });

  } catch (error: any) {
    console.error('[BlogImageGen] Critical error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
