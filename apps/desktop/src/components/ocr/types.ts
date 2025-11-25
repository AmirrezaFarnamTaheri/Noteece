/**
 * OCR Types
 */

export interface OcrJob {
  id: string;
  space_id: string;
  image_path: string;
  status: OcrStatus;
  result_text?: string;
  confidence?: number;
  language?: string;
  created_at: number;
  processed_at?: number;
  error?: string;
}

export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface OcrResult {
  id: string;
  job_id: string;
  text: string;
  confidence: number;
  bounding_boxes: BoundingBox[];
  language: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence: number;
}

export const statusColors: Record<OcrStatus, string> = {
  pending: 'gray',
  processing: 'blue',
  completed: 'green',
  failed: 'red',
};
