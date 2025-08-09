import OpenAI from 'openai';
import { QdrantClient } from '@qdrant/js-client-rest';
import { z } from 'zod';

export type EmbeddingModel = 'text-embedding-3-small';

export interface SearchCoreOptions {
  openaiApiKey: string;
  qdrantUrl: string;
  model?: EmbeddingModel;
  collectionName?: string;
}

export class SearchCore {
  private readonly openai: OpenAI;
  private readonly qdrant: QdrantClient;
  private readonly embeddingModel: EmbeddingModel;
  private readonly collectionName: string;

  constructor(opts: SearchCoreOptions) {
    this.openai = new OpenAI({ apiKey: opts.openaiApiKey });
    this.qdrant = new QdrantClient({ url: opts.qdrantUrl });
    this.embeddingModel = opts.model ?? 'text-embedding-3-small';
    this.collectionName = opts.collectionName ?? 'transcript_segments';
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.openai.embeddings.create({
      input: text,
      model: this.embeddingModel,
    });
    return res.data[0].embedding as unknown as number[];
  }

  async searchByQuery(
    query: string,
    limit = 10
  ): Promise<Array<{ id: string; score: number; payload?: { episodeId?: number } }>> {
    const vector = await this.embed(query);
    const result = await this.qdrant.search(this.collectionName, {
      vector,
      limit,
    });
    return result as Array<{ id: string; score: number; payload?: { episodeId?: number } }>;
  }
}

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().min(1).max(50).default(10),
});


