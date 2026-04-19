import { NextRequest, NextResponse } from 'next/server';
import { getRandomImage, getCategories } from '@/lib/image-service';
import {
  AppError,
  categoryNotFound,
  forbidden,
} from '@/lib/errors';

// R2 自定义域名，用于代理获取图片
const R2_BASE_URL = process.env.IMAGE_BASE_URL || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Referer 验证（跳过背景图请求）
    const referer = request.headers.get('referer') || request.headers.get('origin');
    const isBgRequest = searchParams.get('bg') === 'true';
    const refererWhitelist = (process.env.REFERER_WHITELIST || 'marxchou.com,localhost,127.0.0.1,mcc.im')
      .split(',')
      .map(d => d.trim());
    if (!isBgRequest && referer && refererWhitelist.length > 0) {
      const isAllowed = refererWhitelist.some(
        (domain) => referer.includes(domain) || domain === '*'
      );
      if (!isAllowed) {
        return errorResponse(forbidden('Referer not allowed'));
      }
    }

    const category = searchParams.get('category') ?? undefined;
    const format = searchParams.get('format');

    // Validate category if provided
    if (category) {
      const availableCategories = await getCategories();
      if (!availableCategories.includes(category)) {
        return errorResponse(categoryNotFound(category));
      }
    }

    // Get random image
    const image = await getRandomImage({ category });

    if (!image) {
      // 查找备用图片
      return NextResponse.redirect('/nico.gif', 302);
    }

    // Return JSON if requested
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: {
          id: image.id,
          url: image.url,
          category: image.category,
          tags: image.tags,
        },
      });
    }

    // 构建 R2 URL
    let imageUrl = image.url;
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      const baseUrl = R2_BASE_URL.startsWith('http') ? R2_BASE_URL : `https://${R2_BASE_URL}`;
      imageUrl = `${baseUrl}${imageUrl}`;
    }

    // 代理模式：从 R2 获取图片并转发给用户
    // 地址栏保持为当前域名，不显示任何 URL
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let r2Response;
    try {
      r2Response = await fetch(imageUrl, { signal: controller.signal });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('R2 fetch error, falling back to redirect:', fetchError);
      // 代理失败时回退到重定向模式
      return NextResponse.redirect(imageUrl, 302);
    }
    clearTimeout(timeoutId);

    if (!r2Response.ok) {
      console.error('R2 fetch failed:', r2Response.status, imageUrl);
      return new NextResponse('Image not found', { status: 404 });
    }

    const headers = new Headers();
    const contentType = r2Response.headers.get('content-type');
    const contentLength = r2Response.headers.get('content-length');
    const cacheControl = r2Response.headers.get('cache-control');

    if (contentType) headers.set('content-type', contentType);
    if (contentLength) headers.set('content-length', contentLength);
    if (cacheControl) headers.set('cache-control', cacheControl);
    else headers.set('cache-control', 'public, max-age=86400');

    // 流式转发图片内容
    const body = r2Response.body;
    if (!body) {
      return new NextResponse('Image not found', { status: 404 });
    }

    return new NextResponse(body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('API Error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    if (error instanceof AppError) {
      return errorResponse(error);
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: errMsg } },
      { status: 500 }
    );
  }
}

function errorResponse(error: AppError): NextResponse {
  return NextResponse.json(error.toJSON(), { status: 400 });
}