/**
 * GET /api/shop/products/[slug]
 *
 * Get a single product by slug.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Product slug is required',
          },
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get product
    const { data: product, error: productError } = await supabase
      .from('shop_products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found',
          },
        },
        { status: 404 }
      );
    }

    // Get variants if any
    const { data: variants } = await supabase
      .from('shop_product_variants')
      .select('*')
      .eq('product_id', product.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    return NextResponse.json({
      success: true,
      data: {
        ...formatProduct(product),
        variants: variants?.map(formatVariant) || [],
      },
    });
  } catch (error) {
    console.error('Product detail error:', error);
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
    metaTitle: product.meta_title,
    metaDescription: product.meta_description,
  };
}

function formatVariant(variant: any) {
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    price: variant.price,
    stockQuantity: variant.stock_quantity,
    attributes: variant.attributes || {},
  };
}
