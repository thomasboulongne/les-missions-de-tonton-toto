import { create } from "zustand";

export interface SvgBannerElements {
  arc: Element;
  decorations: Element[];
}

export interface HeadingElements {
  topLine: HTMLElement;
  bottomLineChars: HTMLElement[];
}

export interface AnimationElements {
  svgBanner: SvgBannerElements | null;
  heading: HeadingElements | null;
  subtitle: HTMLElement | null;
  missionCard: HTMLElement | null;
  loadingState: HTMLElement | null;
  noMissionState: HTMLElement | null;
}

interface AnimationStore {
  elements: AnimationElements;
  register: <K extends keyof AnimationElements>(
    key: K,
    value: AnimationElements[K]
  ) => void;
  unregister: (key: keyof AnimationElements) => void;
  reset: () => void;
}

const initialElements: AnimationElements = {
  svgBanner: null,
  heading: null,
  subtitle: null,
  missionCard: null,
  loadingState: null,
  noMissionState: null,
};

export const useAnimationStore = create<AnimationStore>((set) => ({
  elements: { ...initialElements },

  register: (key, value) =>
    set((state) => ({
      elements: { ...state.elements, [key]: value },
    })),

  unregister: (key) =>
    set((state) => ({
      elements: { ...state.elements, [key]: null },
    })),

  reset: () => set({ elements: { ...initialElements } }),
}));
