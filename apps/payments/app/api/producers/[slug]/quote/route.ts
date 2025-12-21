/**
 * POST /api/producers/[slug]/quote
 *
 * Request a quote from a producer for a project.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface QuoteRequestBody {
  projectData: {
    parts: Array<{
      id: string;
      name: string;
      width: number;
      height: number;
      depth: number;
      materialId: string;
      edgebandingLeft?: boolean;
      edgebandingRight?: boolean;
      edgebandingTop?: boolean;
      edgebandingBottom?: boolean;
      quantity?: number;
    }>;
    materials: Array<{
      id: string;
      name: string;
      thickness: number;
    }>;
  };
  projectHash: string;
  services: string[];
  sessionId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body: QuoteRequestBody = await request.json();

    // Validation
    if (!body.projectData || !body.projectData.parts || body.projectData.parts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Project data with parts is required',
          },
        },
        { status: 400 }
      );
    }

    if (!body.services || body.services.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one service must be selected',
          },
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get producer
    const { data: producer, error: producerError } = await supabase
      .from('producers')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (producerError || !producer) {
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

    // Check if producer supports requested services
    const producerServices = producer.services || [];
    const unsupportedServices = body.services.filter(
      (s) => !producerServices.includes(s)
    );
    if (unsupportedServices.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNSUPPORTED_SERVICE',
            message: `Producer does not support: ${unsupportedServices.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Check for authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id;
    const guestSessionId = !user ? body.sessionId : null;

    if (!userId && !guestSessionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Authentication or sessionId required',
          },
        },
        { status: 400 }
      );
    }

    // Calculate quote
    const quote = calculateQuote(body.projectData, body.services, producer);

    // Check minimum order value
    const minOrderValue = producer.minimum_order_value ?? 0;
    if (quote.subtotal < minOrderValue) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BELOW_MINIMUM',
            message: `Minimum order value is ${(minOrderValue / 100).toFixed(2)} zł`,
            minimumValue: minOrderValue,
            currentValue: quote.subtotal,
          },
        },
        { status: 400 }
      );
    }

    // Generate quote number
    const { data: quoteNumber } = await supabase.rpc('generate_quote_number');

    // Create quote record
    const quoteData: any = {
      producer_id: producer.id,
      quote_number: quoteNumber || `QUO-${Date.now()}`,
      project_data: body.projectData,
      project_hash: body.projectHash,
      services: body.services,
      cutting_cost: quote.cuttingCost,
      edging_cost: quote.edgingCost,
      drilling_cost: quote.drillingCost,
      material_cost: 0, // Materials not included in this version
      subtotal: quote.subtotal,
      delivery_cost: quote.deliveryCost,
      total: quote.total,
      valid_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h validity
      status: 'pending',
      estimated_days: quote.estimatedDays,
    };

    if (userId) {
      quoteData.user_id = userId;
    } else {
      quoteData.guest_session_id = guestSessionId;
    }

    const { data: createdQuote, error: createError } = await supabase
      .from('producer_quotes')
      .insert(quoteData)
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    return NextResponse.json({
      success: true,
      data: {
        quoteId: createdQuote.id,
        quoteNumber: createdQuote.quote_number,
        producer: {
          id: producer.id,
          name: producer.name,
        },
        services: body.services,
        breakdown: {
          cuttingCost: quote.cuttingCost,
          edgingCost: quote.edgingCost,
          drillingCost: quote.drillingCost,
          subtotal: quote.subtotal,
          deliveryCost: quote.deliveryCost,
          total: quote.total,
        },
        estimatedDays: quote.estimatedDays,
        validUntil: createdQuote.valid_until,
        partsCount: body.projectData.parts.length,
        totalParts: body.projectData.parts.reduce((sum, p) => sum + (p.quantity || 1), 0),
      },
    });
  } catch (error) {
    console.error('Quote error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to create quote',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate quote based on project data and producer prices
 */
function calculateQuote(
  projectData: QuoteRequestBody['projectData'],
  services: string[],
  producer: any
) {
  let cuttingCost = 0;
  let edgingCost = 0;
  let drillingCost = 0;

  for (const part of projectData.parts) {
    const quantity = part.quantity || 1;

    // Calculate cutting cost (perimeter * price per meter)
    if (services.includes('cutting')) {
      const perimeterMm = 2 * (part.width + part.height);
      const perimeterM = perimeterMm / 1000;
      cuttingCost += Math.round(perimeterM * producer.base_cutting_price * quantity);
    }

    // Calculate edging cost
    if (services.includes('edging')) {
      let edgeLengthMm = 0;
      if (part.edgebandingLeft) edgeLengthMm += part.height;
      if (part.edgebandingRight) edgeLengthMm += part.height;
      if (part.edgebandingTop) edgeLengthMm += part.width;
      if (part.edgebandingBottom) edgeLengthMm += part.width;

      const edgeLengthM = edgeLengthMm / 1000;
      edgingCost += Math.round(edgeLengthM * producer.base_edging_price * quantity);
    }

    // Calculate drilling cost (fixed per part with drilling)
    if (services.includes('drilling')) {
      // Assume 5 zł per part for drilling
      drillingCost += 500 * quantity;
    }
  }

  const subtotal = cuttingCost + edgingCost + drillingCost;

  // Calculate delivery cost
  let deliveryCost = producer.delivery_base_cost || 0;
  if (
    producer.free_delivery_threshold &&
    subtotal >= producer.free_delivery_threshold
  ) {
    deliveryCost = 0;
  }

  // Include delivery if service is selected
  if (!services.includes('delivery')) {
    deliveryCost = 0;
  }

  const total = subtotal + deliveryCost;

  // Estimate production days based on part count
  const totalParts = projectData.parts.reduce((sum, p) => sum + (p.quantity || 1), 0);
  const estimatedDays = Math.ceil(totalParts / 50) + 2; // Base 2 days + 1 day per 50 parts

  return {
    cuttingCost,
    edgingCost,
    drillingCost,
    subtotal,
    deliveryCost,
    total,
    estimatedDays,
  };
}
