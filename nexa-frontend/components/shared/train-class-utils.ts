export const TRAIN_CLASS_DISPLAY_LIST = ["All Class", "Sleeper Class", "Third AC", "Second AC", "First AC"] as const;

const DISPLAY_TO_API_CLASS_TYPE: Record<string, string> = {
  "Sleeper Class": "Sleeper",
  "Second AC": "SecondAC",
  "Third AC": "ThirdAC",
};

const API_CLASS_TYPE_TO_DISPLAY: Record<string, string> = {
  Sleeper: "Sleeper Class",
  SecondAC: "Second AC",
  ThirdAC: "Third AC",
};

export const mapDisplayClassToApiClassType = (displayClass: string): string | undefined =>
  DISPLAY_TO_API_CLASS_TYPE[displayClass];

export const mapApiClassTypeToDisplay = (apiClassType?: string | null): string => {
  if (!apiClassType) return "All Class";
  return API_CLASS_TYPE_TO_DISPLAY[apiClassType] ?? "All Class";
};
