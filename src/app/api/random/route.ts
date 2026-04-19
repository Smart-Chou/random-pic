import { NextRequest, NextResponse } from 'next/server';
import { getRandomImage, getCategories } from '@/lib/image-service';
import { config } from '@/lib/config';
import {
  AppError,
  categoryNotFound,
  noAvailableImages,
  forbidden,
} from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Referer 验证（跳过背景图请求）
    const referer = request.headers.get('referer') || request.headers.get('origin');
    const isBgRequest = searchParams.get('bg') === 'true';
    if (!isBgRequest && referer && config.refererWhitelist.length > 0) {
      const isAllowed = config.refererWhitelist.some(
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
      // Return nico.gif as fallback
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

    // Default: redirect to image URL
    // 处理相对路径：当前CSV中是相对路径如 /images/landscape/webp/xxx.webp
    // 需要拼接 baseUrl（预留扩展点）
    let imageUrl = image.url;
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      // 如果没有配置 baseUrl，使用相对路径
      if (!config.baseUrl) {
        // 保持相对路径，让 Next.js 处理
      } else {
        // 添加 https:// 前缀如果缺少协议
        const baseUrl = config.baseUrl.startsWith('http')
          ? config.baseUrl
          : `https://${config.baseUrl}`;
        imageUrl = baseUrl + imageUrl;
      }
    }

    return NextResponse.redirect(imageUrl, config.api.redirectStatusCode);
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