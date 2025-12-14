/**
 * GET /api/producers
 *
 * List producers with optional filtering by services and region.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const services = searchParams.get('services')?.split(',').filter(Boolean);
    const region = searchParams.get('region'); // postal code prefix
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = await createClient();

    let query = supabase
      .from('producers')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('is_verified', { ascending: false })
      .order('rating', { ascending: false, nullsFirst: false });

    // Filter by services
    if (services && services.length > 0) {
      query = query.contains('services', services);
    }

    // Filter by delivery region
    if (region) {
      query = query.contains('delivery_regions', [region.substring(0, 2)]);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: producers, error, count } = await query;

    if (error) {
      console.error('Failed to fetch producers:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to fetch producers',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        producers: producers?.map(formatProducer) || [],
        pagination: {
          offset,
          limit,
          total: count,
        },
      },
    });
  } catch (error) {
    console.error('Producers error:', error);
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
