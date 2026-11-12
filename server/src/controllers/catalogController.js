import { Banner } from '../models/Banner.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';
import {
  createCategory,
  deleteCategory,
  getProductById,
  getProductBySlug,
  listCategories,
  listProducts,
  presentProduct,
  updateCategory,
  writeProduct,
} from '../services/catalogService.js';

export const getCategories = asyncHandler(async (req, res) => {
  ok(res, await listCategories({ admin: false }));
});

export const adminCategories = asyncHandler(async (req, res) => {
  ok(res, await listCategories({ admin: true }));
});

export const postCategory = asyncHandler(async (req, res) => {
  const category = await createCategory(req.validated.body);
  ok(res, category, null, 201);
});

export const putCategory = asyncHandler(async (req, res) => {
  ok(res, await updateCategory(req.validated.params.id, req.validated.body));
});

export const removeCategory = asyncHandler(async (req, res) => {
  await deleteCategory(req.params.id);
  ok(res, { deleted: true });
});

export const getProducts = asyncHandler(async (req, res) => {
  const { items, meta } = await listProducts(req.validated.query);
  ok(res, items, meta);
});

export const adminProducts = asyncHandler(async (req, res) => {
  const { items, meta } = await listProducts(req.query, { admin: true });
  ok(res, items, meta);
});

export const getProduct = asyncHandler(async (req, res) => {
  ok(res, await getProductBySlug(req.params.slug));
});

export const adminProduct = asyncHandler(async (req, res) => {
  ok(res, presentProduct(await getProductById(req.params.id)));
});

export const postProduct = asyncHandler(async (req, res) => {
  const product = await writeProduct(req.validated.body);
  ok(res, presentProduct(product), null, 201);
});

export const putProduct = asyncHandler(async (req, res) => {
  const existing = await getProductById(req.validated.params.id);
  const product = await writeProduct(req.validated.body, existing);
  ok(res, presentProduct(product));
});

export const removeProduct = asyncHandler(async (req, res) => {
  const product = await getProductById(req.params.id);
  product.isDeleted = true;
  product.isAvailable = false;
  product.availability = 'out_of_stock';
  await product.save();
  ok(res, { deleted: true });
});

export const getBanners = asyncHandler(async (req, res) => {
  const placement = ['hero', 'promo', 'announcement'].includes(req.query.placement) ? req.query.placement : undefined;
  const now = new Date();
  const filter = {
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }, { startsAt: { $exists: false } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }, { endsAt: { $exists: false } }] },
    ],
  };
  if (placement) filter.placement = placement;
  const banners = await Banner.find(filter).sort({ sortOrder: 1, createdAt: -1 });
  ok(res, banners);
});

export const postBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.create(req.validated.body);
  ok(res, banner, null, 201);
});

export const putBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndUpdate(req.validated.params.id, req.validated.body, { new: true });
  if (!banner) throw new ApiError(404, 'Banner not found.');
  ok(res, banner);
});

export const removeBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) throw new ApiError(404, 'Banner not found.');
  ok(res, { deleted: true });
});

export const adminBanners = asyncHandler(async (req, res) => {
  ok(res, await Banner.find().sort({ placement: 1, sortOrder: 1 }));
});

async function recomputeRating(productId) {
  const stats = await Review.aggregate([
    { $match: { product: productId, isVisible: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne({ _id: productId }, {
    $set: {
      ratingAvg: stats[0] ? Math.round(stats[0].avg * 10) / 10 : 0,
      ratingCount: stats[0]?.count || 0,
    },
  });
}

export const getReviews = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isDeleted: false }).select('_id');
  if (!product) throw new ApiError(404, 'Product not found.');
  const reviews = await Review.find({ product: product._id, isVisible: true })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('user', 'name');
  ok(res, reviews.map((review) => ({
    id: review._id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    author: review.user?.name || 'Customer',
  })));
});

export const postReview = asyncHandler(async (req, res) => {
  const { productId, rating, comment } = req.validated.body;
  const product = await Product.findOne({ _id: productId, isDeleted: false });
  if (!product) throw new ApiError(404, 'Product not found.');
  const purchased = await Order.findOne({
    user: req.user._id,
    status: { $ne: 'Cancelled' },
    'items.product': product._id,
  });
  if (!purchased) throw new ApiError(403, 'You can review this fish after you have ordered it.');
  const existing = await Review.findOne({ product: product._id, user: req.user._id });
  if (existing) throw new ApiError(409, 'You have already reviewed this product.');
  const review = await Review.create({
    product: product._id,
    user: req.user._id,
    order: purchased._id,
    rating,
    comment,
  });
  await recomputeRating(product._id);
  ok(res, review, null, 201);
});
