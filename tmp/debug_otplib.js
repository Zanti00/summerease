import { createRequire } from "module";
const require = createRequire(import.meta.url);
const otplib = require("otplib");

console.log("Keys available in otplib require:", Object.keys(otplib));
console.log("Is totp defined?", !!otplib.totp);
console.log("Is authenticator defined?", !!otplib.authenticator);
