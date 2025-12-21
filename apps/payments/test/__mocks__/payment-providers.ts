export const createPayUPayment = jest.fn(() =>
  Promise.resolve({ redirectUrl: 'https://payu.test/redirect' })
);

export const createPrzelewy24Payment = jest.fn(() =>
  Promise.resolve({ redirectUrl: 'https://przelewy24.test/redirect' })
);

export const verifyPayUNotification = jest.fn(() =>
  Promise.resolve({ verified: true })
);

export const verifyPrzelewy24Notification = jest.fn(() =>
  Promise.resolve({ verified: true })
);

export default {
  createPayUPayment,
  createPrzelewy24Payment,
  verifyPayUNotification,
  verifyPrzelewy24Notification,
};
