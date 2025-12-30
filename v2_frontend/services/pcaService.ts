
import { PCA } from 'ml-pca';

export class PcaAnomalyService {
  private size = 64; // Low res for performance
  private pca: PCA | null = null;
  private meanVector: number[] = [];

  private async imageToVector(base64: string): Promise<number[]> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = this.size;
        canvas.height = this.size;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, this.size, this.size);
        const data = ctx.getImageData(0, 0, this.size, this.size).data;
        const vector: number[] = [];
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          vector.push(gray / 255.0);
        }
        resolve(vector);
      };
      img.src = base64;
    });
  }

  async train(snapshots: string[]) {
    if (snapshots.length < 5) return;
    const vectors = await Promise.all(snapshots.map(s => this.imageToVector(s)));
    
    // Calculate mean vector for manual reconstruction logic if needed, 
    // but ML-PCA handles centering usually.
    this.pca = new PCA(vectors);
    
    // Store mean for error calculation
    this.meanVector = vectors[0].map((_, i) => 
      vectors.reduce((sum, v) => sum + v[i], 0) / vectors.length
    );
  }

  async getAnomalyScore(base64: string): Promise<{ score: number; details: string }> {
    if (!this.pca) return { score: 0, details: "Model not trained" };

    const vector = await this.imageToVector(base64);
    
    // Project into face space (low dimensionality)
    const projection = this.pca.predict([vector]).toArray()[0];
    
    // Reconstruct back to original dimensionality
    const reconstructed = this.pca.invert([projection]).toArray()[0];

    // Calculate Reconstruction Error (L2 Norm)
    // Higher error means the input doesn't "fit" the trained space (Anomaly)
    let error = 0;
    for (let i = 0; i < vector.length; i++) {
      error += Math.pow(vector[i] - reconstructed[i], 2);
    }
    const score = Math.sqrt(error) / 10; // Normalized roughly

    return {
      score,
      details: `Reconstruction Error: ${score.toFixed(4)}. Feature variance captured: ${(this.pca.getExplainedVariance()[0] * 100).toFixed(2)}%`
    };
  }
}

export const pcaService = new PcaAnomalyService();
