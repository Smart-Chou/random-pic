import { NextRequest, NextResponse } from 'next/server';
import { getImageById, getRandomImage } from '@/lib/image-service';

// R2 自定义域名
const R2_BASE_URL = process.env.IMAGE_BASE_URL || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('id');
    const width = searchParams.get('width');
    const quality = searchParams.get('quality');
    const format = searchParams.get('format');

    // 获取图片
    const image = imageId
      ? await getImageById(imageId)
      : await getRandomImage();

    if (!image) {
      return new NextResponse('Image not found', { status: 404 });
    }

    // 构建 R2 URL
    let imageUrl = image.url;
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      const baseUrl = R2_BASE_URL.startsWith('http') ? R2_BASE_URL : `https://${R2_BASE_URL}`;
      imageUrl = `${baseUrl}${imageUrl}`;
    }

    // 如果有压缩参数，使用 Vercel 图片优化
    if (width || quality || format) {
      const params = new URLSearchParams();
      if (width) params.set('w', width);
      if (quality) params.set('q', quality);
      if (format) params.set('fm', format);

      const optimizedUrl = `${imageUrl}?${params.toString()}`;
      return NextResponse.redirect(optimizedUrl, 302);
    }

    // 代理模式：流式转发图片内容
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(imageUrl, { signal: controller.signal }).finally(() => {
      clearTimeout(timeoutId);
    });

    if (!response.ok) {
      return new NextResponse('Image not available', { status: 502 });
    }

    const headers = new Headers();
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    const cacheControl = response.headers.get('cache-control');

    if (contentType) headers.set('content-type', contentType);
    if (contentLength) headers.set('content-length', contentLength);
    if (cacheControl) headers.set('cache-control', cacheControl);
    else headers.set('cache-control', 'public, max-age=31536000');

    const body = response.body;
    if (!body) {
      return new NextResponse('Image not available', { status: 502 });
    }

    return new NextResponse(body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}