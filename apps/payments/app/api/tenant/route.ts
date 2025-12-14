/**
 * GET /api/tenant - Resolve tenant from hostname
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const host = searchParams.get('host');

    if (!host) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Host parameter is required',
          },
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Use the database function to resolve tenant
    const { data, error } = await supabase.rpc('get_tenant_by_host', {
      p_host: host,
    });

    if (error) {
      console.error('Tenant resolution error:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to resolve tenant',
          },
        },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Tenant not found',
        },
      }, { status: 404 });
    }

    const tenant = data[0];

    // Format response
    return NextResponse.json({
      success: true,
      data: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        plan: tenant.plan,
        status: tenant.status,
        branding: formatBranding(tenant.branding),
        settings: formatSettings(tenant.settings),
      },
    });
  } catch (error) {
    console.error('Tenant API error:', error);
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

function formatBranding(branding: any) {
  if (!branding) return {};

  return {
    logoUrl: branding.logo_url,
    logoDarkUrl: branding.logo_dark_url,
    faviconUrl: branding.favicon_url,
    primaryColor: branding.primary_color,
    secondaryColor: branding.secondary_color,
    accentColor: branding.accent_color,
    backgroundColor: branding.background_color,
    textColor: branding.text_color,
    fontFamily: branding.font_family,
    borderRadius: branding.border_radius,
    customCss: branding.custom_css,
  };
}

function formatSettings(settings: any) {
  if (!settings) return {};

  return {
    showPoweredBy: settings.show_powered_by ?? true,
    defaultLanguage: settings.default_language || 'pl',
    allowedExportFormats: settings.allowed_export_formats || ['csv'],
    customExportColumns: settings.custom_export_columns,
    watermarkExports: settings.watermark_exports ?? false,
  };
}
