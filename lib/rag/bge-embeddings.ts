import { pipeline, Pipeline } from '@xenova/transformers';

/**
 * BGE Embedding Service
 * Uses BAAI/bge-small-en-v1.5 model for local embeddings (384 dimensions)
 */
export class BGEEmbeddingService {
  private static instance: BGEEmbeddingService;
  private embedder: Pipeline | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): BGEEmbeddingService {
    if (!BGEEmbeddingService.instance) {
      BGEEmbeddingService.instance = new BGEEmbeddingService();
    }
    return BGEEmbeddingService.instance;
  }

  /**
   * Initialize the BGE model
   */
  async initialize(): Promise<void> {
    if (this.embedder) {
      return; // Already initialized
    }

    if (this.initPromise) {
      return this.initPromise; // Initialization in progress
    }

    this.initPromise = (async () => {
      try {
        console.log('🔄 Loading BGE embedding model...');
        this.embedder = await pipeline(
          'feature-extraction',
          'Xenova/bge-small-en-v1.5'
        ) as any;
        console.log('✅ BGE model loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load BGE model:', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    await this.initialize();

    if (!this.embedder) {
      throw new Error('BGE embedder not initialized');
    }

    try {
      // BGE models work best with this prefix for queries
      const prefixedText = `Represent this sentence for searching relevant passages: ${text}`;
      
      const output = await this.embedder(prefixedText, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert to regular array
      const embedding = Array.from(output.data) as number[];
      
      if (embedding.length !== 384) {
        throw new Error(`Expected 384 dimensions, got ${embedding.length}`);
      }

      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    await this.initialize();

    if (!this.embedder) {
      throw new Error('BGE embedder not initialized');
    }

    const embeddings: number[][] = [];

    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Generate embedding for document content (without query prefix)
   */
  async generateDocumentEmbedding(text: string): Promise<number[]> {
    await this.initialize();

    if (!this.embedder) {
      throw new Error('BGE embedder not initialized');
    }

    try {
      const output = await this.embedder(text, {
        pooling: 'mean',
        normalize: true,
      });

      const embedding = Array.from(output.data) as number[];
      
      if (embedding.length !== 384) {
        throw new Error(`Expected 384 dimensions, got ${embedding.length}`);
      }

      return embedding;
    } catch (error) {
      console.error('Error generating document embedding:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Export singleton instance
export const bgeEmbeddings = BGEEmbeddingService.getInstance();
