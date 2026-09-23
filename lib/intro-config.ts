export type ShowIntroMode = "every-visit" | "session" | "first";

export const SHOW_INTRO_MODE: ShowIntroMode =
  (process.env.NEXT_PUBLIC_SHOW_INTRO_MODE as ShowIntroMode | undefined) ?? "session";
