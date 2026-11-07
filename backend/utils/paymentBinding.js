function validPaymentBinding(order, payment, request) {
  if (!order || !payment || !request || order.id !== request.orderId || payment.order_id !== order.id || !Number.isSafeInteger(order.amount) || order.amount <= 0 || payment.amount !== order.amount || payment.currency !== order.currency || payment.status !== 'captured') return false;
  const notes = order.notes || {};
  const key = request.type === 'course' ? 'courseId' : 'productId';
  return ['course', 'product', 'school_product'].includes(request.type) &&
    notes.type === request.type && String(notes[key]) === String(request.itemId) &&
    String(notes.userId) === String(request.userId) &&
    (request.type === 'course' || String(notes.quantity) === String(request.quantity)) &&
    (request.type !== 'school_product' || String(notes.schoolId) === String(request.schoolId));
}

module.exports = { validPaymentBinding };
