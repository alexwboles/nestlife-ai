// Local recipe bank — 36 family meals. No network needed.
(function () {
"use strict";

const RECIPES = [
  { id: 1, name: "Spaghetti Bolognese", diets: ["gluten-free-opt"], costPerServing: 1.80, timeMin: 40, ingredients: [
    { name: "Spaghetti", qty: 200, unit: "g", pricePerUnit: 0.004 },
    { name: "Ground beef", qty: 400, unit: "g", pricePerUnit: 0.012 },
    { name: "Canned tomatoes", qty: 2, unit: "can", pricePerUnit: 1.1 },
    { name: "Onion", qty: 1, unit: "pc", pricePerUnit: 0.5 } ] },
  { id: 2, name: "Veggie Stir-Fry with Rice", diets: ["vegetarian","vegan","gluten-free"], costPerServing: 1.40, timeMin: 25, ingredients: [
    { name: "Rice", qty: 300, unit: "g", pricePerUnit: 0.003 },
    { name: "Frozen stir-fry veg", qty: 500, unit: "g", pricePerUnit: 0.004 },
    { name: "Soy sauce", qty: 1, unit: "bottle", pricePerUnit: 2.0 },
    { name: "Sesame oil", qty: 1, unit: "bottle", pricePerUnit: 3.5 } ] },
  { id: 3, name: "Chicken Fajitas", diets: ["gluten-free"], costPerServing: 2.20, timeMin: 30, ingredients: [
    { name: "Chicken breast", qty: 600, unit: "g", pricePerUnit: 0.011 },
    { name: "Bell peppers", qty: 3, unit: "pc", pricePerUnit: 0.8 },
    { name: "Onion", qty: 1, unit: "pc", pricePerUnit: 0.5 },
    { name: "Tortillas", qty: 8, unit: "pc", pricePerUnit: 0.25 } ] },
  { id: 4, name: "Lentil Soup", diets: ["vegetarian","vegan","gluten-free"], costPerServing: 0.90, timeMin: 45, ingredients: [
    { name: "Red lentils", qty: 300, unit: "g", pricePerUnit: 0.003 },
    { name: "Carrots", qty: 3, unit: "pc", pricePerUnit: 0.3 },
    { name: "Onion", qty: 1, unit: "pc", pricePerUnit: 0.5 },
    { name: "Vegetable stock", qty: 1, unit: "L", pricePerUnit: 1.2 } ] },
  { id: 5, name: "Margherita Pizza (homemade)", diets: ["vegetarian"], costPerServing: 1.60, timeMin: 50, ingredients: [
    { name: "Pizza dough", qty: 2, unit: "pc", pricePerUnit: 1.5 },
    { name: "Mozzarella", qty: 250, unit: "g", pricePerUnit: 0.012 },
    { name: "Pizza sauce", qty: 1, unit: "jar", pricePerUnit: 2.0 } ] },
  { id: 6, name: "Beef Tacos", diets: ["gluten-free"], costPerServing: 2.00, timeMin: 25, ingredients: [
    { name: "Ground beef", qty: 500, unit: "g", pricePerUnit: 0.012 },
    { name: "Taco shells", qty: 12, unit: "pc", pricePerUnit: 0.2 },
    { name: "Lettuce", qty: 1, unit: "head", pricePerUnit: 1.2 },
    { name: "Cheddar", qty: 150, unit: "g", pricePerUnit: 0.01 } ] },
  { id: 7, name: "Chickpea Curry", diets: ["vegetarian","vegan","gluten-free"], costPerServing: 1.30, timeMin: 35, ingredients: [
    { name: "Chickpeas", qty: 2, unit: "can", pricePerUnit: 0.9 },
    { name: "Coconut milk", qty: 1, unit: "can", pricePerUnit: 1.8 },
    { name: "Rice", qty: 300, unit: "g", pricePerUnit: 0.003 },
    { name: "Curry powder", qty: 1, unit: "jar", pricePerUnit: 3.0 } ] },
  { id: 8, name: "Baked Salmon & Roast Veg", diets: ["gluten-free"], costPerServing: 3.40, timeMin: 35, ingredients: [
    { name: "Salmon fillets", qty: 4, unit: "pc", pricePerUnit: 3.0 },
    { name: "Potatoes", qty: 800, unit: "g", pricePerUnit: 0.002 },
    { name: "Broccoli", qty: 1, unit: "head", pricePerUnit: 1.5 } ] },
  { id: 9, name: "Mac and Cheese", diets: ["vegetarian"], costPerServing: 1.50, timeMin: 30, ingredients: [
    { name: "Macaroni", qty: 400, unit: "g", pricePerUnit: 0.004 },
    { name: "Cheddar", qty: 200, unit: "g", pricePerUnit: 0.01 },
    { name: "Milk", qty: 1, unit: "L", pricePerUnit: 1.1 },
    { name: "Butter", qty: 50, unit: "g", pricePerUnit: 0.01 } ] },
  { id: 10, name: "Black Bean Burrito Bowls", diets: ["vegetarian","gluten-free"], costPerServing: 1.70, timeMin: 25, ingredients: [
    { name: "Black beans", qty: 2, unit: "can", pricePerUnit: 0.9 },
    { name: "Rice", qty: 300, unit: "g", pricePerUnit: 0.003 },
    { name: "Corn", qty: 1, unit: "can", pricePerUnit: 1.0 },
    { name: "Avocado", qty: 2, unit: "pc", pricePerUnit: 1.2 } ] },
  { id: 11, name: "Shepherd's Pie", diets: [], costPerServing: 2.10, timeMin: 55, ingredients: [
    { name: "Ground beef", qty: 500, unit: "g", pricePerUnit: 0.012 },
    { name: "Potatoes", qty: 1, unit: "kg", pricePerUnit: 1.8 },
    { name: "Frozen peas & carrots", qty: 300, unit: "g", pricePerUnit: 0.004 } ] },
  { id: 12, name: "Pad Thai (veggie)", diets: ["vegetarian","gluten-free"], costPerServing: 2.00, timeMin: 30, ingredients: [
    { name: "Rice noodles", qty: 300, unit: "g", pricePerUnit: 0.006 },
    { name: "Eggs", qty: 4, unit: "pc", pricePerUnit: 0.25 },
    { name: "Bean sprouts", qty: 200, unit: "g", pricePerUnit: 0.005 },
    { name: "Peanuts", qty: 100, unit: "g", pricePerUnit: 0.008 } ] },
  { id: 13, name: "Chicken Noodle Soup", diets: [], costPerServing: 1.60, timeMin: 50, ingredients: [
    { name: "Chicken thighs", qty: 500, unit: "g", pricePerUnit: 0.009 },
    { name: "Egg noodles", qty: 200, unit: "g", pricePerUnit: 0.005 },
    { name: "Carrots", qty: 3, unit: "pc", pricePerUnit: 0.3 },
    { name: "Chicken stock", qty: 1.5, unit: "L", pricePerUnit: 1.2 } ] },
  { id: 14, name: "Veggie Chili", diets: ["vegetarian","vegan","gluten-free"], costPerServing: 1.20, timeMin: 40, ingredients: [
    { name: "Kidney beans", qty: 2, unit: "can", pricePerUnit: 0.9 },
    { name: "Canned tomatoes", qty: 2, unit: "can", pricePerUnit: 1.1 },
    { name: "Onion", qty: 1, unit: "pc", pricePerUnit: 0.5 },
    { name: "Corn", qty: 1, unit: "can", pricePerUnit: 1.0 } ] },
  { id: 15, name: "Pancakes + Fruit", diets: ["vegetarian"], costPerServing: 1.00, timeMin: 20, ingredients: [
    { name: "Flour", qty: 300, unit: "g", pricePerUnit: 0.002 },
    { name: "Eggs", qty: 3, unit: "pc", pricePerUnit: 0.25 },
    { name: "Milk", qty: 0.5, unit: "L", pricePerUnit: 1.1 },
    { name: "Bananas", qty: 4, unit: "pc", pricePerUnit: 0.4 } ] },
  { id: 16, name: "Teriyaki Chicken & Rice", diets: [], costPerServing: 2.30, timeMin: 30, ingredients: [
    { name: "Chicken breast", qty: 600, unit: "g", pricePerUnit: 0.011 },
    { name: "Rice", qty: 300, unit: "g", pricePerUnit: 0.003 },
    { name: "Teriyaki sauce", qty: 1, unit: "bottle", pricePerUnit: 2.5 },
    { name: "Broccoli", qty: 1, unit: "head", pricePerUnit: 1.5 } ] },
  { id: 17, name: "Quinoa Buddha Bowl", diets: ["vegetarian","vegan","gluten-free"], costPerServing: 2.40, timeMin: 30, ingredients: [
    { name: "Quinoa", qty: 250, unit: "g", pricePerUnit: 0.009 },
    { name: "Sweet potato", qty: 2, unit: "pc", pricePerUnit: 0.7 },
    { name: "Kale", qty: 200, unit: "g", pricePerUnit: 0.006 },
    { name: "Tahini", qty: 1, unit: "jar", pricePerUnit: 4.0 } ] },
  { id: 18, name: "Lasagna", diets: ["vegetarian"], costPerServing: 2.20, timeMin: 60, ingredients: [
    { name: "Lasagna sheets", qty: 250, unit: "g", pricePerUnit: 0.006 },
    { name: "Ricotta", qty: 400, unit: "g", pricePerUnit: 0.009 },
    { name: "Canned tomatoes", qty: 2, unit: "can", pricePerUnit: 1.1 },
    { name: "Mozzarella", qty: 200, unit: "g", pricePerUnit: 0.012 } ] },
  { id: 19, name: "Fried Rice (egg)", diets: ["vegetarian","gluten-free"], costPerServing: 1.10, timeMin: 20, ingredients: [
    { name: "Rice", qty: 400, unit: "g", pricePerUnit: 0.003 },
    { name: "Eggs", qty: 4, unit: "pc", pricePerUnit: 0.25 },
    { name: "Frozen peas", qty: 200, unit: "g", pricePerUnit: 0.004 },
    { name: "Soy sauce", qty: 1, unit: "bottle", pricePerUnit: 2.0 } ] },
  { id: 20, name: "Grilled Cheese & Tomato Soup", diets: ["vegetarian"], costPerServing: 1.70, timeMin: 25, ingredients: [
    { name: "Bread", qty: 1, unit: "loaf", pricePerUnit: 2.5 },
    { name: "Cheddar", qty: 200, unit: "g", pricePerUnit: 0.01 },
    { name: "Tomato soup", qty: 2, unit: "can", pricePerUnit: 1.2 },
    { name: "Butter", qty: 50, unit: "g", pricePerUnit: 0.01 } ] },
  { id: 21, name: "Beef Stroganoff", diets: [], costPerServing: 2.80, timeMin: 40, ingredients: [
    { name: "Beef strips", qty: 500, unit: "g", pricePerUnit: 0.014 },
    { name: "Mushrooms", qty: 250, unit: "g", pricePerUnit: 0.008 },
    { name: "Sour cream", qty: 200, unit: "g", pricePerUnit: 0.008 },
    { name: "Egg noodles", qty: 300, unit: "g", pricePerUnit: 0.005 } ] },
  { id: 22, name: "Tofu Fried Noodles", diets: ["vegetarian","vegan"], costPerServing: 1.50, timeMin: 25, ingredients: [
    { name: "Firm tofu", qty: 400, unit: "g", pricePerUnit: 0.006 },
    { name: "Rice noodles", qty: 300, unit: "g", pricePerUnit: 0.006 },
    { name: "Frozen stir-fry veg", qty: 400, unit: "g", pricePerUnit: 0.004 } ] },
  { id: 23, name: "Roast Chicken Dinner", diets: ["gluten-free"], costPerServing: 2.60, timeMin: 75, ingredients: [
    { name: "Whole chicken", qty: 1.5, unit: "kg", pricePerUnit: 6.5 },
    { name: "Potatoes", qty: 800, unit: "g", pricePerUnit: 0.002 },
    { name: "Carrots", qty: 4, unit: "pc", pricePerUnit: 0.3 } ] },
  { id: 24, name: "Greek Salad Wraps", diets: ["vegetarian"], costPerServing: 1.90, timeMin: 15, ingredients: [
    { name: "Tortillas", qty: 8, unit: "pc", pricePerUnit: 0.25 },
    { name: "Feta", qty: 200, unit: "g", pricePerUnit: 0.011 },
    { name: "Cucumber", qty: 1, unit: "pc", pricePerUnit: 0.8 },
    { name: "Cherry tomatoes", qty: 300, unit: "g", pricePerUnit: 0.006 } ] },
  { id: 25, name: "Pork Fried Rice", diets: [], costPerServing: 1.90, timeMin: 25, ingredients: [
    { name: "Pork loin", qty: 400, unit: "g", pricePerUnit: 0.01 },
    { name: "Rice", qty: 400, unit: "g", pricePerUnit: 0.003 },
    { name: "Frozen peas", qty: 200, unit: "g", pricePerUnit: 0.004 },
    { name: "Eggs", qty: 2, unit: "pc", pricePerUnit: 0.25 } ] },
  { id: 26, name: "Minestrone", diets: ["vegetarian","vegan"], costPerServing: 1.10, timeMin: 45, ingredients: [
    { name: "Small pasta", qty: 150, unit: "g", pricePerUnit: 0.005 },
    { name: "Canned tomatoes", qty: 1, unit: "can", pricePerUnit: 1.1 },
    { name: "Cannellini beans", qty: 1, unit: "can", pricePerUnit: 0.9 },
    { name: "Vegetable stock", qty: 1, unit: "L", pricePerUnit: 1.2 } ] },
  { id: 27, name: "Baked Ziti", diets: ["vegetarian"], costPerServing: 1.80, timeMin: 45, ingredients: [
    { name: "Ziti pasta", qty: 400, unit: "g", pricePerUnit: 0.004 },
    { name: "Marinara sauce", qty: 1, unit: "jar", pricePerUnit: 2.2 },
    { name: "Mozzarella", qty: 250, unit: "g", pricePerUnit: 0.012 },
    { name: "Parmesan", qty: 50, unit: "g", pricePerUnit: 0.02 } ] },
  { id: 28, name: "Fish Tacos", diets: [], costPerServing: 2.70, timeMin: 30, ingredients: [
    { name: "White fish fillets", qty: 500, unit: "g", pricePerUnit: 0.012 },
    { name: "Tortillas", qty: 8, unit: "pc", pricePerUnit: 0.25 },
    { name: "Cabbage slaw", qty: 300, unit: "g", pricePerUnit: 0.004 },
    { name: "Lime", qty: 2, unit: "pc", pricePerUnit: 0.4 } ] },
  { id: 29, name: "Mushroom Risotto", diets: ["vegetarian","gluten-free"], costPerServing: 2.50, timeMin: 45, ingredients: [
    { name: "Arborio rice", qty: 300, unit: "g", pricePerUnit: 0.007 },
    { name: "Mushrooms", qty: 300, unit: "g", pricePerUnit: 0.008 },
    { name: "Parmesan", qty: 80, unit: "g", pricePerUnit: 0.02 },
    { name: "Vegetable stock", qty: 1, unit: "L", pricePerUnit: 1.2 } ] },
  { id: 30, name: "Chicken Quesadillas", diets: [], costPerServing: 2.10, timeMin: 20, ingredients: [
    { name: "Chicken breast", qty: 400, unit: "g", pricePerUnit: 0.011 },
    { name: "Tortillas", qty: 8, unit: "pc", pricePerUnit: 0.25 },
    { name: "Cheddar", qty: 200, unit: "g", pricePerUnit: 0.01 },
    { name: "Salsa", qty: 1, unit: "jar", pricePerUnit: 2.5 } ] },
  { id: 31, name: "Lentil Bolognese", diets: ["vegetarian","vegan"], costPerServing: 1.20, timeMin: 40, ingredients: [
    { name: "Spaghetti", qty: 300, unit: "g", pricePerUnit: 0.004 },
    { name: "Red lentils", qty: 200, unit: "g", pricePerUnit: 0.003 },
    { name: "Canned tomatoes", qty: 2, unit: "can", pricePerUnit: 1.1 },
    { name: "Onion", qty: 1, unit: "pc", pricePerUnit: 0.5 } ] },
  { id: 32, name: "Sausage & Peppers", diets: ["gluten-free"], costPerServing: 2.40, timeMin: 35, ingredients: [
    { name: "Italian sausage", qty: 600, unit: "g", pricePerUnit: 0.009 },
    { name: "Bell peppers", qty: 3, unit: "pc", pricePerUnit: 0.8 },
    { name: "Onion", qty: 2, unit: "pc", pricePerUnit: 0.5 },
    { name: "Rice", qty: 300, unit: "g", pricePerUnit: 0.003 } ] },
  { id: 33, name: "Tomato Basil Pasta", diets: ["vegetarian"], costPerServing: 1.30, timeMin: 20, ingredients: [
    { name: "Penne", qty: 400, unit: "g", pricePerUnit: 0.004 },
    { name: "Canned tomatoes", qty: 2, unit: "can", pricePerUnit: 1.1 },
    { name: "Fresh basil", qty: 1, unit: "bunch", pricePerUnit: 1.5 },
    { name: "Parmesan", qty: 50, unit: "g", pricePerUnit: 0.02 } ] },
  { id: 34, name: "Stuffed Peppers (quinoa)", diets: ["vegetarian","vegan","gluten-free"], costPerServing: 2.20, timeMin: 50, ingredients: [
    { name: "Bell peppers", qty: 4, unit: "pc", pricePerUnit: 0.8 },
    { name: "Quinoa", qty: 200, unit: "g", pricePerUnit: 0.009 },
    { name: "Black beans", qty: 1, unit: "can", pricePerUnit: 0.9 },
    { name: "Corn", qty: 1, unit: "can", pricePerUnit: 1.0 } ] },
  { id: 35, name: "Chicken Pot Pie", diets: [], costPerServing: 2.50, timeMin: 60, ingredients: [
    { name: "Chicken thighs", qty: 500, unit: "g", pricePerUnit: 0.009 },
    { name: "Pie crust", qty: 2, unit: "pc", pricePerUnit: 1.8 },
    { name: "Frozen mixed veg", qty: 400, unit: "g", pricePerUnit: 0.004 },
    { name: "Milk", qty: 0.5, unit: "L", pricePerUnit: 1.1 } ] },
  { id: 36, name: "Ramen Night (DIY bowls)", diets: [], costPerServing: 1.80, timeMin: 25, ingredients: [
    { name: "Ramen noodles", qty: 4, unit: "pack", pricePerUnit: 0.6 },
    { name: "Eggs", qty: 4, unit: "pc", pricePerUnit: 0.25 },
    { name: "Baby spinach", qty: 200, unit: "g", pricePerUnit: 0.006 },
    { name: "Soy sauce", qty: 1, unit: "bottle", pricePerUnit: 2.0 } ] }
];

if (typeof window !== "undefined") window.NestLifeRecipes = RECIPES;
if (typeof module !== "undefined" && module.exports) module.exports = RECIPES;

})();
