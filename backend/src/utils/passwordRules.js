export const MIN_PASSWORD_LENGTH = 8;
export const isValidPassword = (password) => typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
