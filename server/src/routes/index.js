import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimit.js';
import { optionalAuth, requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import * as auth from '../controllers/authController.js';
import * as users from '../controllers/userController.js';
import * as catalog from '../controllers/catalogController.js';
import * as cart from '../controllers/cartController.js';
import * as orders from '../controllers/orderController.js';
import * as payments from '../controllers/paymentController.js';
import * as admin from '../controllers/adminController.js';
import * as content from '../controllers/contentController.js';
import * as invoices from '../controllers/invoiceController.js';
import * as notifications from '../controllers/notificationController.js';
import {
  addressSchema,
  addressUpdateSchema,
  bannerSchema,
  bannerUpdateSchema,
  cancelSchema,
  cartItemSchema,
  cartQtySchema,
  categorySchema,
  categoryUpdateSchema,
  checkoutSchema,
  couponSchema,
  couponUpdateSchema,
  couponWriteSchema,
  customerStatusSchema,
  idSchema,
  inquirySchema,
  listSchema,
  loginSchema,
  mergeSchema,
  passwordSchema,
  productSchema,
  productUpdateSchema,
  profileSchema,
  quoteSchema,
  registerSchema,
  reviewSchema,
  settingsSchema,
  statusSchema,
  subscribeSchema,
  trackSchema,
  zoneSchema,
  zoneUpdateSchema,
} from '../validators/schemas.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, data: { ok: true } });
});

router.post('/auth/register', authLimiter, validate(registerSchema), auth.register);
router.post('/auth/login', authLimiter, validate(loginSchema), auth.login);
router.post('/auth/refresh', auth.refresh);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', requireAuth, auth.me);

router.patch('/users/me', requireAuth, validate(profileSchema), users.updateProfile);
router.put('/users/me/password', requireAuth, validate(passwordSchema), users.updatePassword);
router.post('/users/me/addresses', requireAuth, validate(addressSchema), users.addAddress);
router.patch('/users/me/addresses/:id', requireAuth, validate(addressUpdateSchema), users.updateAddress);
router.delete('/users/me/addresses/:id', requireAuth, users.deleteAddress);

router.get('/categories', catalog.getCategories);
router.post('/categories', requireAuth, requireAdmin, validate(categorySchema), catalog.postCategory);
router.put('/categories/:id', requireAuth, requireAdmin, validate(categoryUpdateSchema), catalog.putCategory);
router.delete('/categories/:id', requireAuth, requireAdmin, catalog.removeCategory);

router.get('/products', validate(listSchema), catalog.getProducts);
router.get('/products/:slug', catalog.getProduct);
router.post('/products', requireAuth, requireAdmin, validate(productSchema), catalog.postProduct);
router.put('/products/:id', requireAuth, requireAdmin, validate(productUpdateSchema), catalog.putProduct);
router.delete('/products/:id', requireAuth, requireAdmin, catalog.removeProduct);

router.get('/cart', optionalAuth, cart.getCart);
router.post('/cart/items', optionalAuth, validate(cartItemSchema), cart.postItem);
router.patch('/cart/items/:itemId', optionalAuth, validate(cartQtySchema), cart.patchItem);
router.delete('/cart/items/:itemId', optionalAuth, cart.deleteItem);
router.delete('/cart', optionalAuth, cart.deleteCart);
router.post('/cart/coupon', optionalAuth, validate(couponSchema), cart.postCoupon);
router.delete('/cart/coupon', optionalAuth, cart.deleteCoupon);
router.post('/cart/merge', requireAuth, validate(mergeSchema), cart.postMerge);

router.post('/orders', optionalAuth, validate(checkoutSchema), orders.postOrder);
router.get('/orders', requireAuth, orders.myOrders);
router.post('/orders/track', validate(trackSchema), orders.track);
router.get('/orders/mine/:orderNumber', requireAuth, orders.myOrder);
router.get('/orders/mine/:orderNumber/invoice', requireAuth, invoices.myInvoice);
router.get('/notifications', requireAuth, notifications.myNotifications);
router.post('/notifications/read', requireAuth, notifications.readNotifications);
router.get('/orders/:orderNumber', orders.publicOrder);
router.post('/orders/:orderNumber/cancel', requireAuth, validate(cancelSchema), orders.cancel);

router.get('/payments/methods', payments.methods);
router.get('/payments/bkash/callback', payments.bkashCallback);
router.all('/payments/nagad/callback', payments.nagadCallback);
router.post('/payments/sslcommerz/success', payments.sslSuccess);
router.post('/payments/sslcommerz/fail', payments.sslFail);
router.post('/payments/sslcommerz/cancel', payments.sslCancel);
router.post('/payments/sslcommerz/ipn', payments.sslIpn);

router.get('/banners', catalog.getBanners);
router.post('/banners', requireAuth, requireAdmin, validate(bannerSchema), catalog.postBanner);
router.put('/banners/:id', requireAuth, requireAdmin, validate(bannerUpdateSchema), catalog.putBanner);
router.delete('/banners/:id', requireAuth, requireAdmin, catalog.removeBanner);

router.get('/reviews/product/:slug', catalog.getReviews);
router.post('/reviews', requireAuth, validate(reviewSchema), catalog.postReview);

router.get('/settings/public', admin.publicStore);
router.post('/newsletter/subscribe', validate(subscribeSchema), content.subscribe);
router.post('/inquiries', validate(inquirySchema), content.createInquiry);
router.get('/delivery/zones', content.deliveryZones);
router.post('/delivery/quote', validate(quoteSchema), content.deliveryQuote);

const guard = [requireAuth, requireAdmin];
router.get('/admin/overview', ...guard, admin.overview);
router.get('/admin/products', ...guard, catalog.adminProducts);
router.get('/admin/products/:id', ...guard, catalog.adminProduct);
router.get('/admin/categories', ...guard, catalog.adminCategories);
router.get('/admin/banners', ...guard, catalog.adminBanners);
router.get('/admin/notices/summary', ...guard, notifications.adminNoticeSummary);
router.get('/admin/notices', ...guard, notifications.adminNotices);
router.post('/admin/notices/seen', ...guard, notifications.seeAdminNotices);
router.get('/admin/orders', ...guard, admin.adminOrders);
router.get('/admin/orders/:id/invoice', ...guard, invoices.adminInvoice);
router.get('/admin/orders/:id', ...guard, admin.adminOrder);
router.patch('/admin/orders/:id/status', ...guard, validate(statusSchema), admin.patchOrderStatus);
router.get('/admin/customers', ...guard, admin.customers);
router.get('/admin/customers/:id', ...guard, admin.customerDetail);
router.patch('/admin/customers/:id', ...guard, validate(customerStatusSchema), admin.patchCustomer);
router.get('/admin/settings', ...guard, admin.getAdminSettings);
router.put('/admin/settings', ...guard, validate(settingsSchema), admin.putAdminSettings);
router.get('/admin/payment-providers', ...guard, payments.adminProviders);
router.get('/admin/delivery-zones', ...guard, admin.zones);
router.post('/admin/delivery-zones', ...guard, validate(zoneSchema), admin.postZone);
router.put('/admin/delivery-zones/:id', ...guard, validate(zoneUpdateSchema), admin.putZone);
router.delete('/admin/delivery-zones/:id', ...guard, admin.removeZone);
router.get('/admin/coupons', ...guard, admin.coupons);
router.post('/admin/coupons', ...guard, validate(couponWriteSchema), admin.postCoupon);
router.put('/admin/coupons/:id', ...guard, validate(couponUpdateSchema), admin.putCoupon);
router.delete('/admin/coupons/:id', ...guard, admin.removeCoupon);
router.get('/admin/subscribers', ...guard, admin.subscribers);
router.get('/admin/inquiries', ...guard, admin.inquiries);
router.post('/admin/uploads', ...guard, upload.single('image'), admin.uploadImage);
router.post('/admin/uploads/many', ...guard, upload.array('images', 8), admin.uploadImages);

router.use('/admin', ...guard, (req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

void idSchema;

export default router;
