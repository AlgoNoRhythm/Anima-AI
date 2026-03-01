export type QRStyle = 'square' | 'dots' | 'rounded';
export type QRErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QRConfig {
  width: number;
  height: number;
  data: string;
  dotsStyle: QRStyle;
  dotsColor: string;
  backgroundColor: string;
  cornerSquareStyle: QRStyle;
  cornerSquareColor: string;
  cornerDotStyle: QRStyle;
  cornerDotColor: string;
  errorCorrectionLevel: QRErrorCorrectionLevel;
  logoUrl: string | null;
  logoSize: number;
}

export interface QRCode {
  id: string;
  projectId: string;
  config: QRConfig;
  createdAt: Date;
}
