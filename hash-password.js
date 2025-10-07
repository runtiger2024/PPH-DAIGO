import bcrypt from "bcrypt";

const plainPassword = "randy1007";
const saltRounds = 10;

bcrypt.hash(plainPassword, saltRounds, function (err, hash) {
  if (err) {
    console.error("加密時發生錯誤:", err);
    return;
  }
  console.log("您的明碼是:", plainPassword);
  console.log("加密後的雜湊值是:");
  console.log(hash);
  console.log("\n請將這個雜湊值複製到您的 db.json 檔案中！");
});
