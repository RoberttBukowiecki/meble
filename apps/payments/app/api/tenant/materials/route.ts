/**
 * GET /api/tenant/materials - Get tenant's custom materials
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Tenant context required',
          },
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabase = await createClient();

    let query = supabase
      .from('tenant_materials')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: materials, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        materials: materials?.map(formatMaterial) || [],
        pagination: {
          offset,
          limit,
          total: count,
        },
      },
    });
  } catch (error) {
    console.error('Tenant materials error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch materials',
        },
      },
      { status: 500 }
    );
  }
}

function formatMaterial(material: any) {
  return {
    id: material.id,
    code: material.code,
    name: material.name,
    description: material.description,
    category: material.category,
    thickness: material.thickness,
    width: material.width,
    height: material.height,
    color: material.color,
    texture: material.texture,
    imageUrl: material.image_url,
    pricePerM2: material.price_per_m2,
    pricePerSheet: material.price_per_sheet,
    inStock: material.in_stock,
    metadata: material.metadata,
  };
}
