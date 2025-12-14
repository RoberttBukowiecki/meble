/**
 * GET /api/producers/[slug]
 *
 * Get a single producer by slug.
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
            message: 'Producer slug is required',
          },
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: producer, error } = await supabase
      .from('producers')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !producer) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Producer not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: formatProducer(producer),
    });
  } catch (error) {
    console.error('Producer detail error:', error);
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

function formatProducer(producer: any) {
  return {
    id: producer.id,
    name: producer.name,
    slug: producer.slug,
    description: producer.description,
    logoUrl: producer.logo_url,
    email: producer.email,
    phone: producer.phone,
    website: producer.website,
    address: producer.address,
    services: producer.services || [],
    supportedMaterials: producer.supported_materials || [],
    baseCuttingPrice: producer.base_cutting_price,
    baseEdgingPrice: producer.base_edging_price,
    minimumOrderValue: producer.minimum_order_value,
    deliveryRegions: producer.delivery_regions || [],
    deliveryBaseCost: producer.delivery_base_cost,
    freeDeliveryThreshold: producer.free_delivery_threshold,
    isVerified: producer.is_verified,
    rating: producer.rating ? parseFloat(producer.rating) : null,
    totalOrders: producer.total_orders,
  };
}
