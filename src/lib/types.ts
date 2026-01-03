export type CalendarType = "solar" | "lunar";
export type Gender = "male" | "female";

export type ZiweiInput = {
  calendarType: CalendarType;
  date: string;
  time: string;
  gender: Gender;
};

export type Palace = {
  name: string;
  mainStars: string[];
  subStars: string[];
  transforms: string[];
  decadeRange?: string;
};

export type ChartCenter = {
  name?: string;
  gender: Gender;
  solarDate?: string;
  lunarDate?: string;
  time: string;
  fatePalace?: string;
  bodyPalace?: string;
  fourTransforms?: string[];
};

export type ZiweiChart = {
  palaces: Palace[];
  center: ChartCenter;
};

export type KlinePoint = {
  age: number;
  luck: number;
  achievement?: number;
  confidence: number;
  drivers: string[];
};

export type Summary = {
  fatePalace?: string;
  bodyPalace?: string;
  fourTransforms?: string[];
  decadeRanges?: string[];
};

export type ChartResponse = {
  chart: ZiweiChart;
  kline: KlinePoint[];
  summary: Summary;
  scores?: {
    total: number;
    wealth: number;
    career: number;
    emotion: number;
    health: number;
  };
  klinePhases?: {
    rising: string[];
    falling: string[];
    stable: string;
  };
  analysisText?: string;
  warnings?: string[];
};

export type AnalysisTextResponse = {
  analysisText: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatContext = {
  chartSummary: {
    birth?: {
      solarDate?: string;
      lunarDate?: string;
      time?: string;
      gender?: string;
    };
    fatePalace?: string;
    bodyPalace?: string;
    careerPalace?: string;
    wealthPalace?: string;
    marriagePalace?: string;
    healthPalace?: string;
    fourTransforms?: string[];
    palaceFacts: string[];
  };
  scores: {
    total: number;
    wealth: number;
    career: number;
    emotion: number;
    health: number;
  };
  klinePhases: {
    rising: string[];
    falling: string[];
    stable: string;
  };
  kline?: KlinePoint[];
};

export type AnalysisTheme = {
  key: string;
  label: string;
  score: number;
  note: string;
};

export type AnalysisOverall = {
  totalLuck: number;
  volatility: number;
  upside: number;
  resilience: number;
};

export type AnalysisResponse = {
  overall: AnalysisOverall;
  themes: AnalysisTheme[];
};

