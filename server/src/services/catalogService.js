import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex, slugify } from '../utils/slug.js';
import { pageParams } from '../utils/respond.js';
import { validateAttributes } from './attributeService.js';
import { getSettings } from './settingsService.js';
import { removeImage } from './imageService.js';

export function computeAvailability(product, threshold = 5) {
  const variants = product.variants || [];
  const variantQty = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  const loose = variants.length === 0 || product.allowCustomQuantity ? Number(product.stock || 0) : 0;
  const total = variants.length ? variantQty + (product.allowCustomQuantity ? Number(product.stock || 0) : 0) : loose;
  if (!product.isAvailable || total <= 0) return 'out_of_stock';
  if (total <= threshold) return 'low_stock';
  return 'in_stock';
}

export async function refreshAvailability(productId, session) {
  const settings = await getSettings();
  const product = await Product.findById(productId).session(session || null);
  if (!product) return;
  const availability = computeAvailability(product, settings.lowStockThreshold);
  if (product.availability !== availability) {
    product.availability = availability;
    await product.save({ session });
  }
}

function presentVariant(variant) {
  return {
    id: variant._id,
    sku: variant.sku,
    label: variant.label,
    weightValue: variant.weightValue,
    weightUnit: variant.weightUnit,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    stock: variant.stock,
    isDefault: variant.isDefault,
  };
}

export function presentProduct(product) {
  const obj = product.toObject ? product.toObject({ virtuals: false }) : product;
  return {
    id: obj._id,
    name: obj.name,
    slug: obj.slug,
    description: obj.description,
    category: obj.category,
    categories: obj.categories,
    images: obj.images,
    basePrice: obj.basePrice,
    compareAtPrice: obj.compareAtPrice,
    unit: obj.unit,
    stock: obj.stock,
    availability: obj.availability,
    isAvailable: obj.isAvailable,
    variants: (obj.variants || []).map(presentVariant),
    allowCustomQuantity: obj.allowCustomQuantity || !(obj.variants || []).length,
    minQuantity: obj.minQuantity,
    maxQuantity: obj.maxQuantity,
    quantityStep: obj.quantityStep,
    attributes: obj.attributes || {},
    isFeatured: obj.isFeatured,
    isBestSeller: obj.isBestSeller,
    isNewArrival: obj.isNewArrival,
    popularity: obj.popularity,
    ratingAvg: obj.ratingAvg,
    ratingCount: obj.ratingCount,
    tags: obj.tags,
    sku: obj.sku,
    isDeleted: obj.isDeleted,
    createdAt: obj.createdAt,
  };
}

async function uniqueSlug(Model, source, ignoreId) {
  const base = slugify(source);
  let slug = base;
  let n = 2;
  while (await Model.exists({ slug, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function categoryIdsWithDescendants(rootIds, { visibleOnly = true } = {}) {
  const filter = visibleOnly ? { isVisible: true } : {};
  const all = await Category.find(filter).select('_id parent').lean();
  const ids = new Set(rootIds.map(String));
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of all) {
      if (category.parent && ids.has(String(category.parent)) && !ids.has(String(category._id))) {
        ids.add(String(category._id));
        changed = true;
      }
    }
  }
  return [...ids];
}

export function buildCategoryTree(categories) {
  const nodes = categories.map((category) => ({
    ...(category.toObject ? category.toObject() : category),
    children: [],
  }));
  const byId = new Map(nodes.map((node) => [String(node._id), node]));
  const roots = [];
  for (const node of nodes) {
    const parentId = node.parent ? String(node.parent) : '';
    if (parentId && byId.has(parentId)) byId.get(parentId).children.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function listCategories({ admin = false } = {}) {
  const filter = admin ? {} : { isVisible: true };
  const categories = await Category.find(filter).sort({ sortOrder: 1, 'name.en': 1 });
  return { flat: categories.map((category) => category.toObject()), tree: buildCategoryTree(categories) };
}

async function assertParent(categoryId, parentId) {
  if (!parentId) return null;
  const parent = await Category.findById(parentId);
  if (!parent) throw new ApiError(400, 'Parent category was not found.');
  if (categoryId && String(parent._id) === String(categoryId)) {
    throw new ApiError(400, 'A category cannot be its own parent.');
  }
  let cursor = parent;
  const seen = new Set();
  while (cursor?.parent) {
    if (categoryId && String(cursor.parent) === String(categoryId)) {
      throw new ApiError(400, 'That parent would create a loop.');
    }
    if (seen.has(String(cursor._id))) break;
    seen.add(String(cursor._id));
    cursor = await Category.findById(cursor.parent).select('parent');
  }
  return parent._id;
}

export async function createCategory(body) {
  const parent = await assertParent(null, body.parentId || null);
  const slug = await uniqueSlug(Category, body.slug || body.name.en);
  return Category.create({
    name: body.name,
    slug,
    description: body.description || { en: '', bn: '' },
    image: body.image || { url: '', publicId: '', alt: '' },
    icon: body.icon || '',
    iconImage: body.iconImage || { url: '', publicId: '', alt: '' },
    parent,
    isVisible: body.isVisible,
    isFeatured: body.isFeatured,
    sortOrder: body.sortOrder,
    attributeSchema: body.attributeSchema,
  });
}

export async function updateCategory(id, body) {
  const category = await Category.findById(id);
  if (!category) throw new ApiError(404, 'Category not found.');
  if (body.parentId !== undefined) category.parent = await assertParent(category._id, body.parentId);
  if (body.name) category.name = body.name;
  if (body.description) category.description = body.description;
  if (body.image) category.image = body.image;
  if (body.icon !== undefined) category.icon = body.icon || '';
  if (body.iconImage !== undefined) category.iconImage = body.iconImage || { url: '', publicId: '', alt: '' };
  if (body.isVisible !== undefined) category.isVisible = body.isVisible;
  if (body.isFeatured !== undefined) category.isFeatured = body.isFeatured;
  if (body.sortOrder !== undefined) category.sortOrder = body.sortOrder;
  if (body.attributeSchema) category.attributeSchema = body.attributeSchema;
  if (body.slug || body.name) category.slug = await uniqueSlug(Category, body.slug || category.slug, category._id);
  await category.save();
  return category;
}

export async function deleteCategory(id) {
  const inUse = await Product.exists({ isDeleted: false, $or: [{ category: id }, { categories: id }] });
  if (inUse) throw new ApiError(400, 'Move or delete the products in this category first.');
  const hasChild = await Category.exists({ parent: id });
  if (hasChild) throw new ApiError(400, 'Remove child categories first.');
  const category = await Category.findByIdAndDelete(id);
  if (!category) throw new ApiError(404, 'Category not found.');
  return category;
}

function normalizeVariants(variants) {
  const next = (variants || []).map((variant) => ({
    ...(variant._id ? { _id: variant._id } : {}),
    sku: variant.sku || '',
    label: variant.label,
    weightValue: variant.weightValue,
    weightUnit: variant.weightUnit,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice && variant.compareAtPrice > variant.price ? variant.compareAtPrice : null,
    stock: variant.stock,
    isDefault: Boolean(variant.isDefault),
  }));
  if (next.length && !next.some((variant) => variant.isDefault)) next[0].isDefault = true;
  let seenDefault = false;
  for (const variant of next) {
    if (variant.isDefault && seenDefault) variant.isDefault = false;
    if (variant.isDefault) seenDefault = true;
  }
  return next;
}

async function resolveCategories(categoryId, extraIds) {
  const primary = await Category.findById(categoryId);
  if (!primary) throw new ApiError(400, 'Category not found.');
  const extras = extraIds?.length ? await Category.find({ _id: { $in: extraIds } }).select('_id') : [];
  const ids = [primary._id, ...extras.map((item) => item._id)];
  const unique = [];
  const seen = new Set();
  for (const id of ids) {
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(id);
  }
  return { primary, categories: unique };
}

function cleanPrices(body) {
  if (body.compareAtPrice != null && body.compareAtPrice <= body.basePrice) {
    throw new ApiError(400, 'Compare-at price must be higher than the selling price.');
  }
  if (body.minQuantity > body.maxQuantity) throw new ApiError(400, 'Minimum quantity cannot exceed the maximum.');
  for (const variant of body.variants || []) {
    if (variant.compareAtPrice != null && variant.compareAtPrice <= variant.price) {
      throw new ApiError(400, `Compare-at price for ${variant.label} must be higher than its price.`);
    }
  }
}

export async function writeProduct(body, existing) {
  cleanPrices(body);
  const { primary, categories } = await resolveCategories(body.categoryId, body.categoryIds);
  const attributes = validateAttributes(primary.attributeSchema, body.attributes);
  const settings = await getSettings();
  const variants = normalizeVariants(body.variants);
  const allowCustom = variants.length ? Boolean(body.allowCustomQuantity) : true;
  const payload = {
    name: body.name,
    description: body.description,
    category: primary._id,
    categories,
    images: body.images,
    basePrice: body.basePrice,
    compareAtPrice: body.compareAtPrice && body.compareAtPrice > body.basePrice ? body.compareAtPrice : null,
    unit: body.unit,
    stock: body.stock,
    isAvailable: body.isAvailable,
    variants,
    allowCustomQuantity: allowCustom,
    minQuantity: body.minQuantity,
    maxQuantity: body.maxQuantity,
    quantityStep: body.quantityStep,
    attributes,
    isFeatured: body.isFeatured,
    isBestSeller: body.isBestSeller,
    isNewArrival: body.isNewArrival,
    tags: (body.tags || []).map((tag) => tag.toLowerCase()),
    sku: body.sku || '',
  };
  payload.availability = computeAvailability(payload, settings.lowStockThreshold);
  if (!existing) {
    payload.slug = await uniqueSlug(Product, body.name.en);
    return Product.create(payload);
  }
  if (body.images && existing.images?.length) {
    const keep = new Set(body.images.map((image) => image.publicId).filter(Boolean));
    for (const image of existing.images) {
      if (image.publicId && !keep.has(image.publicId)) await removeImage(image.publicId);
    }
  }
  Object.assign(existing, payload);
  await existing.save();
  return existing;
}

export async function listProducts(query, { admin = false } = {}) {
  const { page, limit, skip } = pageParams(query);
  const filter = { isDeleted: false };
  if (!admin) filter.isAvailable = true;
  const and = [];

  if (query.category) {
    const category = await Category.findOne({ slug: query.category });
    if (!category || (!admin && !category.isVisible)) {
      return { items: [], meta: { page, limit, total: 0, pages: 0 } };
    }
    const ids = await categoryIdsWithDescendants([category._id], { visibleOnly: !admin });
    and.push({ $or: [{ category: { $in: ids } }, { categories: { $in: ids } }] });
  }
  if (query.minPrice || query.maxPrice) {
    filter.basePrice = {};
    if (query.minPrice) filter.basePrice.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.basePrice.$lte = Number(query.maxPrice);
  }
  if (query.availability) filter.availability = query.availability;
  if (query.featured === 'true') filter.isFeatured = true;
  if (query.bestSeller === 'true') filter.isBestSeller = true;
  if (query.newArrival === 'true') filter.isNewArrival = true;
  if (query.onSale === 'true') and.push({ $expr: { $gt: ['$compareAtPrice', '$basePrice'] } });

  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith('attr_') || value === undefined || value === '') continue;
    const attr = key.slice(5);
    if (!/^[a-z][a-z0-9_]{0,40}$/.test(attr)) continue;
    filter[`attributes.${attr}`] = String(value);
  }
  if (and.length) filter.$and = and;

  const sortMap = {
    popular: { popularity: -1, createdAt: -1 },
    newest: { createdAt: -1 },
    price_asc: { basePrice: 1 },
    price_desc: { basePrice: -1 },
  };
  const sort = sortMap[query.sort] || sortMap.popular;
  const populate = { path: 'category', select: 'name slug attributeSchema' };

  const run = async (mongoFilter, sortSpec, projection) => {
    const [items, total] = await Promise.all([
      Product.find(mongoFilter, projection).sort(sortSpec).skip(skip).limit(limit).populate(populate),
      Product.countDocuments(mongoFilter),
    ]);
    return {
      items: items.map(presentProduct),
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  };

  const q = String(query.q || '').trim();
  if (q) {
    try {
      const textFilter = { ...filter, $text: { $search: q } };
      const textTotal = await Product.countDocuments(textFilter);
      if (textTotal > 0) {
        return run(textFilter, { score: { $meta: 'textScore' } }, { score: { $meta: 'textScore' } });
      }
    } catch (error) {
      if (error?.code !== 27 && !/text index/i.test(error?.message || '')) throw error;
    }
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$and = [...(filter.$and || []), { $or: [{ 'name.en': rx }, { 'name.bn': rx }, { tags: rx }] }];
  }
  return run(filter, sort);
}

export async function getProductBySlug(slug) {
  const product = await Product.findOne({ slug, isDeleted: false, isAvailable: true }).populate(
    'category',
    'name slug attributeSchema parent',
  );
  if (!product) throw new ApiError(404, 'Product not found.');
  const related = await Product.find({
    _id: { $ne: product._id },
    isDeleted: false,
    isAvailable: true,
    $or: [{ category: product.category._id }, { categories: product.category._id }],
  })
    .sort({ popularity: -1 })
    .limit(4)
    .populate('category', 'name slug');
  return { product: presentProduct(product), related: related.map(presentProduct) };
}

export async function getProductById(id) {
  const product = await Product.findById(id).populate('category', 'name slug attributeSchema');
  if (!product || product.isDeleted) throw new ApiError(404, 'Product not found.');
  return product;
}
