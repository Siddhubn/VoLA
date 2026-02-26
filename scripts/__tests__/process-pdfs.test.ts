import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { discoverPDFs, ProgressTracker, ReportGenerator, parseArguments } from '../process-pdfs';

// Mock fs module
vi.mock('fs/promises');
const mockFs = vi.mocked(fs);

describe('PDF Processing CLI Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('discoverPDFs', () => {
    it('should discover PDFs in both courses when no course specified', async () => {
      // Mock directory structure
      mockFs.readdir
        .mockResolvedValueOnce(['file1.pdf', 'file2.txt'] as any) // fitter directory
        .mockResolvedValueOnce(['file3.pdf', 'file4.pdf'] as any); // electrician directory

      mockFs.stat
        .mockResolvedValueOnce({ size: 1000 } as any)
        .mockResolvedValueOnce({ size: 2000 } as any)
        .mockResolvedValueOnce({ size: 3000 } as any);

      const result = await discoverPDFs('/test/path');

      expect(mockFs.readdir).toHaveBeenCalledWith('/test/path/fitter');
      expect(mockFs.readdir).toHaveBeenCalledWith('/test/path/electrician');
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        course: 'fitter',
        filename: 'file1.pdf',
        size: 1000
      });
      expect(result[1]).toMatchObject({
        course: 'electrician',
        filename: 'file3.pdf',
        size: 2000
      });
      expect(result[2]).toMatchObject({
        course: 'electrician',
        filename: 'file4.pdf',
        size: 3000
      });
    });

    it('should discover PDFs only for specified course', async () => {
      mockFs.readdir.mockResolvedValueOnce(['file1.pdf', 'file2.pdf'] as any);
      mockFs.stat
        .mockResolvedValueOnce({ size: 1000 } as any)
        .mockResolvedValueOnce({ size: 2000 } as any);

      const result = await discoverPDFs('/test/path', 'fitter');

      expect(mockFs.readdir).toHaveBeenCalledWith('/test/path/fitter');
      expect(mockFs.readdir).not.toHaveBeenCalledWith('/test/path/electrician');
      expect(result).toHaveLength(2);
      expect(result.every(file => file.course === 'fitter')).toBe(true);
    });

    it('should handle directory read errors gracefully', async () => {
      mockFs.readdir.mockRejectedValueOnce(new Error('Directory not found'));

      const result = await discoverPDFs('/test/path', 'fitter');

      expect(result).toHaveLength(0);
    });

    it('should filter out non-PDF files', async () => {
      mockFs.readdir.mockResolvedValueOnce(['file1.pdf', 'file2.txt', 'file3.doc'] as any);
      mockFs.stat.mockResolvedValueOnce({ size: 1000 } as any);

      const result = await discoverPDFs('/test/path', 'fitter');

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('file1.pdf');
    });
  });

  describe('ProgressTracker', () => {
    it('should track progress correctly', () => {
      const tracker = new ProgressTracker(3, false);

      // Test initial state
      const initialSummary = tracker.getSummary();
      expect(initialSummary.totalFiles).toBe(3);
      expect(initialSummary.completedFiles).toBe(0);
      expect(initialSummary.failedFiles).toBe(0);

      // Test successful completion
      tracker.completeFile('file1.pdf', {
        success: true,
        filename: 'file1.pdf',
        course: 'fitter',
        totalChunks: 10,
        totalEmbeddings: 10,
        processingTimeMs: 1000,
        summary: {
          extractedPages: 5,
          generatedChunks: 10,
          successfulEmbeddings: 10,
          failedEmbeddings: 0,
          storedChunks: 10,
          moduleDistribution: { 'module1': 5, 'module2': 5 },
          averageChunkSize: 500,
          totalTokens: 5000
        }
      });

      const summary = tracker.getSummary();
      expect(summary.completedFiles).toBe(1);
      expect(summary.failedFiles).toBe(0);
      expect(summary.successRate).toBe(33.33333333333333);
    });

    it('should track failed files correctly', () => {
      const tracker = new ProgressTracker(2, false);

      tracker.completeFile('file1.pdf', {
        success: false,
        filename: 'file1.pdf',
        course: 'fitter',
        totalChunks: 0,
        totalEmbeddings: 0,
        processingTimeMs: 500,
        error: 'Processing failed',
        summary: {
          extractedPages: 0,
          generatedChunks: 0,
          successfulEmbeddings: 0,
          failedEmbeddings: 0,
          storedChunks: 0,
          moduleDistribution: {},
          averageChunkSize: 0,
          totalTokens: 0
        }
      });

      const summary = tracker.getSummary();
      expect(summary.completedFiles).toBe(0);
      expect(summary.failedFiles).toBe(1);
      expect(summary.successRate).toBe(0);
    });

    it('should format duration correctly', () => {
      const tracker = new ProgressTracker(1, false);

      expect(tracker.formatDuration(30)).toBe('30.0s');
      expect(tracker.formatDuration(90)).toBe('1m 30s');
      expect(tracker.formatDuration(3661)).toBe('1h 1m');
    });
  });

  describe('ReportGenerator', () => {
    it('should generate comprehensive report', () => {
      const generator = new ReportGenerator();
      const mockSummary = {
        totalFiles: 2,
        completedFiles: 1,
        failedFiles: 1,
        totalProcessingTime: 120,
        averageTimePerFile: 60,
        successRate: 50,
        results: [
          {
            filename: 'success.pdf',
            result: {
              success: true,
              filename: 'success.pdf',
              course: 'fitter' as const,
              totalChunks: 10,
              totalEmbeddings: 10,
              processingTimeMs: 60000,
              summary: {
                extractedPages: 5,
                generatedChunks: 10,
                successfulEmbeddings: 10,
                failedEmbeddings: 0,
                storedChunks: 10,
                moduleDistribution: { 'module1': 10 },
                averageChunkSize: 500,
                totalTokens: 5000
              }
            }
          },
          {
            filename: 'failed.pdf',
            result: {
              success: false,
              filename: 'failed.pdf',
              course: 'electrician' as const,
              totalChunks: 0,
              totalEmbeddings: 0,
              processingTimeMs: 60000,
              error: 'Processing failed',
              summary: {
                extractedPages: 0,
                generatedChunks: 0,
                successfulEmbeddings: 0,
                failedEmbeddings: 0,
                storedChunks: 0,
                moduleDistribution: {},
                averageChunkSize: 0,
                totalTokens: 0
              }
            }
          }
        ]
      };

      const config = {
        chunkSize: 750,
        chunkOverlap: 100,
        embeddingBatchSize: 50,
        maxConcurrentFiles: 2,
        course: null,
        dryRun: false,
        reportFile: null,
        verbose: false
      };

      const report = generator.generateReport(mockSummary, config);

      expect(report.metadata.configuration).toEqual(config);
      expect(report.summary.totalFiles).toBe(2);
      expect(report.summary.successfulFiles).toBe(1);
      expect(report.summary.failedFiles).toBe(1);
      expect(report.statistics.totalChunks).toBe(10);
      expect(report.statistics.moduleDistribution).toEqual({ 'module1': 10 });
      expect(report.errors).toHaveLength(1);
      expect(report.errors[0].filename).toBe('failed.pdf');
    });

    it('should handle empty results gracefully', () => {
      const generator = new ReportGenerator();
      const mockSummary = {
        totalFiles: 0,
        completedFiles: 0,
        failedFiles: 0,
        totalProcessingTime: 0,
        averageTimePerFile: 0,
        successRate: 0,
        results: []
      };

      const config = {
        chunkSize: 750,
        chunkOverlap: 100,
        embeddingBatchSize: 50,
        maxConcurrentFiles: 2,
        course: null,
        dryRun: false,
        reportFile: null,
        verbose: false
      };

      const report = generator.generateReport(mockSummary, config);

      expect(report.statistics.totalChunks).toBe(0);
      expect(report.statistics.totalEmbeddings).toBe(0);
      expect(report.statistics.moduleDistribution).toEqual({});
      expect(report.errors).toHaveLength(0);
    });
  });

  describe('parseArguments', () => {
    const originalArgv = process.argv;

    afterEach(() => {
      process.argv = originalArgv;
    });

    it('should parse command line arguments correctly', () => {
      process.argv = [
        'node',
        'script.js',
        '--chunk-size', '1000',
        '--chunk-overlap', '150',
        '--batch-size', '25',
        '--concurrent', '1',
        '--course', 'fitter',
        '--verbose',
        '--dry-run',
        '--report-file', 'report.json'
      ];

      const config = parseArguments();

      expect(config.chunkSize).toBe(1000);
      expect(config.chunkOverlap).toBe(150);
      expect(config.embeddingBatchSize).toBe(25);
      expect(config.maxConcurrentFiles).toBe(1);
      expect(config.course).toBe('fitter');
      expect(config.verbose).toBe(true);
      expect(config.dryRun).toBe(true);
      expect(config.reportFile).toBe('report.json');
    });

    it('should use default values when no arguments provided', () => {
      process.argv = ['node', 'script.js'];

      const config = parseArguments();

      expect(config.chunkSize).toBe(750);
      expect(config.chunkOverlap).toBe(100);
      expect(config.embeddingBatchSize).toBe(50);
      expect(config.maxConcurrentFiles).toBe(2);
      expect(config.course).toBe(null);
      expect(config.verbose).toBe(false);
      expect(config.dryRun).toBe(false);
      expect(config.reportFile).toBe(null);
    });
  });
});