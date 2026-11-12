import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { Banner } from '../models/Banner.js';
import { Category } from '../models/Category.js';
import { Coupon } from '../models/Coupon.js';
import { DeliveryZone } from '../models/DeliveryZone.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { Setting } from '../models/Setting.js';
import { Subscriber } from '../models/Subscriber.js';
import { User } from '../models/User.js';
import { computeAvailability } from '../services/catalogService.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const opt = (value, en, bn) => ({ value, label: { en, bn } });
const fishFields = [
  { key: 'species', label: { en: 'Species', bn: 'প্রজাতি' }, type: 'text', required: true, filterable: false, options: [] },
  {
    key: 'freshness',
    label: { en: 'Freshness', bn: 'টাটকা অবস্থা' },
    type: 'select',
    required: true,
    filterable: true,
    options: [opt('fresh', 'Fresh', 'টাটকা'), opt('chilled', 'Chilled', 'ঠান্ডা করা'), opt('live', 'Live', 'জীবিত')],
  },
  { key: 'origin', label: { en: 'Origin', bn: 'উৎস' }, type: 'text', required: true, filterable: false, options: [] },
  {
    key: 'storage',
    label: { en: 'Storage', bn: 'সংরক্ষণ' },
    type: 'select',
    required: true,
    filterable: true,
    options: [opt('ice', 'On ice', 'বরফে'), opt('frozen', 'Frozen', 'হিমায়িত'), opt('live-tank', 'Live tank', 'লাইভ ট্যাংক')],
  },
  {
    key: 'cut',
    label: { en: 'Cut', bn: 'কাটা' },
    type: 'select',
    required: false,
    filterable: true,
    options: [opt('whole', 'Whole', 'আস্ত'), opt('cleaned', 'Cleaned', 'পরিষ্কার'), opt('sliced', 'Sliced', 'স্লাইস'), opt('fillet', 'Fillet', 'ফিলে')],
  },
];
const premiumFields = [
  ...fishFields,
  {
    key: 'grade',
    label: { en: 'Grade', bn: 'গ্রেড' },
    type: 'select',
    required: true,
    filterable: true,
    options: [opt('export', 'Export', 'রপ্তানি'), opt('a', 'Grade A', 'গ্রেড এ'), opt('b', 'Grade B', 'গ্রেড বি')],
  },
];
const frozenFields = [
  { key: 'species', label: { en: 'Species', bn: 'প্রজাতি' }, type: 'text', required: true, options: [] },
  { key: 'origin', label: { en: 'Origin', bn: 'উৎস' }, type: 'text', required: true, options: [] },
  { key: 'packaging', label: { en: 'Packaging', bn: 'প্যাকেজিং' }, type: 'text', required: true, options: [] },
  { key: 'expiryDate', label: { en: 'Best before', bn: 'সর্বোত্তম ব্যবহার' }, type: 'text', required: true, options: [] },
  {
    key: 'cut',
    label: { en: 'Cut', bn: 'কাটা' },
    type: 'select',
    required: false,
    filterable: true,
    options: [opt('whole', 'Whole', 'আস্ত'), opt('fillet', 'Fillet', 'ফিলে'), opt('steak', 'Steak', 'স্টেক')],
  },
];

const img = (file, alt) => ({ url: `/uploads/seed/${file}`, publicId: `local:seed/${file}`, alt });

function weights(price, stocks = [18, 24, 10], sale = false) {
  return [
    { label: '500g', weightValue: 0.5, weightUnit: 'kg', price: Math.round(price * 0.5), stock: stocks[0], isDefault: false, sku: '' },
    { label: '1 kg', weightValue: 1, weightUnit: 'kg', price, compareAtPrice: sale ? Math.round(price * 1.12) : null, stock: stocks[1], isDefault: true, sku: '' },
    { label: '2 kg', weightValue: 2, weightUnit: 'kg', price: Math.round(price * 1.96), compareAtPrice: price * 2, stock: stocks[2], isDefault: false, sku: '' },
  ];
}

await connectDb();
const srcDir = path.join(serverRoot, 'seed/images');
const destDir = path.join(serverRoot, 'uploads/seed');
await fs.mkdir(destDir, { recursive: true });
for (const file of await fs.readdir(srcDir)) {
  if (!file.endsWith('.jpg') && !file.endsWith('.png') && !file.endsWith('.webp')) continue;
  await fs.copyFile(path.join(srcDir, file), path.join(destDir, file));
}

await Promise.all([
  User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({}), Order.deleteMany({}),
  Payment.deleteMany({}), Review.deleteMany({}), Banner.deleteMany({}), DeliveryZone.deleteMany({}),
  Coupon.deleteMany({}), Subscriber.deleteMany({}), Setting.deleteMany({}),
]);

const admin = await User.create({
  name: 'Farm City Admin',
  email: 'admin@farmcity.com',
  phone: '01710000001',
  password: process.env.SEED_ADMIN_PASSWORD || 'change-me',
  role: 'admin',
});
const customer = await User.create({
  name: 'Nusrat Rahman',
  email: 'customer@farmcity.com',
  phone: '01711000000',
  password: process.env.SEED_CUSTOMER_PASSWORD || 'change-me',
  role: 'customer',
  addresses: [{
    label: 'Home',
    name: 'Nusrat Rahman',
    phone: '01711000000',
    addressLine: 'House 14, Road 6, Dhanmondi',
    district: 'Dhaka',
    area: 'Dhanmondi',
    isDefault: true,
  }],
});

const catDocs = await Category.create([
  { name: { en: 'Freshwater Fish', bn: 'মিঠা পানির মাছ' }, slug: 'freshwater-fish', description: { en: 'Carp, catfish, and river fish packed on ice the morning they land.', bn: 'রুই, কাতলা, শিং ও নদীর মাছ — ধরার দিনই বরফে প্যাক।' }, image: img('rohu.jpg', 'Freshwater fish'), icon: 'freshwater', isFeatured: true, sortOrder: 1, attributeSchema: fishFields },
  { name: { en: 'Saltwater Fish', bn: 'নোনা পানির মাছ' }, slug: 'saltwater-fish', description: { en: 'Bay of Bengal catch: pomfret, seabass, and mullet.', bn: 'বঙ্গোপসাগরের রূপচান্দা, কোরাল ও পার্সে।' }, image: img('rupchanda.jpg', 'Saltwater fish'), icon: 'saltwater', isFeatured: true, sortOrder: 2, attributeSchema: fishFields },
  { name: { en: 'Popular Fish', bn: 'জনপ্রিয় মাছ' }, slug: 'popular-fish', description: { en: 'The fish Dhaka kitchens cook most often.', bn: 'ঢাকার রান্নাঘরে সবচেয়ে বেশি রান্না হয় যে মাছ।' }, image: img('seafood.jpg', 'Popular fish'), icon: 'popular', isFeatured: true, sortOrder: 3, attributeSchema: fishFields },
  { name: { en: 'Premium Seafood', bn: 'প্রিমিয়াম সামুদ্রিক খাবার' }, slug: 'premium-seafood', description: { en: 'Prawn, crab, squid, and export-grade fish.', bn: 'চিংড়ি, কাঁকড়া, স্কুইড ও রপ্তানি মানের মাছ।' }, image: img('prawn.jpg', 'Premium seafood'), icon: 'seafood', isFeatured: true, sortOrder: 4, attributeSchema: premiumFields },
  { name: { en: 'Frozen Fish', bn: 'হিমায়িত মাছ' }, slug: 'frozen-fish', description: { en: 'Blast-frozen fillets and steaks with a clear best-before date.', bn: 'স্পষ্ট মেয়াদসহ হিমায়িত ফিলে ও স্টেক।' }, image: img('salmon.jpg', 'Frozen fish'), icon: 'frozen', isFeatured: true, sortOrder: 5, attributeSchema: frozenFields },
]);
const bySlug = Object.fromEntries(catDocs.map((category) => [category.slug, category]));
const padma = await Category.create({
  name: { en: 'Padma & Meghna Catch', bn: 'পদ্মা ও মেঘনার মাছ' },
  slug: 'padma-meghna',
  description: { en: 'Hilsa and river fish from the Padma and Meghna.', bn: 'পদ্মা ও মেঘনার ইলিশ ও নদীর মাছ।' },
  image: img('ilish-padma.jpg', 'Padma hilsa'),
  icon: 'river',
  parent: bySlug['freshwater-fish']._id,
  isVisible: true,
  isFeatured: false,
  sortOrder: 1,
  attributeSchema: fishFields,
});

const L = (en, bn) => ({ en, bn });
const products = [
  ['padma-ilish', L('Padma Ilish (Hilsa)', 'পদ্মার ইলিশ'), L('Silver Padma hilsa, landed this morning and packed on ice. Rich enough for bhapa ilish or a mustard gravy. We clean it on request.', 'আজ সকালের পদ্মার রুপালি ইলিশ, বরফে প্যাক। ভাপা ইলিশ বা সরিষা বাটায় চমৎকার। চাইলে পরিষ্কার করে দেওয়া হবে।'), 'freshwater-fish', ['popular-fish', 'padma-meghna'], ['ilish.jpg', 'ilish-padma.jpg'], 1950, 2200, { species: 'Tenualosa ilisha', freshness: 'fresh', origin: 'Padma River', storage: 'ice', cut: 'whole' }, ['ilish', 'hilsa', 'পদ্মা'], { best: true, featured: true, popularity: 260, sale: true }],
  ['rui', L('Rui (Rohu)', 'রুই'), L('A mild, thick-fleshed carp for jhol, fry, or the Friday table. Gutted on request.', 'ঝোল, ভাজা বা শুক্রবারের টেবিলের জন্য নরম মাংসের রুই। চাইলে নাড়িভুঁড়ি ছাড়িয়ে দেওয়া হবে।'), 'freshwater-fish', ['popular-fish'], ['rohu.jpg', 'rohu-market.jpg'], 420, null, { species: 'Labeo rohita', freshness: 'fresh', origin: 'Chandpur', storage: 'ice', cut: 'whole' }, ['rui', 'rohu'], { best: true, popularity: 210 }],
  ['katla', L('Katla (Catla)', 'কাতলা'), L('Broad flakes and a clean taste. A favourite for mustard gravy and large family meals.', 'চওড়া আঁশ ও পরিষ্কার স্বাদ। সরিষা ঝোল ও বড় পরিবারের জন্য।'), 'freshwater-fish', [], ['rohu-market.jpg', 'rohu.jpg'], 460, null, { species: 'Catla catla', freshness: 'fresh', origin: 'Rajshahi ghats', storage: 'ice', cut: 'whole' }, ['katla', 'catla'], { best: true, popularity: 160 }],
  ['pangas', L('Pangas', 'পাঙ্গাস'), L('Soft, inexpensive, and quick to cook. Good for a weeknight curry with potato.', 'নরম, সাশ্রয়ী, তাড়াতাড়ি রান্না হয়। আলুর ঝোলে ভালো লাগে।'), 'freshwater-fish', ['popular-fish'], ['rohu.jpg'], 220, null, { species: 'Pangasius', freshness: 'fresh', origin: 'Mymensingh farms', storage: 'ice', cut: 'whole' }, ['pangas', 'pangasius'], { best: true, popularity: 180 }],
  ['tilapia', L('Tilapia', 'তেলাপিয়া'), L('Lean white flesh that takes turmeric and chilli well. A reliable everyday fish.', 'হালকা সাদা মাংস, হলুদ-মরিচের সাথে মানানসই। প্রতিদিনের মাছ।'), 'freshwater-fish', ['popular-fish'], ['seafood.jpg'], 280, null, { species: 'Oreochromis niloticus', freshness: 'fresh', origin: 'Gazipur ponds', storage: 'ice', cut: 'whole' }, ['tilapia'], { best: true, popularity: 170 }],
  ['pabda', L('Pabda', 'পাবদা'), L('A small, delicate catfish. Cook it gently in a light gravy so the flesh stays whole.', 'ছোট, নরম ক্যাটফিশ। হালকা ঝোলে আস্ত রাখতে ধীরে রান্না করুন।'), 'freshwater-fish', [], ['rohu-market.jpg'], 780, null, { species: 'Ompok pabda', freshness: 'fresh', origin: 'Faridpur wetlands', storage: 'ice', cut: 'whole' }, ['pabda'], { popularity: 90, arrival: true }],
  ['shing', L('Shing (Stinging catfish)', 'শিং'), L('Prized for a peppery jhol when someone at home is under the weather.', 'শরীর খারাপের দিনে ঝাল ঝোলের জন্য চাহিদাসম্পন্ন।'), 'freshwater-fish', [], ['rohu.jpg'], 820, null, { species: 'Heteropneustes fossilis', freshness: 'live', origin: 'Manikganj', storage: 'live-tank', cut: 'whole' }, ['shing'], { popularity: 100 }],
  ['magur', L('Magur (Walking catfish)', 'মাগুর'), L('A firm catfish often cooked with plenty of onion and green chilli.', 'পেঁয়াজ ও কাঁচা মরিচ দিয়ে রান্নার জন্য দৃঢ় মাংসের মাগুর।'), 'freshwater-fish', [], ['rohu-market.jpg'], 900, null, { species: 'Clarias batrachus', freshness: 'live', origin: 'Narsingdi', storage: 'live-tank', cut: 'whole' }, ['magur'], { popularity: 95 }],
  ['koi', L('Koi (Climbing perch)', 'কই'), L('Small, sweet, and traditionally cooked with plenty of oil and spices.', 'ছোট ও মিষ্টি। তেলে-মশলায় রেওয়াজের রান্না।'), 'freshwater-fish', [], ['seafood.jpg'], 480, null, { species: 'Anabas testudineus', freshness: 'live', origin: 'Barishal', storage: 'live-tank', cut: 'whole' }, ['koi'], { popularity: 80 }],
  ['boal', L('Boal', 'বোয়াল'), L('A large river catfish with meaty steaks. Ask us to cut it before dispatch.', 'বড় নদীর ক্যাটফিশ, মাংসল স্টেক। পাঠানোর আগে কেটে দিতে বলুন।'), 'freshwater-fish', [], ['rohu.jpg'], 700, null, { species: 'Wallago attu', freshness: 'fresh', origin: 'Jamuna', storage: 'ice', cut: 'sliced' }, ['boal'], { popularity: 70 }],
  ['chingri', L('Chingri (Small shrimp)', 'ছোট চিংড়ি'), L('Sweet small shrimp for bhapa, stir-fry, or a quick malaikari-style gravy.', 'ভাপা, ভাজি বা হালকা মালাইকারির জন্য মিষ্টি ছোট চিংড়ি।'), 'popular-fish', ['premium-seafood'], ['shrimp-raw.jpg', 'shrimp.jpg'], 640, null, { species: 'Metapenaeus', freshness: 'fresh', origin: 'Khulna ghers', storage: 'ice', cut: 'whole' }, ['chingri', 'shrimp', 'prawn'], { best: true, popularity: 190 }],
  ['bagda', L('Bagda Chingri (Tiger prawn)', 'বাগদা চিংড়ি'), L('Head-on tiger prawns, graded for size. Ideal for grill or a coconut gravy.', 'মাথা-সহ বাগদা, সাইজ অনুযায়ী বাছাই। গ্রিল বা নারকেলের ঝোলে।'), 'premium-seafood', ['popular-fish'], ['prawn.jpg', 'shrimp-raw.jpg'], 1350, 1490, { species: 'Penaeus monodon', freshness: 'chilled', origin: 'Satkhira', storage: 'ice', grade: 'a', cut: 'whole' }, ['bagda', 'tiger', 'prawn'], { best: true, featured: true, popularity: 175, sale: true }],
  ['golda', L('Golda Chingri', 'গলদা চিংড়ি'), L('Freshwater prawns with a deep, sweet flavour. The centre of a celebration table.', 'মিষ্টি গভীর স্বাদের মিঠাপানির চিংড়ি। উৎসবের টেবিলের মাঝখানে।'), 'premium-seafood', [], ['prawn.jpg'], 1600, 1750, { species: 'Macrobrachium rosenbergii', freshness: 'fresh', origin: 'Bagerhat', storage: 'ice', grade: 'export', cut: 'whole' }, ['golda', 'prawn'], { featured: true, popularity: 150, sale: true, arrival: true }],
  ['rupchanda', L('Rupchanda (Pomfret)', 'রূপচান্দা'), L('White pomfret from the Bay, cleaned if you ask. Fry it whole with a light dusting of rice flour.', 'বঙ্গোপসাগরের সাদা রূপচান্দা। চাইলে পরিষ্কার। চালের গুঁড়োয় আস্ত ভেজে নিন।'), 'saltwater-fish', ['popular-fish'], ['rupchanda.jpg', 'pomfret.jpg'], 1100, null, { species: 'Pampus argenteus', freshness: 'fresh', origin: 'Bay of Bengal', storage: 'ice', cut: 'whole' }, ['rupchanda', 'pomfret'], { best: true, popularity: 165 }],
  ['koral', L('Koral (Barramundi)', 'কোরাল'), L('Flaky seabass that stays moist in the oven or in a banana-leaf parcel.', 'চুলার ওভেনে বা কলাপাতায় নরম থাকে এমন কোরাল।'), 'saltwater-fish', [], ['pomfret.jpg', 'seafood.jpg'], 980, null, { species: 'Lates calcarifer', freshness: 'fresh', origin: 'Cox\'s Bazar', storage: 'ice', cut: 'whole' }, ['koral', 'bhetki', 'seabass'], { popularity: 120 }],
  ['parse', L('Parse (Mullet)', 'পার্সে'), L('A coastal fish with a clean, slightly oily bite. Excellent smoked or fried.', 'সমুদ্রতীরের মাছ, সামান্য তেলতেলে। ভাজা বা সেঁকা ভালো।'), 'saltwater-fish', [], ['seafood.jpg'], 520, null, { species: 'Mugil cephalus', freshness: 'fresh', origin: 'Patenga coast', storage: 'ice', cut: 'whole' }, ['parse', 'mullet'], { popularity: 60 }],
  ['loitta', L('Loitta (Bombay duck)', 'লইট্টা'), L('Soft coastal fish. Cook it the day it arrives; it does not like to wait.', 'নরম উপকূলীয় মাছ। আসার দিনেই রান্না করুন।'), 'popular-fish', ['saltwater-fish'], ['ilish.jpg'], 380, null, { species: 'Harpadon nehereus', freshness: 'fresh', origin: 'Chattogram coast', storage: 'ice', cut: 'whole' }, ['loitta', 'bombay duck'], { popularity: 110, arrival: true }],
  ['vetki', L('Vetki fillet', 'ভেটকি ফিলে'), L('Skin-on vetki fillets, pin-boned. Pan-sear and finish with lime.', 'চামড়া-সহ ভেটকি ফিলে, কাঁটা বাছাই করা। লেবুর সাথে সেঁকে নিন।'), 'saltwater-fish', ['premium-seafood'], ['salmon.jpg'], 1250, null, { species: 'Lates calcarifer', freshness: 'chilled', origin: 'Cox\'s Bazar', storage: 'ice', cut: 'fillet' }, ['vetki', 'bhetki', 'fillet'], { arrival: true, popularity: 88 }],
  ['crab', L('Mud crab', 'কাঁকড়া'), L('Live mud crabs, tied and weighed. A large piece feeds two with mustard or black pepper.', 'জীবিত কাঁকড়া, বেঁধে ওজন করা। একটি বড় পিস দুজনের জন্য।'), 'premium-seafood', [], ['crab.jpg'], 950, null, { species: 'Scylla serrata', freshness: 'live', origin: 'Sundarbans edge', storage: 'live-tank', grade: 'a', cut: 'whole' }, ['crab', 'kakra'], { featured: true, popularity: 140 }],
  ['squid', L('Squid', 'স্কুইড'), L('Cleaned tubes and tentacles. Score and flash-fry so they stay tender.', 'পরিষ্কার করা স্কুইড। হালকা কেটে দ্রুত ভাজলে নরম থাকে।'), 'premium-seafood', [], ['squid.jpg'], 740, null, { species: 'Loligo', freshness: 'chilled', origin: 'Bay of Bengal', storage: 'ice', grade: 'a', cut: 'cleaned' }, ['squid'], { popularity: 55 }],
  ['frozen-pangas', L('Frozen pangas fillet', 'হিমায়িত পাঙ্গাস ফিলে'), L('Individually frozen pangas fillets. Keep frozen and thaw overnight in the fridge.', 'আলাদা করে হিমায়িত পাঙ্গাস ফিলে। ফ্রিজে সারারাত গলিয়ে নিন।'), 'frozen-fish', [], ['salmon.jpg'], 360, null, { species: 'Pangasius', origin: 'Mymensingh', packaging: 'IQF pouch', expiryDate: '2027-02-01', cut: 'fillet' }, ['frozen', 'pangas', 'fillet'], { popularity: 75 }],
  ['tuna', L('Frozen tuna steak', 'হিমায়িত টুনা স্টেক'), L('Deep-red tuna steaks, vacuum packed. Sear the outside and leave the centre rare if you like.', 'গাঢ় লাল টুনা স্টেক, ভ্যাকুয়াম প্যাক। বাইরে সেঁকে ভিতর নরম রাখতে পারেন।'), 'frozen-fish', ['premium-seafood'], ['seafood.jpg', 'salmon.jpg'], 1450, 1600, { species: 'Thunnus albacares', origin: 'Bay of Bengal', packaging: 'Vacuum pack', expiryDate: '2027-01-15', cut: 'steak' }, ['tuna', 'steak'], { sale: true, arrival: true, popularity: 66 }],
];

const crabIndex = products.findIndex((row) => row[0] === 'crab');
const squidIndex = products.findIndex((row) => row[0] === 'squid');

const docs = [];
for (const [slug, name, description, primary, extras, images, price, compare, attributes, tags, flags] of products) {
  const unit = slug === 'crab' ? 'piece' : 'kg';
  const sale = Boolean(flags.sale);
  let variants;
  let stock = 8;
  let allowCustom = true;
  let minQuantity = 0.5;
  if (slug === 'crab') {
    variants = [
      { label: '1 piece', weightValue: 1, weightUnit: 'piece', price, stock: 14, isDefault: true, sku: 'CRAB-1' },
      { label: '2 pieces', weightValue: 2, weightUnit: 'piece', price: Math.round(price * 1.9), compareAtPrice: price * 2, stock: 8, isDefault: false, sku: 'CRAB-2' },
    ];
    allowCustom = false;
    stock = 0;
    minQuantity = 1;
  } else if (slug === 'squid') {
    variants = weights(price, [2, 1, 1], false);
    allowCustom = false;
    stock = 0;
    minQuantity = 0.5;
  } else {
    variants = weights(price, undefined, sale);
  }
  const category = bySlug[primary]._id;
  const categories = [category, ...extras.map((key) => (key === 'padma-meghna' ? padma._id : bySlug[key]._id))];
  const draft = {
    name,
    slug,
    description,
    category,
    categories,
    images: images.map((file) => img(file, name.en)),
    basePrice: price,
    compareAtPrice: compare,
    unit,
    stock,
    isAvailable: true,
    variants,
    allowCustomQuantity: allowCustom,
    minQuantity,
    maxQuantity: unit === 'piece' ? 6 : 5,
    quantityStep: unit === 'piece' ? 1 : 0.5,
    attributes,
    isFeatured: Boolean(flags.featured),
    isBestSeller: Boolean(flags.best),
    isNewArrival: Boolean(flags.arrival),
    popularity: flags.popularity || 40,
    tags,
    sku: slug.toUpperCase(),
  };
  draft.availability = computeAvailability(draft, 5);
  docs.push(draft);
}
void crabIndex;
void squidIndex;
const saved = await Product.create(docs);
const productBySlug = Object.fromEntries(saved.map((product) => [product.slug, product]));

await Banner.create([
  { placement: 'hero', title: L('The morning catch, still cold', 'সকালের মাছ, এখনও ঠান্ডা'), subtitle: L('Padma hilsa, river carp, and prawns packed on ice and sent across Dhaka the same day.', 'পদ্মার ইলিশ, নদীর কার্প ও চিংড়ি বরফে প্যাক করে ঢাকায় আজই।'), image: img('ilish-dhaka.jpg', 'Hilsa in Dhaka'), link: '/product/padma-ilish', ctaLabel: L('Shop hilsa', 'ইলিশ দেখুন'), isActive: true, sortOrder: 1 },
  { placement: 'hero', title: L('Laid on ice, nothing extra', 'বরফে সাজানো, বাড়তি কিছু নয়'), subtitle: L('Prawn, crab, and the white fish of the day, the way a serious counter should look.', 'চিংড়ি, কাঁকড়া আর দিনের সাদা মাছ — একটি ভালো কাউন্টার যেমন দেখায়।'), image: img('seafood.jpg', 'Seafood on ice'), link: '/category/premium-seafood', ctaLabel: L('The premium counter', 'প্রিমিয়াম কাউন্টার'), isActive: true, sortOrder: 2 },
  { placement: 'hero', title: L('A counter you can trust', 'বিশ্বাসযোগ্য কাউন্টার'), subtitle: L('Weights are labelled, cuts are optional, and cash on delivery is ready when you are.', 'ওজন লেখা থাকে, কাটা ঐচ্ছিক, আর ক্যাশ অন ডেলিভারি প্রস্তুত।'), image: img('market.jpg', 'Fish counter'), link: '/products', ctaLabel: L('Shop the counter', 'কাউন্টার দেখুন'), isActive: true, sortOrder: 3 },
  { placement: 'promo', title: L('Ilish week', 'ইলিশ সপ্তাহ'), subtitle: L('Padma hilsa, cleaned if you ask.', 'পদ্মার ইলিশ, চাইলে পরিষ্কার।'), image: img('ilish.jpg', 'Hilsa'), link: '/product/padma-ilish', ctaLabel: L('Order ilish', 'ইলিশ অর্ডার'), isActive: true, sortOrder: 1 },
  { placement: 'promo', title: L('Prawn for the table', 'টেবিলের চিংড়ি'), subtitle: L('Bagda and golda, graded and iced.', 'বাগদা ও গলদা, বাছাই ও বরফে।'), image: img('prawn.jpg', 'Prawns'), link: '/category/premium-seafood', ctaLabel: L('See seafood', 'সামুদ্রিক খাবার'), isActive: true, sortOrder: 2 },
]);

const zones = [
  ['Dhaka', '', 100, 'Same day after 2pm cutoff, otherwise next morning', 'দুপুর ২টার পর হলে পরের সকাল'],
  ['Dhaka', 'Gulshan', 50, 'Same day', 'আজই'],
  ['Dhaka', 'Banani', 50, 'Same day', 'আজই'],
  ['Dhaka', 'Baridhara', 60, 'Same day', 'আজই'],
  ['Dhaka', 'Dhanmondi', 60, 'Same day', 'আজই'],
  ['Dhaka', 'Mohammadpur', 70, 'Same day', 'আজই'],
  ['Dhaka', 'Mirpur', 80, 'Same day', 'আজই'],
  ['Dhaka', 'Uttara', 80, 'Same day', 'আজই'],
  ['Dhaka', 'Tejgaon', 70, 'Same day', 'আজই'],
  ['Dhaka', 'Motijheel', 70, 'Same day', 'আজই'],
  ['Dhaka', 'Badda', 80, 'Same day or next morning', 'আজ বা আগামী সকাল'],
  ['Dhaka', 'Jatrabari', 90, 'Next morning', 'আগামী সকাল'],
  ['Gazipur', '', 120, 'Next day', 'পরের দিন'],
  ['Narayanganj', '', 110, 'Next day', 'পরের দিন'],
  ['Narsingdi', '', 130, '1–2 days', '১–২ দিন'],
  ['Mymensingh', '', 140, '1–2 days', '১–২ দিন'],
  ['Cumilla', '', 150, '1–2 days', '১–২ দিন'],
  ['Chattogram', '', 180, '2 days', '২ দিন'],
  ['Khulna', '', 180, '2 days', '২ দিন'],
  ['Barishal', '', 190, '2 days', '২ দিন'],
  ['Rajshahi', '', 190, '2 days', '২ দিন'],
  ['Sylhet', '', 200, '2 days', '২ দিন'],
  ['Rangpur', '', 210, '2–3 days', '২–৩ দিন'],
  ["Cox's Bazar", '', 230, '2–3 days', '২–৩ দিন'],
];
await DeliveryZone.create(zones.map(([district, area, charge, en, bn]) => ({
  district, area, charge, eta: { en, bn }, isActive: true,
})));

await Coupon.create({
  code: 'WELCOME10',
  description: L('10% off your first basket over ৳500', '৳৫০০-এর বেশি প্রথম ঝুড়িতে ১০% ছাড়'),
  type: 'percent',
  value: 10,
  minOrder: 500,
  maxDiscount: 300,
  isActive: true,
  usageLimit: 500,
});

await Setting.create({
  key: 'store',
  storeName: 'Farm City',
  tagline: L('The day’s catch, at your door.', 'দিনের মাছ, আপনার দরজায়।'),
  phone: '01710000001',
  email: 'hello@farmcity.com',
  whatsapp: '01710000001',
  address: L('House 4, Road 12, Gulshan 1, Dhaka', 'বাড়ি ৪, রোড ১২, গুলশান ১, ঢাকা'),
  about: L('Farm City is a Trikon Holdings shop for fresh fish and seafood in Bangladesh. We buy from rivers, ghers, and the Bay, pack on ice, and deliver with the weight you ordered. The same shelves will later hold vegetables, meat, and daily groceries — the catalog is already built for that.', 'ফার্ম সিটি ত্রিকোণ হোল্ডিংসের তাজা মাছ ও সামুদ্রিক খাবারের দোকান। নদী, ঘের ও বঙ্গোপসাগর থেকে কিনে বরফে প্যাক করি এবং আপনার চাওয়া ওজনে পৌঁছে দিই। পরে সবজি, মাংস ও নিত্যপণ্যও এই তাকে আসবে — ক্যাটালগ সেভাবেই তৈরি।'),
  hours: L('Orders 8:00–21:00, every day. Same-day Dhaka delivery for orders before 14:00.', 'প্রতিদিন সকাল ৮টা থেকে রাত ৯টা। দুপুর ২টার আগে ঢাকায় একই দিনে ডেলিভারি।'),
  announcement: { enabled: true, text: L('Padma hilsa is in. Same-day Dhaka delivery on orders before 2pm.', 'পদ্মার ইলিশ এসেছে। দুপুর ২টার আগে অর্ডারে ঢাকায় আজই ডেলিভারি।'), link: '/product/padma-ilish' },
  social: { facebook: 'https://facebook.com', instagram: 'https://instagram.com' },
  payments: { cod: { enabled: true }, bkash: { enabled: false }, nagad: { enabled: false }, sslcommerz: { enabled: false } },
  defaultDeliveryCharge: 120,
  freeDeliveryThreshold: 3500,
  lowStockThreshold: 5,
  highlights: [
    { icon: 'fish', title: L('Landed today', 'আজকের মাছ'), text: L('River and sea fish are bought in the morning and packed on ice, not held over.', 'নদী ও সমুদ্রের মাছ সকালে কেনা হয় এবং বরফে প্যাক হয়, রেখে দেওয়া হয় না।') },
    { icon: 'shield', title: L('Weight you can check', 'ওজন মিলিয়ে নিন'), text: L('Every pack is labelled with the cut and the weight you chose at checkout.', 'প্রতিটি প্যাকে আপনার বেছে নেওয়া কাটা ও ওজন লেখা থাকে।') },
    { icon: 'truck', title: L('Dhaka today, further tomorrow', 'ঢাকায় আজ, দূরে আগামীকাল'), text: L('Delivery charges follow the district and area, and you see them before you pay.', 'ডেলিভারি চার্জ জেলা ও এলাকা অনুযায়ী, পরিশোধের আগেই দেখা যায়।') },
    { icon: 'home', title: L('Cash when it arrives', 'এলে টাকা দিন'), text: L('Cash on delivery is a real order, not a request form. Pay the rider at the door.', 'ক্যাশ অন ডেলিভারি আসল অর্ডার। দরজায় রাইডারকে টাকা দিন।') },
  ],
  testimonials: [
    { name: 'Nusrat R.', location: 'Dhanmondi', rating: 5, quote: L('The hilsa was still icy at 6pm and the 1 kg pack matched the scale in my kitchen.', 'সন্ধ্যা ৬টায়ও ইলিশ বরফ-ঠান্ডা ছিল, আর ১ কেজি প্যাক রান্নাঘরের স্কেলে মিলেছে।') },
    { name: 'Imran H.', location: 'Uttara', rating: 5, quote: L('I ordered golda for a family lunch and could pick 500g without calling anyone.', 'পারিবারিক দুপুরের জন্য গলদা অর্ডার করেছি, কাউকে ফোন না করেই ৫০০ গ্রাম বেছেছি।') },
    { name: 'Farhana K.', location: 'Mirpur', rating: 4, quote: L('Rui arrived cleaned, as I asked in the delivery note. Cash on delivery was straightforward.', 'নোট অনুযায়ী রুই পরিষ্কার এসেছে। ক্যাশ অন ডেলিভারি ঝামেলাহীন।') },
  ],
});

const ilish = productBySlug['padma-ilish'];
const rui = productBySlug.rui;
const ilishVariant = ilish.variants.find((variant) => variant.label === '1 kg');
const ruiVariant = rui.variants.find((variant) => variant.label === '1 kg');

function daysAgo(days, hours = 10) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hours, 15, 0, 0);
  return date;
}

const delivered = await Order.create({
  orderNumber: 'FC-DEMO-1001',
  viewToken: 'seed-token-delivered-nusrat',
  user: customer._id,
  customer: { name: customer.name, phone: customer.phone, email: customer.email },
  shippingAddress: { addressLine: 'House 14, Road 6, Dhanmondi', district: 'Dhaka', area: 'Dhanmondi', instructions: '' },
  items: [{
    product: ilish._id,
    name: ilish.name,
    image: ilish.images[0].url,
    sku: ilish.sku,
    variantId: ilishVariant._id,
    variantLabel: '1 kg',
    weightValue: 1,
    weightUnit: 'kg',
    unit: 'kg',
    quantity: 1,
    unitPrice: ilishVariant.price,
    compareAtPrice: ilishVariant.compareAtPrice,
    lineTotal: ilishVariant.price,
    attributes: ilish.attributes,
  }],
  subtotal: ilishVariant.price,
  deliveryCharge: 60,
  discount: 0,
  total: ilishVariant.price + 60,
  paymentMethod: 'cod',
  paymentStatus: 'paid',
  status: 'Delivered',
  stockCommitted: true,
  statusHistory: [
    { status: 'Pending', note: 'Order placed', at: daysAgo(6, 9) },
    { status: 'Confirmed', note: 'Confirmed by the counter', at: daysAgo(6, 10) },
    { status: 'Processing', note: 'Packed on ice', at: daysAgo(6, 11) },
    { status: 'Out for Delivery', note: 'Rider left Gulshan', at: daysAgo(6, 15) },
    { status: 'Delivered', note: 'Handed to Nusrat', at: daysAgo(6, 18) },
  ],
  createdAt: daysAgo(6, 9),
});
await Payment.create({ order: delivered._id, provider: 'cod', amount: delivered.total, status: 'paid', rawStatus: 'collected on delivery' });

await Review.create({
  product: ilish._id,
  user: customer._id,
  order: delivered._id,
  rating: 5,
  comment: 'Still cold when it arrived, and the belly was intact. We made bhapa ilish the same night.',
});
await Product.updateOne({ _id: ilish._id }, { $set: { ratingAvg: 5, ratingCount: 1 } });

const pending = await Order.create({
  orderNumber: 'FC-DEMO-1002',
  viewToken: 'seed-token-pending-nusrat',
  user: customer._id,
  customer: { name: customer.name, phone: customer.phone, email: customer.email },
  shippingAddress: { addressLine: 'House 14, Road 6, Dhanmondi', district: 'Dhaka', area: 'Dhanmondi', instructions: 'Leave with the guard if I miss the call.' },
  items: [{
    product: rui._id,
    name: rui.name,
    image: rui.images[0].url,
    sku: rui.sku,
    variantId: ruiVariant._id,
    variantLabel: '1 kg',
    weightValue: 1,
    weightUnit: 'kg',
    unit: 'kg',
    quantity: 1,
    unitPrice: ruiVariant.price,
    lineTotal: ruiVariant.price,
    attributes: rui.attributes,
  }],
  subtotal: ruiVariant.price,
  deliveryCharge: 60,
  discount: 0,
  total: ruiVariant.price + 60,
  paymentMethod: 'cod',
  paymentStatus: 'unpaid',
  status: 'Pending',
  stockCommitted: true,
  statusHistory: [{ status: 'Pending', note: 'Order placed', at: daysAgo(0, 8) }],
  createdAt: daysAgo(0, 8),
});
await Payment.create({ order: pending._id, provider: 'cod', amount: pending.total, status: 'pending' });
await Product.updateOne(
  { _id: rui._id, 'variants._id': ruiVariant._id },
  { $inc: { 'variants.$.stock': -1, popularity: 1 } },
);
const ruiFresh = await Product.findById(rui._id);
ruiFresh.availability = computeAvailability(ruiFresh, 5);
await ruiFresh.save();

const chartProducts = [productBySlug.tilapia, productBySlug.chingri, productBySlug.rupchanda, productBySlug.katla];
for (let day = 1; day <= 12; day += 2) {
  const product = chartProducts[day % chartProducts.length];
  const variant = product.variants.find((item) => item.isDefault) || product.variants[0];
  const qty = (day % 3) + 1;
  const subtotal = variant.price * qty;
  const when = daysAgo(day, 11);
  const order = await Order.create({
    orderNumber: `FC-DEMO-${2000 + day}`,
    viewToken: `seed-token-chart-${day}`,
    user: customer._id,
    customer: { name: customer.name, phone: customer.phone, email: customer.email },
    shippingAddress: { addressLine: 'House 14, Road 6, Dhanmondi', district: 'Dhaka', area: 'Dhanmondi' },
    items: [{
      product: product._id,
      name: product.name,
      image: product.images[0].url,
      sku: product.sku,
      variantId: variant._id,
      variantLabel: variant.label,
      weightValue: variant.weightValue,
      weightUnit: variant.weightUnit,
      unit: product.unit,
      quantity: qty,
      unitPrice: variant.price,
      lineTotal: subtotal,
      attributes: product.attributes,
    }],
    subtotal,
    deliveryCharge: 60,
    discount: 0,
    total: subtotal + 60,
    paymentMethod: 'cod',
    paymentStatus: 'paid',
    status: 'Delivered',
    stockCommitted: true,
    statusHistory: [
      { status: 'Pending', note: 'Order placed', at: when },
      { status: 'Delivered', note: 'Delivered', at: when },
    ],
    createdAt: when,
  });
  await Payment.create({ order: order._id, provider: 'cod', amount: order.total, status: 'paid' });
}

await Subscriber.create({ email: 'hello@farmcity.com', source: 'seed' });

console.log('Seeded Farm City.');
console.log('Admin    admin@farmcity.com / (SEED_ADMIN_PASSWORD)');
console.log('Customer customer@farmcity.com / (SEED_CUSTOMER_PASSWORD)');
await mongoose.disconnect();
