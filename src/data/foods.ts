import type { Food } from "@/types";

// Indian-focused food database. Macros are practical per-serving estimates.
export const FOODS: Food[] = [
  // ---- Protein staples ----
  { name: "Whey Protein Scoop", per: "1 scoop (30g)", kcal: 120, protein: 24, carbs: 3, fat: 1.5, tags: ["protein"] },
  { name: "Chicken Breast (cooked)", per: "100g", kcal: 165, protein: 31, carbs: 0, fat: 3.6, tags: ["protein", "nonveg"] },
  { name: "Egg (whole)", per: "1 large", kcal: 78, protein: 6.3, carbs: 0.6, fat: 5.3, tags: ["protein"] },
  { name: "Egg White", per: "1 white", kcal: 17, protein: 3.6, carbs: 0.2, fat: 0.1, tags: ["protein"] },
  { name: "Paneer", per: "100g", kcal: 265, protein: 18, carbs: 3.4, fat: 20, tags: ["protein", "veg"] },
  { name: "Low-Fat Paneer", per: "100g", kcal: 160, protein: 22, carbs: 4, fat: 6, tags: ["protein", "veg"] },
  { name: "Tofu", per: "100g", kcal: 144, protein: 16, carbs: 2.8, fat: 8, tags: ["protein", "veg", "vegan"] },
  { name: "Soya Chunks (dry)", per: "50g", kcal: 172, protein: 26, carbs: 16, fat: 0.5, tags: ["protein", "veg"] },
  { name: "Greek Yogurt", per: "100g", kcal: 59, protein: 10, carbs: 3.6, fat: 0.4, tags: ["protein"] },
  { name: "Curd / Dahi", per: "100g", kcal: 98, protein: 11, carbs: 4.7, fat: 4.3, tags: ["protein", "veg"] },
  { name: "Fish (Rohu, cooked)", per: "100g", kcal: 97, protein: 17, carbs: 0, fat: 3, tags: ["protein", "nonveg"] },
  { name: "Mutton (cooked)", per: "100g", kcal: 250, protein: 26, carbs: 0, fat: 16, tags: ["protein", "nonveg"] },
  { name: "Whey Isolate Scoop", per: "1 scoop (30g)", kcal: 110, protein: 27, carbs: 1, fat: 0.5, tags: ["protein"] },

  // ---- Legumes / dals ----
  { name: "Dal (cooked, mixed)", per: "1 katori (150g)", kcal: 150, protein: 9, carbs: 20, fat: 3, tags: ["veg"] },
  { name: "Rajma (cooked)", per: "1 katori (150g)", kcal: 170, protein: 10, carbs: 28, fat: 1, tags: ["veg"] },
  { name: "Chana / Chole (cooked)", per: "1 katori (150g)", kcal: 210, protein: 11, carbs: 30, fat: 4, tags: ["veg"] },
  { name: "Moong Dal Sprouts", per: "100g", kcal: 100, protein: 9, carbs: 16, fat: 0.5, tags: ["veg"] },

  // ---- Grains / carbs ----
  { name: "Roti / Chapati", per: "1 medium", kcal: 104, protein: 3, carbs: 18, fat: 2.5, tags: ["veg", "carb"] },
  { name: "Cooked White Rice", per: "1 katori (150g)", kcal: 200, protein: 4, carbs: 44, fat: 0.4, tags: ["veg", "carb"] },
  { name: "Cooked Brown Rice", per: "1 katori (150g)", kcal: 165, protein: 3.5, carbs: 34, fat: 1.3, tags: ["veg", "carb"] },
  { name: "Oats (dry)", per: "40g", kcal: 152, protein: 5.4, carbs: 27, fat: 2.8, tags: ["veg", "carb"] },
  { name: "Poha (cooked)", per: "1 plate", kcal: 250, protein: 5, carbs: 45, fat: 6, tags: ["veg", "carb"] },
  { name: "Idli", per: "1 piece", kcal: 58, protein: 2, carbs: 12, fat: 0.4, tags: ["veg", "carb"] },
  { name: "Dosa (plain)", per: "1 medium", kcal: 133, protein: 3, carbs: 22, fat: 3.7, tags: ["veg", "carb"] },
  { name: "Upma", per: "1 plate", kcal: 250, protein: 6, carbs: 40, fat: 8, tags: ["veg", "carb"] },
  { name: "Bread Slice (brown)", per: "1 slice", kcal: 75, protein: 3, carbs: 13, fat: 1, tags: ["veg", "carb"] },
  { name: "Banana", per: "1 medium", kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, tags: ["fruit"] },
  { name: "Apple", per: "1 medium", kcal: 95, protein: 0.5, carbs: 25, fat: 0.3, tags: ["fruit"] },
  { name: "Sweet Potato (boiled)", per: "100g", kcal: 86, protein: 1.6, carbs: 20, fat: 0.1, tags: ["veg", "carb"] },

  // ---- Veg / curries ----
  { name: "Mixed Veg Sabzi", per: "1 katori (150g)", kcal: 120, protein: 4, carbs: 14, fat: 6, tags: ["veg"] },
  { name: "Palak Paneer", per: "1 katori (150g)", kcal: 230, protein: 11, carbs: 9, fat: 17, tags: ["veg"] },
  { name: "Chicken Curry", per: "1 katori (150g)", kcal: 240, protein: 20, carbs: 6, fat: 15, tags: ["nonveg"] },
  { name: "Salad (no dressing)", per: "1 bowl", kcal: 40, protein: 2, carbs: 8, fat: 0.3, tags: ["veg"] },

  // ---- Fats / nuts ----
  { name: "Almonds", per: "10 pieces", kcal: 70, protein: 2.6, carbs: 2.5, fat: 6, tags: ["fat"] },
  { name: "Peanut Butter", per: "1 tbsp (16g)", kcal: 94, protein: 4, carbs: 3, fat: 8, tags: ["fat"] },
  { name: "Ghee", per: "1 tsp (5g)", kcal: 45, protein: 0, carbs: 0, fat: 5, tags: ["fat"] },
  { name: "Olive Oil", per: "1 tsp (5ml)", kcal: 40, protein: 0, carbs: 0, fat: 4.5, tags: ["fat"] },
  { name: "Cooking Oil", per: "1 tsp (5ml)", kcal: 44, protein: 0, carbs: 0, fat: 5, tags: ["fat"] },

  // ---- Misc / snacks ----
  { name: "Milk (toned)", per: "1 glass (250ml)", kcal: 150, protein: 8, carbs: 12, fat: 8, tags: ["protein"] },
  { name: "Skim Milk", per: "1 glass (250ml)", kcal: 88, protein: 8.5, carbs: 12, fat: 0.2, tags: ["protein"] },
  { name: "Protein Bar", per: "1 bar", kcal: 200, protein: 20, carbs: 20, fat: 6, tags: ["protein"] },
  { name: "Boiled Chana (snack)", per: "1 bowl (100g)", kcal: 180, protein: 9, carbs: 27, fat: 3, tags: ["veg"] },
  { name: "Coffee (black)", per: "1 cup", kcal: 2, protein: 0.3, carbs: 0, fat: 0, tags: ["drink"] },
  { name: "Tea with Milk & Sugar", per: "1 cup", kcal: 90, protein: 2, carbs: 12, fat: 3.5, tags: ["drink"] },
];
