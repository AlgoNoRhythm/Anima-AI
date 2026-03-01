export interface DoclingSection {
  title: string | null;
  text: string;
  bbox: { l: number; t: number; r: number; b: number } | null;
}

export interface DoclingTable {
  markdown: string;
  bbox: { l: number; t: number; r: number; b: number } | null;
}

export interface DoclingPage {
  page_number: number;
  sections: DoclingSection[];
  tables: DoclingTable[];
}

export interface DoclingOutput {
  pages: DoclingPage[];
  total_pages: number;
  filename: string;
}
