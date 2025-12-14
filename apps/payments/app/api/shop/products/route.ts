/**
 * GET /api/shop/products
 *
 * List shop products with optional filtering.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = await createClient();

    let query = supabase
      .from('shop_products')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true);
    }

    if (tags && tags.length > 0) {
      // Filter products that have any of the specified tags
      query = query.overlaps('recommendation_tags', tags);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: products, error, count } = await query;

    if (error) {
      console.error('Failed to fetch products:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to fetch products',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        products: products?.map(formatProduct) || [],
        pagination: {
          offset,
          limit,
          total: count,
        },
      },
    });
  } catch (error) {
    console.error('Products error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error',
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
    sku: product.sku,
    stockQuantity: product.stock_quantity,
    inStock: product.stock_quantity > 0 || !product.track_inventory,
    images: product.images || [],
    thumbnailUrl: product.thumbnail_url || product.images?.[0],
    isFeatured: product.is_featured,
    recommendationTags: product.recommendation_tags || [],
    externalUrl: product.external_url,
    isAffiliate: product.is_affiliate,
  };
}
