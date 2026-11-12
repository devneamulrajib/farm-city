import { Server } from 'socket.io';
import { Order } from '../models/Order.js';
import { isAllowedOrigin } from '../config/env.js';
import { verifyAccess } from '../services/tokenService.js';
import { normalizeBdPhone } from '../utils/phone.js';
import { setOrderIo } from '../services/orderService.js';

export function attachSocket(server) {
  const io = new Server(server, {
    cors: { origin: (origin, callback) => callback(null, isAllowedOrigin(origin)), credentials: true },
  });
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      socket.user = verifyAccess(token);
    } catch {
      socket.user = null;
    }
    next();
  });
  io.on('connection', (socket) => {
    if (socket.user?.sub) socket.join(`user:${socket.user.sub}`);
    socket.on('order:watch', async ({ orderId, orderNumber, phone } = {}) => {
      try {
        let order = null;
        if (orderId) order = await Order.findById(orderId).select('user customer.phone');
        else if (orderNumber) order = await Order.findOne({ orderNumber }).select('user customer.phone');
        if (!order) return;
        const owns = socket.user?.sub && order.user && String(order.user) === socket.user.sub;
        const phoneOk = phone && normalizeBdPhone(phone) === order.customer.phone;
        if (owns || phoneOk) socket.join(`order:${order._id}`);
      } catch {
        /* ignore malformed watch requests */
      }
    });
  });
  setOrderIo(io);
  return io;
}
