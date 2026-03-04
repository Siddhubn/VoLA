import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/simple-auth';
import { 
  getPerformanceMetrics, 
  healthCheck,
  preloadCommonContent 
} from '@/lib/rag-helper-optimized';
import { CacheManager } from '@/lib/rag-performance';

/**
 * GET /api/rag/performance
 * Get RAG system performance metrics and health status
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'health':
        const healthStatus = await healthCheck();
        return NextResponse.json({
          success: true,
          health: healthStatus
        });

      case 'metrics':
        const metrics = getPerformanceMetrics();
        return NextResponse.json({
          success: true,
          metrics
        });

      case 'cache':
        const cacheStats = CacheManager.getCacheStats();
        return NextResponse.json({
          success: true,
          cache: cacheStats
        });

      default:
        // Return comprehensive performance data
        const [health, performanceMetrics, cache] = await Promise.all([
          healthCheck(),
          Promise.resolve(getPerformanceMetrics()),
          Promise.resolve(CacheManager.getCacheStats())
        ]);

        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          health,
          metrics: performanceMetrics,
          cache
        });
    }

  } catch (error: any) {
    console.error('❌ Performance API error:', error);
    return NextResponse.json(
      { error: 'Failed to get performance data', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rag/performance
 * Perform performance-related actions
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    switch (action) {
      case 'preload':
        console.log('🚀 Starting content preload...');
        await preloadCommonContent();
        return NextResponse.json({
          success: true,
          message: 'Content preloaded successfully'
        });

      case 'clear-cache':
        CacheManager.clearAllCaches();
        return NextResponse.json({
          success: true,
          message: 'All caches cleared'
        });

      case 'cleanup-cache':
        CacheManager.cleanupExpiredEntries();
        return NextResponse.json({
          success: true,
          message: 'Expired cache entries cleaned up'
        });

      case 'warmup-cache':
        await CacheManager.warmupCache();
        return NextResponse.json({
          success: true,
          message: 'Cache warmed up successfully'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: preload, clear-cache, cleanup-cache, warmup-cache' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('❌ Performance action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform action', details: error.message },
      { status: 500 }
    );
  }
}