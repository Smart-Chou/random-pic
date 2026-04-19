import { NextRequest, NextResponse } from 'next/server';
import { getImageById, getRandomImage } from '@/lib/image-service';
import { config } from '@/lib/config';

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

    // 构建完整 URL
    let imageUrl = image.url;
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      imageUrl = config.baseUrl + imageUrl;
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

    // 直接返回原图
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(imageUrl, { signal: controller.signal });
      if (!response.ok) {
        return new NextResponse('Image not available', { status: 502 });
      }

      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return new NextResponse('Image fetch timeout', { status: 504 });
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('Error fetching image:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}