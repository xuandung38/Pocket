// helpers.js
// User-object and lightweight auth helpers backed by localStorage.

export const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return emailRegex.test(email);
};

const USER_KEY = "userData";

export const saveUser = (user) =>
  localStorage.setItem(USER_KEY, JSON.stringify(user));

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
};

export const removeUser = () => localStorage.removeItem(USER_KEY);
