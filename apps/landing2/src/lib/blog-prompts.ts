import { BlogArticle } from './blog-data';

/**
 * Image Generation Prompts for SEO Pages
 *
 * FORMAT: Each prompt should include:
 * - Scene description (what's in the image)
 * - Style keywords (photorealistic, 3D, illustration, etc.)
 * - Quality keywords (4k, high quality, professional)
 * - "Aspect Ratio 16:9" at the end (for OG images: 1200x675)
 *
 * OUTPUT: WebP format, 1200x675px (16:9)
 *
 * See: docs/IMAGE-GENERATION-GUIDE.md for full documentation
 */

// ============================================
// PILLAR PAGES - Main SEO landing pages
// ============================================
export const PILLAR_PAGE_PROMPTS: Record<string, string> = {
  'projektowanie-mebli-online':
    'Modern home office, person using laptop with 3D furniture design software on screen, ' +
    'wardrobe blueprint visible, bright minimalist interior, wooden desk, ' +
    'professional but approachable atmosphere, photorealistic 4k, soft natural lighting. Aspect Ratio 16:9',

  'zamawianie-mebli-online':
    'Furniture warehouse interior, stacks of laminated boards in various colors, ' +
    'delivery truck visible through large windows, worker with tablet checking orders, ' +
    'modern logistics, industrial but clean atmosphere, photorealistic 4k. Aspect Ratio 16:9',
};

// ============================================
// BLOG ARTICLES - Supporting content
// ============================================
export const BLOG_IMAGE_PROMPTS: Record<string, string> = {
  'jak-zaprojektowac-szafe-na-wymiar-poradnik':
    'Modern interior design, photo realistic, a person measuring an empty wall alcove for a custom wardrobe, ' +
    'bright room, tape measure, professional tools, 4k, architectural visualization style. Aspect Ratio 16:9',

  'ile-kosztuje-szafa-na-wymiar-2024':
    'Conceptual 3D illustration, cost comparison of wardrobes, piggy bank and calculator on a wooden table ' +
    'with furniture blueprints, high quality, soft lighting, financial planning theme. Aspect Ratio 16:9',

  'jak-zmierzyc-wneke-pod-szafe-krok-po-kroku':
    'Close up photography, hands holding a yellow tape measure against a white wall corner, ' +
    'focus on precision, laser distance meter nearby, bright clean interior, construction details. Aspect Ratio 16:9',

  'meble-diy-od-czego-zaczac-poradnik-dla-poczatkujacych':
    'Cozy home workshop, workbench with essential woodworking tools, cordless drill, square, wood planks, ' +
    'sawdust, warm ambient lighting, depth of field, maker atmosphere. Aspect Ratio 16:9',

  'lista-ciecia-plyt-meblowych-jak-wygenerowac-i-zamowic':
    'Digital tablet showing a spreadsheet cut list on top of a stack of laminated wooden boards, ' +
    'furniture warehouse background, industrial lighting, sharp focus on data. Aspect Ratio 16:9',

  'szafa-wnekowa-czy-wolnostojaca-co-wybrac':
    'Split composition, left side showing a sleek built-in wardrobe seamlessly integrated into wall, ' +
    'right side showing a stylish freestanding wardrobe, interior design comparison, photorealistic 4k. Aspect Ratio 16:9',
};

// ============================================
// ALL PROMPTS COMBINED (for easy lookup)
// ============================================
export const ALL_IMAGE_PROMPTS: Record<string, string> = {
  ...PILLAR_PAGE_PROMPTS,
  ...BLOG_IMAGE_PROMPTS,
};

function addTitleOverlay(basePrompt: string, article: BlogArticle): string {
  const overlayTitle = article.content.pl.title || article.content.en.title;
  return `${basePrompt} Leave intentional negative space for text and overlay the article title "${overlayTitle}" on the image in bold, modern, high-contrast typography so it is clearly readable. Center the title within the frame and reserve generous safe margins (at least 18-20% padding from every edge) so the full text stays inside 16:9 crops and is never cut off.`;
}

export function getPromptForArticle(article: BlogArticle): string {
  // 1. Check for manual override first
  if (BLOG_IMAGE_PROMPTS[article.slug]) {
    return addTitleOverlay(BLOG_IMAGE_PROMPTS[article.slug], article);
  }

  // 2. Generate dynamic prompt based on content
  // We use English content for prompts as image models understand it better
  const title = article.content.en.title;
  const keywords = article.content.en.keywords.slice(0, 3).join(', ');
  
  // Base style for consistency
  const style = 'photorealistic, 4k, architectural photography style, modern interior design, high quality, soft natural lighting';
  
  const basePrompt = `Blog header image for article titled "${title}", related to ${keywords}, ${style}. Aspect Ratio 16:9`;
  return addTitleOverlay(basePrompt, article);
}
