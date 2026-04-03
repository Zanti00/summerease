import { createRequire } from "module";
const require = createRequire(import.meta.url);
const otplib = require("otplib");

console.log("--- otplib Inspection ---");
console.log("Type of otplib:", typeof otplib);
console.log("Keys:", Object.keys(otplib));
if (otplib.totp) {
  console.log("totp found! Type:", typeof otplib.totp);
  console.log("totp keys:", Object.keys(otplib.totp));
}
if (otplib.TOTP) {
  console.log("TOTP found! Type:", typeof otplib.TOTP);
}
if (otplib.authenticator) {
  console.log("authenticator found! Type:", typeof otplib.authenticator);
}
console.log("--- End ---");
