export interface MenuItemModifier {
  id: string;
  name: string;
  additionalPrice: number;
}

export interface MenuItemModifierGroup {
  id: string;
  name: string;
  required: boolean;
  options: MenuItemModifier[];
}

export interface MenuItem {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  price: number;
  costPrice: number;
  description: string;
  isAvailable: boolean;
  station: 'barista' | 'kitchen' | 'bakery';
  dietaryTags?: string[];
  modifierGroups?: MenuItemModifierGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  iconName: string;
}

export const mockCategories: MenuCategory[] = [
  { id: 'cat_all', name: 'All Items', iconName: 'LayoutGrid' },
  { id: 'cat_coffee', name: 'Espresso & Coffee', iconName: 'Coffee' },
  { id: 'cat_cold_brew', name: 'Cold Brews', iconName: 'Snowflake' },
  { id: 'cat_tea', name: 'Specialty Teas', iconName: 'CupSoda' },
  { id: 'cat_bakery', name: 'Fresh Bakery', iconName: 'Croissant' },
  { id: 'cat_kitchen', name: 'Kitchen & Brunch', iconName: 'Utensils' },
];

export const mockMenuItems: MenuItem[] = [
  {
    id: 'item_flat_white',
    name: 'Flat White',
    sku: 'BEV-FW-01',
    categoryId: 'cat_coffee',
    price: 4.75,
    costPrice: 0.95,
    description: 'Double ristretto with micro-foamed whole milk',
    isAvailable: true,
    station: 'barista',
    dietaryTags: ['Vegetarian'],
    modifierGroups: [
      {
        id: 'mod_milk',
        name: 'Milk Choice',
        required: true,
        options: [
          { id: 'm_whole', name: 'Whole Milk', additionalPrice: 0.0 },
          { id: 'm_oat', name: 'Oat Milk (Oatly)', additionalPrice: 0.75 },
          { id: 'm_almond', name: 'Almond Milk', additionalPrice: 0.75 },
          { id: 'm_skim', name: 'Skim Milk', additionalPrice: 0.0 },
        ],
      },
      {
        id: 'mod_shots',
        name: 'Espresso Shots',
        required: false,
        options: [
          { id: 's_extra', name: 'Extra Double Shot', additionalPrice: 1.25 },
          { id: 's_decaf', name: 'Decaf Swiss Water', additionalPrice: 0.5 },
        ],
      },
    ],
  },
  {
    id: 'item_latte',
    name: 'Vanilla Cardamom Latte',
    sku: 'BEV-LAT-02',
    categoryId: 'cat_coffee',
    price: 5.5,
    costPrice: 1.2,
    description: 'House-infused cardamom syrup, espresso, steamed milk',
    isAvailable: true,
    station: 'barista',
    dietaryTags: ['Vegetarian'],
    modifierGroups: [
      {
        id: 'mod_milk',
        name: 'Milk Choice',
        required: true,
        options: [
          { id: 'm_whole', name: 'Whole Milk', additionalPrice: 0.0 },
          { id: 'm_oat', name: 'Oat Milk', additionalPrice: 0.75 },
        ],
      },
    ],
  },
  {
    id: 'item_cappuccino',
    name: 'Traditional Cappuccino',
    sku: 'BEV-CAP-03',
    categoryId: 'cat_coffee',
    price: 4.5,
    costPrice: 0.85,
    description: 'Equal thirds espresso, steamed milk, dense velvety foam',
    isAvailable: true,
    station: 'barista',
  },
  {
    id: 'item_nitro_cold_brew',
    name: 'Nitro Cold Brew',
    sku: 'BEV-NCB-04',
    categoryId: 'cat_cold_brew',
    price: 5.25,
    costPrice: 0.9,
    description: '18-hour cold steeped single-origin, infused with pure nitrogen',
    isAvailable: true,
    station: 'barista',
    dietaryTags: ['Vegan', 'Gluten-Free'],
  },
  {
    id: 'item_matcha_latte',
    name: 'Ceremonial Matcha Latte',
    sku: 'BEV-MTC-05',
    categoryId: 'cat_tea',
    price: 5.75,
    costPrice: 1.4,
    description: 'Uji stone-ground ceremonial matcha with textured milk',
    isAvailable: true,
    station: 'barista',
    dietaryTags: ['Vegetarian', 'Antioxidant'],
  },
  {
    id: 'item_croissant',
    name: 'Butter Croissant',
    sku: 'BAK-CRS-06',
    categoryId: 'cat_bakery',
    price: 4.25,
    costPrice: 1.1,
    description: 'Classic laminated butter croissant, baked fresh daily',
    isAvailable: true,
    station: 'bakery',
    dietaryTags: ['Vegetarian'],
  },
  {
    id: 'item_almond_croissant',
    name: 'Twice-Baked Almond Croissant',
    sku: 'BAK-ALM-07',
    categoryId: 'cat_bakery',
    price: 5.5,
    costPrice: 1.6,
    description: 'Filled with rich frangipane, topped with toasted sliced almonds',
    isAvailable: true,
    station: 'bakery',
    dietaryTags: ['Vegetarian', 'Contains Nuts'],
  },
  {
    id: 'item_avo_toast',
    name: 'Smoked Salmon Avocado Toast',
    sku: 'KIT-AVO-08',
    categoryId: 'cat_kitchen',
    price: 13.5,
    costPrice: 3.8,
    description: 'Toasted organic sourdough, smashed avocado, Norwegian smoked salmon, pickled shallots',
    isAvailable: true,
    station: 'kitchen',
    dietaryTags: ['Dairy-Free'],
  },
  {
    id: 'item_breakfast_burrito',
    name: 'Craft Breakfast Burrito',
    sku: 'KIT-BUR-09',
    categoryId: 'cat_kitchen',
    price: 11.75,
    costPrice: 3.1,
    description: 'Scrambled pasture eggs, aged cheddar, chorizo, crispy potatoes, charred salsa',
    isAvailable: true,
    station: 'kitchen',
  },
  {
    id: 'item_shakshuka',
    name: 'Spiced Tomato Shakshuka',
    sku: 'KIT-SHK-10',
    categoryId: 'cat_kitchen',
    price: 12.5,
    costPrice: 2.9,
    description: 'Poached farm eggs in rich harissa-spiced bell pepper ragout with warm focaccia',
    isAvailable: false, // Out of stock example
    station: 'kitchen',
    dietaryTags: ['Vegetarian'],
  },
];
