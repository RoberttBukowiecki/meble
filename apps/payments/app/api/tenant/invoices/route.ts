/**
 * GET /api/tenant/invoices - List tenant's invoices
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get user's tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_user_id', user.id)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No tenant found' } },
        { status: 404 }
      );
    }

    let query = supabase
      .from('tenant_invoices')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: invoices, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        invoices: invoices?.map(formatInvoice) || [],
        pagination: {
          offset,
          limit,
          total: count,
        },
      },
    });
  } catch (error) {
    console.error('Invoices fetch error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch invoices' } },
      { status: 500 }
    );
  }
}

function formatInvoice(invoice: any) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    status: invoice.status,
    subtotal: invoice.subtotal,
    taxRate: invoice.tax_rate,
    taxAmount: invoice.tax_amount,
    total: invoice.total,
    periodStart: invoice.period_start,
    periodEnd: invoice.period_end,
    dueDate: invoice.due_date,
    paidAt: invoice.paid_at,
    pdfUrl: invoice.pdf_url,
    createdAt: invoice.created_at,
  };
}
