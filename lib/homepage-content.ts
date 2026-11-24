export const homepageContentKeys = [
  "trinity_story_eyebrow",
  "trinity_story_title",
  "trinity_story_emphasis",
  "trinity_story_text",
  "trinity_story_link",
  "gift_finder_eyebrow",
  "gift_finder_title",
  "gift_finder_text",
  "gift_finder_button",
  "final_cta_eyebrow",
  "final_cta_title",
  "final_cta_text",
  "final_cta_button",
] as const;

export type HomepageContentKey = (typeof homepageContentKeys)[number];
export type HomepageContent = Record<HomepageContentKey, string>;

export const homepageContentDefaults: HomepageContent = {
  trinity_story_eyebrow: "The Trinity story",
  trinity_story_title: "More than a gift.",
  trinity_story_emphasis: "A meaning.",
  trinity_story_text: "Trinity is built around the idea that the best gifts do more than look beautiful. They remember a person, honor a milestone, or keep faith close to the heart.",
  trinity_story_link: "Discover our story",
  gift_finder_eyebrow: "Not sure what to give?",
  gift_finder_title: "Let meaning guide you.",
  gift_finder_text: "Tell us who you are gifting for and what you are celebrating. Our Gift Finder will narrow the collection for you.",
  gift_finder_button: "Start Gift Finder",
  final_cta_eyebrow: "Give with meaning",
  final_cta_title: "Find a gift worth remembering.",
  final_cta_text: "Explore thoughtful gifts for the people and moments that matter most.",
  final_cta_button: "Explore gifts",
};
