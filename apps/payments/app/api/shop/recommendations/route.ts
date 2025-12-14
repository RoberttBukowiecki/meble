/**
 * GET /api/shop/recommendations
 *
 * Get product recommendations based on project tags.
 * Used for post-export upsell.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const limit = parseInt(searchParams.get('limit') || '6', 10);
    const excludeIds = searchParams.get('exclude')?.split(',').filter(Boolean) || [];

    const supabase = await createClient();

    // If no tags provided, return featured products
    if (tags.length === 0) {
      const { data: featured, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('sort_order', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: {
          products: featured?.map(formatProduct) || [],
          reason: 'featured',
        },
      });
    }

    // Get products matching tags
    let query = supabase
      .from('shop_products')
      .select('*')
      .eq('is_active', true)
      .overlaps('recommendation_tags', tags)
      .order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .limit(limit);

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data: products, error } = await query;

    if (error) throw error;

    // If not enough products, fill with featured
    let finalProducts = products || [];

    if (finalProducts.length < limit) {
      const existingIds = finalProducts.map((p) => p.id);
      const neededCount = limit - finalProducts.length;

      const { data: additional } = await supabase
        .from('shop_products')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .not('id', 'in', `(${[...existingIds, ...excludeIds].join(',')})`)
        .limit(neededCount);

      if (additional) {
        finalProducts = [...finalProducts, ...additional];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        products: finalProducts.map(formatProduct),
        reason: 'tags_match',
        matchedTags: tags,
      },
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch recommendations',
        },
      },
      { status: 500 }
    );
  }
}

function formatProduct(product: any) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    namePl: product.name_pl,
    description: product.description,
    descriptionPl: product.description_pl,
    category: product.category,
    price: product.price,
    compareAtPrice: product.compare_at_price,
    currency: product.currency,
    images: product.images || [],
    thumbnailUrl: product.thumbnail_url || product.images?.[0],
    isFeatured: product.is_featured,
    recommendationTags: product.recommendation_tags || [],
    inStock: product.stock_quantity > 0 || !product.track_inventory,
  };
}
