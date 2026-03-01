export interface Theme {
  id: string;
  projectId: string;
  primaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  logoUrl: string | null;
  welcomeMessage: string;
  createdAt: Date;
  updatedAt: Date;
}
